import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'

const STAGES = [
  { key: 'view_inference', label: '뷰 분석' },
  { key: 'constraint_extraction', label: '치수 추출' },
  { key: 'cad_planning', label: 'CAD 계획' },
  { key: 'code_generation', label: '코드 생성' },
  { key: 'geometry_execution', label: '형상 계산' },
  { key: 'validation', label: '검증' },
]

const STAGE_ORDER = STAGES.map((s) => s.key)

export default function PipelineProgress({ stage }) {
  const currentIdx = STAGE_ORDER.indexOf(stage)

  return (
    <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800">
      <div className="flex items-center gap-1">
        {STAGES.map((s, i) => {
          const done = currentIdx > i || stage === 'done'
          const active = currentIdx === i
          const pending = currentIdx < i && stage !== 'done'

          return (
            <div key={s.key} className="flex items-center gap-1 flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    done
                      ? 'bg-green-500 text-white'
                      : active
                      ? 'bg-blue-500 text-white'
                      : 'bg-zinc-700 text-zinc-500'
                  }`}
                >
                  {done ? (
                    <Check className="w-3 h-3" />
                  ) : active ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader2 className="w-3 h-3" />
                    </motion.div>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span
                  className={`text-[9px] text-center leading-tight ${
                    done ? 'text-green-400' : active ? 'text-blue-400' : 'text-zinc-600'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className={`h-px flex-1 mb-4 ${
                    done ? 'bg-green-500' : 'bg-zinc-700'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
