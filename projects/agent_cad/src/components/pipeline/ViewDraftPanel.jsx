import { ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { useState } from 'react'

function ViewBox({ label, content }) {
  return (
    <div className="bg-zinc-900 rounded-lg p-2.5 border border-zinc-700">
      <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">{label}</div>
      <p className="text-xs text-zinc-300 leading-relaxed">{content || '—'}</p>
    </div>
  )
}

export default function ViewDraftPanel({ viewInference }) {
  const [open, setOpen] = useState(true)
  if (!viewInference) return null

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-800/60 hover:bg-zinc-800 transition-colors text-left"
      >
        <Eye className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="text-xs font-semibold text-zinc-300 flex-1">뷰 분석</span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        )}
      </button>

      {open && (
        <div className="p-2.5 space-y-2 bg-zinc-900/40">
          <ViewBox label="정면" content={viewInference.front} />
          <ViewBox label="측면" content={viewInference.side} />
          <ViewBox label="평면" content={viewInference.top} />
          {viewInference.assumptions?.length > 0 && (
            <div className="text-[10px] text-zinc-500 pl-1">
              <span className="font-semibold">가정: </span>
              {viewInference.assumptions.join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
