import { useState, useRef } from 'react'
import { X, Upload, Link, Package } from 'lucide-react'
import useCADStore from '../../store/cadStore'

const PRESET_MODELS = [
  {
    id: 'robot',
    name: 'Robot',
    category: 'Characters',
    emoji: '🤖',
    url: 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
    defaultScale: [1, 1, 1],
  },
  {
    id: 'horse',
    name: 'Horse',
    category: 'Animals',
    emoji: '🐴',
    url: 'https://threejs.org/examples/models/gltf/Horse.glb',
    defaultScale: [0.01, 0.01, 0.01],
  },
  {
    id: 'flamingo',
    name: 'Flamingo',
    category: 'Animals',
    emoji: '🦩',
    url: 'https://threejs.org/examples/models/gltf/Flamingo.glb',
    defaultScale: [0.01, 0.01, 0.01],
  },
  {
    id: 'parrot',
    name: 'Parrot',
    category: 'Animals',
    emoji: '🦜',
    url: 'https://threejs.org/examples/models/gltf/Parrot.glb',
    defaultScale: [0.01, 0.01, 0.01],
  },
  {
    id: 'duck',
    name: 'Duck',
    category: 'Animals',
    emoji: '🦆',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Duck/glTF/Duck.gltf',
    defaultScale: [0.5, 0.5, 0.5],
  },
  {
    id: 'helmet',
    name: 'Damaged Helmet',
    category: 'Objects',
    emoji: '⛑️',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF/DamagedHelmet.gltf',
    defaultScale: [1, 1, 1],
  },
]

const CATEGORIES = ['All', ...Array.from(new Set(PRESET_MODELS.map((m) => m.category)))]

export default function ModelLibrary() {
  const toggleModelLibrary = useCADStore((s) => s.toggleModelLibrary)
  const addGltfModel = useCADStore((s) => s.addGltfModel)
  const clearScene = useCADStore((s) => s.clearScene)

  function addModelAndClear(model) {
    clearScene()
    addGltfModel(model)
  }

  const [activeCategory, setActiveCategory] = useState('All')
  const [urlInput, setUrlInput] = useState('')
  const fileInputRef = useRef(null)

  const filteredModels =
    activeCategory === 'All'
      ? PRESET_MODELS
      : PRESET_MODELS.filter((m) => m.category === activeCategory)

  function handleAddPreset(preset) {
    const model = {
      id: `${preset.id}_${Date.now()}`,
      name: preset.name,
      url: preset.url,
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: preset.defaultScale,
      },
    }
    addModelAndClear(model)
    toggleModelLibrary()
  }

  function handleAddUrl() {
    const url = urlInput.trim()
    if (!url) return
    const model = {
      id: `custom_url_${Date.now()}`,
      name: url.split('/').pop() || 'Custom Model',
      url,
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    }
    addGltfModel(model)
    setUrlInput('')
    toggleModelLibrary()
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const blobUrl = URL.createObjectURL(file)
    const model = {
      id: `upload_${Date.now()}`,
      name: file.name,
      url: blobUrl,
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    }
    addModelAndClear(model)
    toggleModelLibrary()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={toggleModelLibrary}
      />

      {/* Panel */}
      <div className="relative z-10 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-[560px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Model Library</span>
          </div>
          <button
            onClick={toggleModelLibrary}
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-5 py-3 border-b border-zinc-800 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Model grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-3">
            {filteredModels.map((model) => (
              <button
                key={model.id}
                onClick={() => handleAddPreset(model)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-blue-500/50 transition-all group"
              >
                <span className="text-3xl">{model.emoji}</span>
                <span className="text-xs font-medium text-zinc-300 group-hover:text-white text-center leading-tight">
                  {model.name}
                </span>
                <span className="text-[10px] text-zinc-500">{model.category}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer: URL input + file upload */}
        <div className="border-t border-zinc-800 px-5 py-4 flex flex-col gap-3">
          {/* URL input */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
              <Link className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                placeholder="Paste GLTF/GLB URL..."
                className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none"
              />
            </div>
            <button
              onClick={handleAddUrl}
              disabled={!urlInput.trim()}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>

          {/* File upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-dashed border-zinc-700 hover:border-blue-500/50 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload local .glb / .gltf file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>
    </div>
  )
}
