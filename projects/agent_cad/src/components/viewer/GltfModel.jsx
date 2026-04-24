import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { useMemo, Component } from 'react'
import useCADStore from '../../store/cadStore'

function GltfMesh({ model }) {
  const gltf = useLoader(GLTFLoader, model.url, (loader) => {
    const draco = new DRACOLoader()
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
    loader.setDRACOLoader(draco)
  })

  const selectGltf = useCADStore((s) => s.selectGltf)

  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf])

  const { position, rotation, scale } = model.transform || {}

  return (
    <primitive
      object={clonedScene}
      position={position || [0, 0, 0]}
      rotation={rotation || [0, 0, 0]}
      scale={scale || [1, 1, 1]}
      onClick={(e) => {
        e.stopPropagation()
        selectGltf(model.id)
      }}
    />
  )
}

// Error boundary to prevent Canvas crash on load failure
class GltfErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

export default function GltfModel({ model }) {
  return (
    <GltfErrorBoundary>
      <GltfMesh model={model} />
    </GltfErrorBoundary>
  )
}
