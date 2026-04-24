import { Settings } from 'lucide-react'
import useCADStore from '../../store/cadStore'

function VecInput({ label, value, onChange, step = 0.1 }) {
  return (
    <div>
      <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
      <div className="grid grid-cols-3 gap-1">
        {['X', 'Y', 'Z'].map((axis, i) => (
          <div key={axis} className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-600 font-mono">{axis}</span>
            <input
              type="number"
              value={Number(value[i]).toFixed(2)}
              step={step}
              onChange={(e) => {
                const next = [...value]
                next[i] = parseFloat(e.target.value) || 0
                onChange(next)
              }}
              className="w-full pl-5 pr-1 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 focus:outline-none focus:border-blue-500 text-right"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function SliderInput({ label, value, min, max, step, onChange }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-xs text-zinc-500">{label}</label>
        <span className="text-xs text-zinc-400 font-mono">{Number(value).toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none bg-zinc-700 accent-blue-500"
      />
    </div>
  )
}

export default function PropertiesPanel() {
  const objects = useCADStore((s) => s.objects)
  const selectedId = useCADStore((s) => s.selectedId)
  const updateObjectMaterial = useCADStore((s) => s.updateObjectMaterial)
  const updateObjectTransform = useCADStore((s) => s.updateObjectTransform)
  const updateObjectName = useCADStore((s) => s.updateObjectName)

  const selected = objects.find((o) => o.id === selectedId)

  if (!selected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
          <Settings className="w-5 h-5 text-zinc-600" />
        </div>
        <div>
          <p className="text-sm text-zinc-500">No selection</p>
          <p className="text-xs text-zinc-600 mt-0.5">Click an object to edit its properties</p>
        </div>
      </div>
    )
  }

  const { material, transform } = selected

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 sticky top-0 bg-zinc-900 z-10">
        <Settings className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-semibold text-white truncate">{selected.name}</span>
        <span className="ml-auto text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full capitalize">{selected.type}</span>
      </div>

      <div className="p-4 space-y-5">
        {/* Name */}
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Name</label>
          <input
            value={selected.name}
            onChange={(e) => updateObjectName(selected.id, e.target.value)}
            className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Transform */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Transform</p>
          <VecInput
            label="Position"
            value={transform.position}
            onChange={(v) => updateObjectTransform(selected.id, { position: v })}
          />
          <VecInput
            label="Rotation (rad)"
            value={transform.rotation}
            onChange={(v) => updateObjectTransform(selected.id, { rotation: v })}
            step={0.1}
          />
          <VecInput
            label="Scale"
            value={transform.scale}
            onChange={(v) => updateObjectTransform(selected.id, { scale: v })}
            step={0.1}
          />
        </div>

        {/* Material */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Material</p>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={material.color}
                onChange={(e) => updateObjectMaterial(selected.id, { color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-xs text-zinc-400 font-mono">{material.color}</span>
            </div>
          </div>

          <SliderInput
            label="Metalness"
            value={material.metalness ?? 0.1}
            min={0} max={1} step={0.01}
            onChange={(v) => updateObjectMaterial(selected.id, { metalness: v })}
          />
          <SliderInput
            label="Roughness"
            value={material.roughness ?? 0.6}
            min={0} max={1} step={0.01}
            onChange={(v) => updateObjectMaterial(selected.id, { roughness: v })}
          />
          <SliderInput
            label="Opacity"
            value={material.opacity ?? 1}
            min={0} max={1} step={0.01}
            onChange={(v) => updateObjectMaterial(selected.id, { opacity: v })}
          />

          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-500">Wireframe</label>
            <button
              onClick={() => updateObjectMaterial(selected.id, { wireframe: !material.wireframe })}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                material.wireframe ? 'bg-blue-600' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  material.wireframe ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
