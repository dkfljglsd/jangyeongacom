import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import useCADStore from '../../store/cadStore'

/**
 * legacy Three.js 기본 도형 빌더 (primitive mode)
 */
function buildGeometry(type, geo) {
  switch (type) {
    case 'box':
      return new THREE.BoxGeometry(geo.width ?? 1, geo.height ?? 1, geo.depth ?? 1)
    case 'rounded_box':
      return new RoundedBoxGeometry(
        geo.width ?? 1,
        geo.height ?? 1,
        geo.depth ?? 1,
        geo.segments ?? 4,
        geo.radius ?? 0.05
      )
    case 'sphere':
      return new THREE.SphereGeometry(geo.radius ?? 0.5, 48, 48)
    case 'cylinder':
      return new THREE.CylinderGeometry(geo.radiusTop ?? 0.3, geo.radiusBottom ?? 0.3, geo.height ?? 1, 48)
    case 'cone':
      return new THREE.CylinderGeometry(0, geo.radius ?? 0.5, geo.height ?? 1, 48)
    case 'torus':
      return new THREE.TorusGeometry(geo.radius ?? 0.5, geo.tube ?? 0.15, 24, 100)
    case 'torus_knot':
      return new THREE.TorusKnotGeometry(geo.radius ?? 0.5, geo.tube ?? 0.15, 128, 16, geo.p ?? 2, geo.q ?? 3)
    case 'plane':
      return new THREE.PlaneGeometry(geo.width ?? 2, geo.height ?? 2)
    case 'capsule':
      return new THREE.CapsuleGeometry(geo.radius ?? 0.3, geo.length ?? 1, 16, 32)
    case 'ring':
      return new THREE.RingGeometry(geo.innerRadius ?? 0.3, geo.outerRadius ?? 0.5, 64)
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(geo.radius ?? 0.5)
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(geo.radius ?? 0.5, geo.detail ?? 0)
    case 'octahedron':
      return new THREE.OctahedronGeometry(geo.radius ?? 0.5)
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(geo.radius ?? 0.5)
    case 'lathe': {
      const pts = (geo.points || []).map(([r, y]) => new THREE.Vector2(r, y))
      return new THREE.LatheGeometry(pts, geo.segments ?? 32)
    }
    case 'airfoil': {
      const chord = geo.chord ?? 1
      const span = geo.span ?? 3
      const thickness = geo.thickness ?? 0.12

      const pts = []
      const n = 20
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const x = chord * (1 - t)
        const yt = thickness * chord * (0.2969 * Math.sqrt(t) - 0.1260 * t - 0.3516 * t * t + 0.2843 * t * t * t - 0.1015 * t * t * t * t)
        pts.push(new THREE.Vector2(x, yt))
      }
      for (let i = n; i >= 0; i--) {
        const t = i / n
        const x = chord * (1 - t)
        const yt = thickness * chord * (0.2969 * Math.sqrt(t) - 0.1260 * t - 0.3516 * t * t + 0.2843 * t * t * t - 0.1015 * t * t * t * t)
        pts.push(new THREE.Vector2(x, -yt))
      }

      const shape = new THREE.Shape(pts)
      return new THREE.ExtrudeGeometry(shape, {
        depth: span,
        bevelEnabled: false,
        steps: 1,
      })
    }
    default:
      return new THREE.BoxGeometry(1, 1, 1)
  }
}

/**
 * replicad bufferData로부터 Three.js BufferGeometry 조립
 * @param {{ faces: { triangles, vertices, normals }, edges: { lines } }} bufferData
 * @returns {{ facesGeo: THREE.BufferGeometry, edgesGeo: THREE.BufferGeometry }}
 */
function buildGeometryFromBuffer(bufferData) {
  const { faces, edges } = bufferData

  // Faces geometry (solid mesh)
  const facesGeo = new THREE.BufferGeometry()
  facesGeo.setIndex(faces.triangles)
  facesGeo.setAttribute('position', new THREE.Float32BufferAttribute(faces.vertices, 3))
  if (faces.normals && faces.normals.length > 0) {
    facesGeo.setAttribute('normal', new THREE.Float32BufferAttribute(faces.normals, 3))
  } else {
    facesGeo.computeVertexNormals()
  }
  facesGeo.computeBoundingBox()

  // Edges geometry (wireframe lines)
  const edgesGeo = new THREE.BufferGeometry()
  if (edges && edges.lines && edges.lines.length > 0) {
    edgesGeo.setAttribute('position', new THREE.Float32BufferAttribute(edges.lines, 3))
  } else {
    // edges가 없으면 faces로부터 edge 추출
    const derived = new THREE.EdgesGeometry(facesGeo, 15)
    edgesGeo.copy(derived)
    derived.dispose()
  }

  return { facesGeo, edgesGeo }
}

export default function CadObject({ object, bufferData }) {
  const selectObject = useCADStore((s) => s.selectObject)
  const selectedId = useCADStore((s) => s.selectedId)
  const viewMode = useCADStore((s) => s.viewMode)

  const isSelected = selectedId === object.id

  // ── solid mode: replicad bufferData 사용 ──────────────────────────────────
  const solidGeometries = useMemo(() => {
    if (!bufferData) return null
    try {
      return buildGeometryFromBuffer(bufferData)
    } catch (err) {
      console.warn('[CadObject] Failed to build buffer geometry:', err)
      return null
    }
  }, [bufferData])

  // ── legacy primitive mode ──────────────────────────────────────────────────
  const legacyGeometry = useMemo(() => {
    if (solidGeometries) return null // solid mode가 있으면 사용 안 함
    return buildGeometry(object.type, object.geometry)
  }, [solidGeometries, object.type, JSON.stringify(object.geometry)])

  const legacyEdgesGeometry = useMemo(() => {
    if (!legacyGeometry) return null
    return new THREE.EdgesGeometry(legacyGeometry, 20)
  }, [legacyGeometry])

  // Geometry dispose on unmount / change
  useEffect(() => {
    return () => {
      solidGeometries?.facesGeo?.dispose()
      solidGeometries?.edgesGeo?.dispose()
    }
  }, [solidGeometries])

  useEffect(() => {
    return () => {
      legacyGeometry?.dispose()
      legacyEdgesGeometry?.dispose()
    }
  }, [legacyGeometry, legacyEdgesGeometry])

  const { position, rotation, scale } = object.transform
  const mat = object.material

  if (object.visible === false) return null

  // 실제로 사용할 geometry 결정
  const geometry = solidGeometries?.facesGeo ?? legacyGeometry
  const edgesGeometry = solidGeometries?.edgesGeo ?? legacyEdgesGeometry

  if (!geometry) return null

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation()
        selectObject(object.id)
      }}
    >
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={mat.color}
          metalness={mat.metalness ?? 0.1}
          roughness={mat.roughness ?? 0.6}
          transparent={(mat.opacity ?? 1) < 1}
          opacity={mat.opacity ?? 1}
          side={mat.opacity < 1 ? THREE.DoubleSide : THREE.FrontSide}
          wireframe={viewMode === 'wireframe' || mat.wireframe}
        />
      </mesh>

      {/* Selection outline */}
      {isSelected && edgesGeometry && (
        <lineSegments geometry={edgesGeometry}>
          <lineBasicMaterial color="#60a5fa" linewidth={2} />
        </lineSegments>
      )}

      {/* Subtle edge lines */}
      {viewMode === 'solid' && !isSelected && edgesGeometry && (
        <lineSegments geometry={edgesGeometry}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.06} />
        </lineSegments>
      )}
    </group>
  )
}
