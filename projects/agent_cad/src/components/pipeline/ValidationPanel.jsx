import { ChevronDown, ChevronRight, ShieldCheck, ShieldAlert, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import usePipelineStore from '../../store/pipelineStore'
import { usePipeline } from '../../hooks/usePipeline'

export default function ValidationPanel({ validation }) {
  const [open, setOpen] = useState(true)

  const userText = usePipelineStore((s) => s.userText)
  const userImages = usePipelineStore((s) => s.userImages)
  const isRunning = usePipelineStore((s) => s.isRunning)
  const resetPipeline = usePipelineStore((s) => s.resetPipeline)
  const { run } = usePipeline()

  if (!validation) return null

  const checks = validation.checks || []
  const passed = validation.passed !== false

  const handleRetry = async () => {
    if (!userText || isRunning) return
    resetPipeline()
    await run(userText, userImages)
  }

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <div className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-800/60 hover:bg-zinc-800 transition-colors">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 flex-1 text-left min-w-0"
        >
          {passed ? (
            <ShieldCheck className="w-3.5 h-3.5 text-green-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
          )}
          <span className="text-xs font-semibold text-zinc-300 flex-1">
            검증 {passed ? '통과' : '실패'}
          </span>
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
          )}
        </button>
        {!passed && (
          <button
            onClick={handleRetry}
            disabled={isRunning}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-zinc-400 hover:text-white bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 transition-colors shrink-0"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            재시도
          </button>
        )}
      </div>

      {open && (
        <div className="p-2.5 bg-zinc-900/40 space-y-1">
          {validation.summary && (
            <p className="text-[10px] text-zinc-400 mb-2">{validation.summary}</p>
          )}
          {checks.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={c.passed ? 'text-green-400' : 'text-red-400'}>
                {c.passed ? '✓' : '✗'}
              </span>
              <div>
                <span className="text-zinc-300">{c.constraint}</span>
                {c.note && <span className="text-zinc-500 ml-1">— {c.note}</span>}
              </div>
            </div>
          ))}
          {validation.suggestions?.length > 0 && (
            <div className="pt-2 border-t border-zinc-800">
              <div className="text-[10px] text-zinc-500 font-semibold mb-1">개선 제안</div>
              {validation.suggestions.map((s, i) => (
                <div key={i} className="text-[10px] text-zinc-500">
                  · {s}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
