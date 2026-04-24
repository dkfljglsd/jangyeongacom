import { useRef, useEffect, useState, Suspense } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei'
import * as THREE from 'three'
import useCADStore from '../../store/cadStore'
import { useReplicadWorker } from '../../hooks/useReplicadWorker'
import CadObject from './CadObject'
import GltfModel from './GltfModel'

function CameraFitter({ solidBuffers }) {
  const { camera, controls } = useThree()
  const fitCameraRequest = useCADStore((s) => s.fitCameraRequest)
  const lastFitRef = useRef(0)

  useEffect(() => {
    if (fitCameraRequest <= lastFitRef.current) return
    const bufList = Object.values(solidBuffers)
    if (bufList.length === 0) return

    const box = new THREE.Box3()
    let hasVerts = false
    // objects의 transform(position, scale) 반영해서 실제 Three.js 좌표로 변환
    const objectsList = useCADStore.getState().objects
    const transformMap = {}
    for (const o of objectsList) transformMap[o.id] = o.transform

    for (const [id, buf] of Object.entries(solidBuffers)) {
      const verts = buf?.vertices
      if (!verts) continue
      const t = transformMap[id]
      const s = t?.scale?.[0] ?? 1   // uniform scale (cm→units)
      const py = t?.position?.[1] ?? 0
      for (let i = 0; i < verts.length; i += 3) {
        box.expandByPoint(new THREE.Vector3(
          verts[i] * s,
          verts[i + 1] * s + py,
          verts[i + 2] * s
        ))
        hasVerts = true
      }
    }
    if (!hasVerts) return

    lastFitRef.current = fitCameraRequest

    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    box.getCenter(center)
    box.getSize(size)

    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = camera.fov * (Math.PI / 180)
    const dist = Math.max((maxDim / 2) / Math.tan(fov / 2) * 2.0, maxDim * 0.8)

    camera.position.set(
      center.x + dist * 0.55,
      center.y + dist * 0.45,
      center.z + dist * 0.75
    )
    camera.lookAt(center)
    camera.updateProjectionMatrix()

    if (controls) {
      controls.target.copy(center)
      controls.update()
    }
  }, [fitCameraRequest, solidBuffers, camera, controls])

  return null
}

export default function Scene({ onSceneReady }) {
  const objects = useCADStore((s) => s.objects)
  const gltfModels = useCADStore((s) => s.gltfModels)
  const gridVisible = useCADStore((s) => s.gridVisible)
  const showAxes = useCADStore((s) => s.showAxes)
  const selectObject = useCADStore((s) => s.selectObject)
  const setReplicadReady = useCADStore((s) => s.setReplicadReady)
  const { scene } = useThree()

  // replicad Worker hook
  const { isReady: replicadReady, buildShape } = useReplicadWorker()

  // solid 모드 bufferData 캐시: objectId → bufferData
  const [solidBuffers, setSolidBuffers] = useState({})

  // Worker ready 상태를 store에 동기화
  useEffect(() => {
    setReplicadReady(replicadReady)
  }, [replicadReady, setReplicadReady])

  // Scene ref 콜백
  useEffect(() => {
    if (onSceneReady) onSceneReady(scene)
  }, [scene, onSceneReady])

  // objects가 변경될 때 solid 객체의 버퍼 데이터를 확보
  useEffect(() => {
    if (!replicadReady) return

    // _prebuiltBuffer 또는 operation tree가 있는 객체만 처리
    const solidObjects = objects.filter(
      (obj) => obj._prebuiltBuffer != null || obj.operation != null
    )
    if (solidObjects.length === 0) return

    solidObjects.forEach(async (obj) => {
      // AI가 이미 meshing한 prebuilt buffer가 있으면 바로 사용 (Worker 재요청 없음)
      if (obj._prebuiltBuffer) {
        setSolidBuffers((prev) => {
          // 이미 동일한 버퍼가 등록돼 있으면 스킵
          if (prev[obj.id] === obj._prebuiltBuffer) return prev
          return { ...prev, [obj.id]: obj._prebuiltBuffer }
        })
        return
      }

      // operation tree 방식 (기존 로직)
      const cacheKey = JSON.stringify(obj.operation)
      if (solidBuffers[obj.id]?.__cacheKey === cacheKey) return

      try {
        const result = await buildShape(obj.id, obj.operation, obj.transform)
        setSolidBuffers((prev) => ({
          ...prev,
          [obj.id]: { ...result.bufferData, __cacheKey: cacheKey },
        }))
      } catch (err) {
        console.error('[Scene] buildShape failed for', obj.id, err)
      }
    })
  }, [objects, replicadReady, buildShape])

  // 삭제된 객체의 버퍼 정리
  useEffect(() => {
    const existingIds = new Set(objects.map((o) => o.id))
    setSolidBuffers((prev) => {
      const next = { ...prev }
      let changed = false
      for (const id of Object.keys(next)) {
        if (!existingIds.has(id)) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [objects])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.4} />
      <pointLight position={[0, 8, 0]} intensity={0.3} color="#4a90d9" />

      {/* Ground plane (invisible, for shadows) */}
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
        onClick={() => selectObject(null)}
      >
        <planeGeometry args={[100, 100]} />
        <shadowMaterial opacity={0.15} />
      </mesh>

      {/* Grid */}
      {gridVisible && (
        <Grid
          renderOrder={-1}
          position={[0, 0, 0]}
          infiniteGrid
          cellSize={0.1}
          cellThickness={0.5}
          cellColor="#3f3f46"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#52525b"
          fadeDistance={20}
          fadeStrength={1}
        />
      )}

      {/* Axes helper */}
      {showAxes && <axesHelper args={[3]} />}

      {/* CAD Objects */}
      {objects.map((obj) => (
        <CadObject
          key={obj.id}
          object={obj}
          bufferData={solidBuffers[obj.id] ?? null}
        />
      ))}

      {/* GLTF Models */}
      {gltfModels.map((model) => (
        <Suspense key={model.id} fallback={null}>
          <GltfModel model={model} />
        </Suspense>
      ))}

      {/* Camera auto-fit */}
      <CameraFitter solidBuffers={solidBuffers} />

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={0.5}
        maxDistance={100}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
      />

      {/* View cube */}
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport
          axisColors={['#ef4444', '#22c55e', '#3b82f6']}
          labelColor="white"
        />
      </GizmoHelper>
    </>
  )
}
