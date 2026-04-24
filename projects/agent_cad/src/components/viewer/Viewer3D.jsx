import { Suspense, useCallback, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Loader } from '@react-three/drei'
import Scene from './Scene'

export default function Viewer3D({ onSceneReady, className = '' }) {
  const [canvasKey, setCanvasKey] = useState(0)

  const handleCreated = useCallback(({ gl }) => {
    gl.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault()
      console.warn('[Viewer3D] WebGL context lost — remounting canvas')
      setTimeout(() => setCanvasKey((k) => k + 1), 500)
    })
  }, [])

  return (
    <div className={`relative ${className}`}>
      <Canvas
        key={canvasKey}
        shadows
        camera={{ position: [2, 1.5, 3], fov: 45, near: 0.001, far: 1000 }}
        gl={{
          antialias: true,
          toneMapping: 2, // ACESFilmic
          toneMappingExposure: 1.0,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
        onCreated={handleCreated}
      >
        <Suspense fallback={null}>
          <Scene onSceneReady={onSceneReady} />
        </Suspense>
      </Canvas>
      <Loader />

      {/* Gradient background */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, #0f172a 0%, #09090b 100%)',
        }}
      />
    </div>
  )
}
