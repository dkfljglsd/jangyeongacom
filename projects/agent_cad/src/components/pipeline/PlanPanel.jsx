import { ChevronDown, ChevronRight, Layers } from 'lucide-react'
import { useState } from 'react'

export default function PlanPanel({ plan }) {
  const [open, setOpen] = useState(true)
  if (!plan) return null

  const parts = plan.parts || []
  const sorted = [...parts].sort((a, b) => (a.order || 0) - (b.order || 0))

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-800/60 hover:bg-zinc-800 transition-colors text-left"
      >
        <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="text-xs font-semibold text-zinc-300 flex-1">CAD 계획</span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        )}
      </button>

      {open && (
        <div className="p-2.5 bg-zinc-900/40 space-y-1.5">
          {plan.strategy && (
            <p className="text-[10px] text-zinc-500 mb-2">{plan.strategy}</p>
          )}
          {sorted.map((part, i) => (
            <div key={i} className="flex items-start gap-2">
              <div
                className="w-3 h-3 rounded-sm shrink-0 mt-0.5 border border-zinc-600"
                style={{ backgroundColor: part.color || '#555' }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-zinc-300 font-medium">{part.name}</div>
                <div className="text-[10px] text-zinc-500">
                  {part.primitive}({(part.params || []).join(', ')})
                </div>
                {part.operations?.map((op, j) => (
                  <div key={j} className="text-[10px] text-zinc-600 pl-2">
                    → {op}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
