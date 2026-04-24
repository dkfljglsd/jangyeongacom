/**
 * replicadWorker.js
 * Web Worker: replicad + OpenCascade WASM 초기화 및 솔리드 모델링 처리
 */

import { setOC } from 'replicad'

let ocInitialized = false
let initPromise = null

/**
 * OpenCascade WASM 초기화
 */
async function initOC() {
  if (ocInitialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    const opencascade = (await import('replicad-opencascadejs')).default
    const oc = await opencascade({
      locateFile: (file) => {
        // Worker 환경에서 WASM 파일 위치 지정
        return new URL(
          `../../node_modules/replicad-opencascadejs/src/${file}`,
          import.meta.url
        ).href
      },
    })
    setOC(oc)
    ocInitialized = true
  })()

  return initPromise
}

/**
 * operation tree JSON으로부터 replicad Shape를 빌드하는 함수
 * @param {Object} operation - 연산 트리 노드
 * @returns {import('replicad').Shape} replicad Shape
 */
async function buildShape(operation) {
  const replicad = await import('replicad')
  const {
    makeBox, makeCylinder, makeSphere, makeCone, makeTorus,
    Sketcher, makeBaseBox,
  } = replicad

  if (!operation || !operation.type) {
    throw new Error('operation.type is required')
  }

  const { type, params = {}, children = [], operations = [] } = operation

  // --- 기본 도형 생성 ---
  let shape

  switch (type) {
    case 'box': {
      const { width = 1, height = 1, depth = 1 } = params
      shape = makeBox(width, height, depth)
      break
    }
    case 'sphere': {
      const { radius = 0.5 } = params
      shape = makeSphere(radius)
      break
    }
    case 'cylinder': {
      const { radius = 0.3, height = 1 } = params
      shape = makeCylinder(radius, height)
      break
    }
    case 'cone': {
      const { radius = 0.5, height = 1 } = params
      shape = makeCone(radius, 0, height)
      break
    }
    case 'torus': {
      const { radius = 0.5, tubeRadius = 0.15 } = params
      shape = makeTorus(radius, tubeRadius)
      break
    }
    case 'sketch_extrude': {
      // 스케치 기반 돌출
      const { sketch, depth = 1, plane = 'XY' } = params
      if (!sketch || !sketch.type) {
        throw new Error('sketch_extrude requires sketch definition')
      }
      if (sketch.type === 'rectangle') {
        const { width = 1, height = 1 } = sketch
        shape = new Sketcher(plane)
          .hLine(width)
          .vLine(height)
          .hLine(-width)
          .close()
          .extrude(depth)
      } else if (sketch.type === 'circle') {
        const { radius = 0.5 } = sketch
        shape = new Sketcher(plane)
          .circle(0, 0, radius)
          .extrude(depth)
      } else {
        throw new Error(`Unknown sketch type: ${sketch.type}`)
      }
      break
    }
    case 'fuse':
    case 'union': {
      // 불리언 합집합: children 배열에서 shape들을 빌드 후 fuse
      if (!children || children.length < 2) {
        throw new Error('fuse requires at least 2 children')
      }
      const shapes = await Promise.all(children.map(buildShape))
      shape = shapes[0]
      for (let i = 1; i < shapes.length; i++) {
        shape = shape.fuse(shapes[i])
      }
      break
    }
    case 'cut':
    case 'difference': {
      // 불리언 차집합
      if (!children || children.length < 2) {
        throw new Error('cut requires at least 2 children')
      }
      const shapes = await Promise.all(children.map(buildShape))
      shape = shapes[0]
      for (let i = 1; i < shapes.length; i++) {
        shape = shape.cut(shapes[i])
      }
      break
    }
    case 'intersect':
    case 'intersection': {
      // 불리언 교집합
      if (!children || children.length < 2) {
        throw new Error('intersect requires at least 2 children')
      }
      const shapes = await Promise.all(children.map(buildShape))
      shape = shapes[0]
      for (let i = 1; i < shapes.length; i++) {
        shape = shape.intersect(shapes[i])
      }
      break
    }
    default:
      throw new Error(`Unknown operation type: ${type}`)
  }

  // --- 후처리 연산 (fillet, chamfer, translate, rotate 등) ---
  for (const op of operations) {
    if (!op || !op.type) continue

    switch (op.type) {
      case 'fillet': {
        const { radius = 0.05, edgeSelector } = op
        try {
          if (edgeSelector) {
            shape = shape.fillet(radius, (e) => e.inPlane(edgeSelector))
          } else {
            shape = shape.fillet(radius)
          }
        } catch (err) {
          console.warn('[replicadWorker] fillet failed, skipping:', err.message)
        }
        break
      }
      case 'chamfer': {
        const { distance = 0.05, edgeSelector } = op
        try {
          if (edgeSelector) {
            shape = shape.chamfer(distance, (e) => e.inPlane(edgeSelector))
          } else {
            shape = shape.chamfer(distance)
          }
        } catch (err) {
          console.warn('[replicadWorker] chamfer failed, skipping:', err.message)
        }
        break
      }
      case 'translate': {
        const { x = 0, y = 0, z = 0 } = op
        shape = shape.translate([x, y, z])
        break
      }
      case 'rotate': {
        const { angle = 0, axis = [0, 1, 0], center = [0, 0, 0] } = op
        shape = shape.rotate(angle, center, axis)
        break
      }
      case 'mirror': {
        const { plane = 'XY', keepOriginal = false } = op
        shape = shape.mirror(plane, undefined, keepOriginal ? 'fuse' : undefined)
        break
      }
      case 'scale': {
        const { factor = 1, center = [0, 0, 0] } = op
        shape = shape.scale(factor, center)
        break
      }
      default:
        console.warn('[replicadWorker] Unknown post-op:', op.type)
    }
  }

  return shape
}

/**
 * Shape를 Three.js용 버퍼 데이터로 변환
 * @param {import('replicad').Shape} shape
 * @returns {{ faces: Object, edges: Object }}
 */
function shapeToBufferData(shape) {
  // 형상의 bounding box를 구해 최소 치수에 맞는 tolerance 계산
  // 너무 고정된 tolerance(0.05)는 얇은 형상(두께 0.1cm 등)을 망가뜨림
  let tol = 0.05
  let angTol = 0.1
  try {
    const bb = shape.boundingBox
    if (bb) {
      const minDim = Math.min(
        Math.abs(bb.xMax - bb.xMin),
        Math.abs(bb.yMax - bb.yMin),
        Math.abs(bb.zMax - bb.zMin)
      )
      if (minDim > 0) {
        tol = Math.min(0.05, minDim * 0.1)   // 최소 치수의 10%, 최대 0.05
        angTol = Math.min(0.1, minDim * 0.2)
      }
    }
  } catch (_) { /* boundingBox 실패 시 기본값 사용 */ }

  const meshData = shape.mesh({ tolerance: tol, angularTolerance: angTol })
  const edgeData = shape.meshEdges({ tolerance: tol, angularTolerance: angTol })

  return {
    faces: {
      triangles: meshData.triangles,
      vertices: meshData.vertices,
      normals: meshData.normals,
      faceGroups: meshData.faceGroups,
    },
    edges: edgeData,
  }
}

/**
 * AI 생성 코드로부터 replicad Shape 배열을 빌드 (메시 변환 없이 원본 B-Rep 유지)
 */
async function buildShapesFromCode(code) {
  const {
    makeBaseBox,
    makeCylinder,
    makeSphere,
    drawCircle,
    Sketcher,
  } = await import('replicad')

  const makeCone = (bottomRadius, topRadius, height) => {
    const r2 = topRadius ?? 0
    return new Sketcher('YZ')
      .movePointerTo([0, 0])
      .lineTo([bottomRadius, 0])
      .lineTo([r2, height])
      .lineTo([0, height])
      .close()
      .revolve()
  }

  const makeTorus = (bigRadius, tubeRadius) =>
    drawCircle(tubeRadius).translate([bigRadius, 0]).sketchOnPlane('XZ').revolve()

  const makeFallback = () => makeBaseBox(1, 1, 1).translate([0.5, 0.5, 0])

  const safeWrap = (shape) => {
    if (!shape) return safeWrap(makeFallback())
    let _fillet, _chamfer, _cut, _fuse, _intersect, _translate, _rotate, _scale
    try {
      _fillet    = shape.fillet?.bind(shape)
      _chamfer   = shape.chamfer?.bind(shape)
      _cut       = shape.cut?.bind(shape)
      _fuse      = shape.fuse?.bind(shape)
      _intersect = shape.intersect?.bind(shape)
      _translate = shape.translate?.bind(shape)
      _rotate    = shape.rotate?.bind(shape)
      _scale     = shape.scale?.bind(shape)
    } catch {
      return safeWrap(makeFallback())
    }
    if (_fuse)      shape.fuse      = (o) => { try { return safeWrap(_fuse(o)) } catch { try { return safeWrap(o) } catch { return safeWrap(makeFallback()) } } }
    if (_cut)       shape.cut       = (o) => { try { return safeWrap(_cut(o)) }       catch { return safeWrap(makeFallback()) } }
    if (_intersect) shape.intersect = (o) => { try { return safeWrap(_intersect(o)) } catch { return safeWrap(makeFallback()) } }
    if (_fillet)    shape.fillet    = (r, s) => { try { return safeWrap(_fillet(r, s)) }  catch { return shape } }
    if (_chamfer)   shape.chamfer   = (r, s) => { try { return safeWrap(_chamfer(r, s)) } catch { return shape } }
    if (_translate) shape.translate = (v)    => { try { return safeWrap(_translate(v)) }  catch { return shape } }
    if (_rotate)    shape.rotate    = (...a) => { try { return safeWrap(_rotate(...a)) }   catch { return shape } }
    if (_scale)     shape.scale     = (f)    => { try { return safeWrap(_scale(f)) }       catch { return shape } }
    return shape
  }

  const rawMakeBox   = (w, h, d) => makeBaseBox(w, h, d).translate([w / 2, h / 2, 0])
  const safeBox      = (...a) => safeWrap(rawMakeBox(...a))
  const safeCylinder = (r, h, loc = [0, 0, 0]) => safeWrap(makeCylinder(r, h, loc, [0, 1, 0]))
  const safeSphere   = (r, ...rest) => safeWrap(makeSphere(r, ...rest))
  const safeCone     = (br, tr, h, ...rest) => { try { return safeWrap(makeCone(br, tr ?? 0, h, ...rest)) } catch { return safeWrap(makeCylinder(br, h)) } }
  const safeTorus    = (...a) => { try { return safeWrap(makeTorus(...a)) } catch { return safeWrap(makeCylinder(a[0] || 1, a[1] * 2 || 1)) } }

  const fn = new Function('makeBox', 'makeCylinder', 'makeSphere', 'makeCone', 'makeTorus', code)
  return fn(safeBox, safeCylinder, safeSphere, safeCone, safeTorus)
}

/**
 * 여러 Shape를 STEP 블롭으로 내보내기
 * @param {Array} shapeDataList - [{ operation, transform }]
 * @returns {Uint8Array} STEP 파일 바이너리
 */
async function exportToStep(shapeDataList) {
  const { makeCompound } = await import('replicad')

  const shapes = []
  for (const { operation } of shapeDataList) {
    try {
      const shape = await buildShape(operation)
      shapes.push(shape)
    } catch (err) {
      console.warn('[replicadWorker] exportToStep: skip failed shape', err.message)
    }
  }

  if (shapes.length === 0) throw new Error('No valid shapes to export')

  let targetShape
  if (shapes.length === 1) {
    targetShape = shapes[0]
  } else {
    targetShape = makeCompound(shapes)
  }

  const blob = targetShape.blobSTEP()
  const arrayBuffer = await blob.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

// ─── Worker 메시지 핸들러 ─────────────────────────────────────────────────────

self.onmessage = async (event) => {
  const { id, type, payload } = event.data

  try {
    // OC 초기화 (첫 요청 시 또는 init 요청)
    if (!ocInitialized) {
      self.postMessage({ id, type: 'status', status: 'initializing' })
      await initOC()
      self.postMessage({ id: null, type: 'ready' })
    }

    switch (type) {
      case 'init': {
        // 이미 초기화됨
        self.postMessage({ id, type: 'ready' })
        break
      }

      case 'buildShape': {
        const { objectId, operation, transform } = payload
        const shape = await buildShape(operation)
        const bufferData = shapeToBufferData(shape)

        self.postMessage({
          id,
          type: 'shapeResult',
          objectId,
          bufferData,
        }, [
          // Transferable: Float32Array, Int32Array들을 transfer
        ])
        break
      }

      case 'executeCode': {
        const { code } = payload
        console.log('[Worker] Executing code:\n', code)

        let results
        try {
          results = await buildShapesFromCode(code)
        } catch (codeErr) {
          console.error('[Worker] Code execution error:', codeErr)
          const msg = codeErr?.message || codeErr?.toString?.() || '알 수 없는 오류'
          const isOccError = /^\d+$/.test(msg)
          throw new Error(isOccError
            ? '형상 생성 실패: 너무 복잡하거나 잘못된 치수예요. 다시 시도해주세요.'
            : `Code execution error: ${msg}`)
        }

        if (!Array.isArray(results)) {
          throw new Error('Code must return an array of { name, shape, color, ... }')
        }

        const meshResults = results.flatMap((item, index) => {
          if (!item || !item.shape) {
            console.warn(`[Worker] Result[${index}] missing shape, skipping`)
            return []
          }
          let bufferData
          try {
            bufferData = shapeToBufferData(item.shape)
          } catch (meshErr) {
            console.warn(`[Worker] Meshing skipped for "${item.name || index}":`, meshErr?.message || meshErr)
            return []
          }
          return [{
            name: item.name || `Shape ${index + 1}`,
            color: item.color || '#4a90d9',
            metalness: item.metalness ?? 0.1,
            roughness: item.roughness ?? 0.6,
            opacity: item.opacity ?? 1.0,
            bufferData,
          }]
        })

        if (meshResults.length === 0) {
          throw new Error('모든 형상의 메시 변환에 실패했습니다. 더 단순한 모델을 시도해주세요.')
        }

        self.postMessage({ id, type: 'codeResult', results: meshResults })
        break
      }

      case 'exportStepFromCode': {
        const { code } = payload
        const { exportSTEP } = await import('replicad')

        let results
        try {
          results = await buildShapesFromCode(code)
        } catch (err) {
          throw new Error(`STEP 내보내기 실패: ${err.message}`)
        }

        if (!Array.isArray(results)) throw new Error('코드가 올바른 형식이 아닙니다.')

        const shapeItems = results
          .filter((item) => item?.shape)
          .map((item) => ({
            shape: item.shape,
            name: item.name || 'Shape',
            color: item.color || '#cccccc',
            alpha: item.opacity ?? 1,
          }))

        if (shapeItems.length === 0) throw new Error('내보낼 형상이 없습니다.')

        const blob = exportSTEP(shapeItems)
        const arrayBuffer = await blob.arrayBuffer()
        const stepBytes = new Uint8Array(arrayBuffer)

        self.postMessage({ id, type: 'stepFromCodeResult', data: stepBytes }, [stepBytes.buffer])
        break
      }

      case 'exportStep': {
        const { objects } = payload
        const stepBytes = await exportToStep(objects)
        self.postMessage({
          id,
          type: 'stepResult',
          data: stepBytes,
        }, [stepBytes.buffer])
        break
      }

      default:
        self.postMessage({
          id,
          type: 'error',
          error: `Unknown message type: ${type}`,
        })
    }
  } catch (err) {
    self.postMessage({
      id,
      type: 'error',
      error: err.message || String(err),
    })
  }
}
