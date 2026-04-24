import { ChevronDown, ChevronRight, Ruler } from 'lucide-react'
import { useState } from 'react'

export default function ConstraintPanel({ constraints }) {
  const [open, setOpen] = useState(true)
  if (!constraints) return null

  const dims = constraints.dimensions || []
  const mats = constraints.materials || []

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-800/60 hover:bg-zinc-800 transition-colors text-left"
      >
        <Ruler className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        <span className="text-xs font-semibold text-zinc-300 flex-1">치수 & 제약</span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        )}
      </button>

      {open && (
        <div className="p-2.5 bg-zinc-900/40 space-y-2">
          {dims.length > 0 && (
            <div className="space-y-1">
              {dims.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">
                    {d.part} · {d.axis}
                  </span>
                  <span className="text-zinc-200 font-mono">
                    {d.value} {d.unit || 'cm'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {mats.length > 0 && (
            <div className="pt-1 border-t border-zinc-800 space-y-1">
              {mats.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-3 h-3 rounded-sm shrink-0 border border-zinc-600"
                    style={{ backgroundColor: m.color || '#888' }}
                  />
                  <span className="text-zinc-400">{m.part}</span>
                  <span className="text-zinc-500 ml-auto">{m.material}</span>
                </div>
              ))}
            </div>
          )}

          {constraints.symmetry && constraints.symmetry !== 'none' && (
            <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
              대칭: {constraints.symmetry}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
