import { motion, AnimatePresence } from 'framer-motion'
import { Box, Eye, EyeOff, Trash2, Layers, MousePointer } from 'lucide-react'
import useCADStore from '../../store/cadStore'

const TYPE_ICONS = {
  box: '⬜',
  sphere: '⚪',
  cylinder: '⭕',
  cone: '🔺',
  torus: '🔘',
  plane: '▬',
  capsule: '💊',
}

export default function Sidebar() {
  const objects = useCADStore((s) => s.objects)
  const selectedId = useCADStore((s) => s.selectedId)
  const selectObject = useCADStore((s) => s.selectObject)
  const removeObject = useCADStore((s) => s.removeObject)
  const toggleObjectVisible = useCADStore((s) => s.toggleObjectVisible)

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <Layers className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-semibold text-white">Objects</span>
        <span className="ml-auto text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">
          {objects.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {objects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
              <Box className="w-6 h-6 text-zinc-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">No objects yet</p>
              <p className="text-xs text-zinc-600 mt-0.5">Use AI to generate your first model</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            <AnimatePresence>
              {objects.map((obj) => (
                <motion.div
                  key={obj.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                    selectedId === obj.id
                      ? 'bg-blue-600/20 border border-blue-500/30'
                      : 'hover:bg-zinc-800/50 border border-transparent'
                  }`}
                  onClick={() => selectObject(obj.id === selectedId ? null : obj.id)}
                >
                  {/* Color dot */}
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: obj.material.color }}
                  />

                  {/* Type icon + name */}
                  <span className="text-xs">{TYPE_ICONS[obj.type] || '▪'}</span>
                  <span
                    className={`text-xs flex-1 truncate ${
                      selectedId === obj.id ? 'text-blue-300' : 'text-zinc-300'
                    } ${obj.visible === false ? 'opacity-40' : ''}`}
                  >
                    {obj.name}
                  </span>

                  {/* Actions (show on hover) */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleObjectVisible(obj.id)
                      }}
                      className="p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {obj.visible === false ? (
                        <EyeOff className="w-3 h-3" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeObject(obj.id)
                      }}
                      className="p-0.5 rounded hover:bg-red-900/50 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
