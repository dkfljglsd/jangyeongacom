import { useState, useRef } from 'react'
import { FileImage, Download, Loader2, Zap, SlidersHorizontal, Code2, Send, CheckCircle } from 'lucide-react'
import usePipelineStore from '../../store/pipelineStore'
import { callGeminiIPC } from '../../services/ipcService'
import { SVG_DECOMPOSE_PROMPT, SVG_GENERATE_PROMPT } from '../../prompts/svgPrompt'

const EXAMPLES = [
  '태극기 (가로 300mm × 세로 200mm)',
  '체스판 (200mm × 200mm, 8×8 격자)',
  '오각별 (100mm × 100mm)',
  '집 정면도 (150mm × 120mm)',
  '화살표 오른쪽 (100mm × 60mm)',
]

const STAGES = [
  { key: 'decompose', label: '도형 분해 & 좌표 계산' },
  { key: 'generate',  label: 'SVG 코드 생성' },
]

function cleanSVG(raw) {
  return raw
    .replace(/```[\w]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/^[^<]*(<\?xml)/, '$1')
    .trim()
}

function StageIndicator({ stage }) {
  return (
    <div className="flex flex-col gap-1.5">
      {STAGES.map((s, i) => {
        const idx = STAGES.findIndex((x) => x.key === stage)
        const done = i < idx || stage === 'done'
        const active = s.key === stage
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
              done ? 'bg-violet-500' : active ? 'bg-violet-500/40 animate-pulse' : 'bg-zinc-700'
            }`}>
              {done && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
            <span className={`text-xs ${active ? 'text-violet-300' : done ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {s.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function SVGPanel() {
  const [input, setInput] = useState('')
  const [svgContent, setSvgContent] = useState(null)
  const [planContent, setPlanContent] = useState(null)
  const [stage, setStage] = useState('idle') // idle | decompose | generate | done | error
  const [error, setError] = useState(null)
  const reqIdRef = useRef(null)
  const setMode = usePipelineStore((s) => s.setMode)

  const isRunning = stage !== 'idle' && stage !== 'done' && stage !== 'error'

  const handleGenerate = async () => {
    const text = input.trim()
    if (!text || isRunning) return

    const reqId = `svg_${Date.now()}`
    reqIdRef.current = reqId
    setError(null)
    setSvgContent(null)
    setPlanContent(null)

    try {
      // ── Stage 1: 도형 분해 & 좌표 계산 ──────────────────────────────
      setStage('decompose')
      const planRes = await callGeminiIPC({
        requestId: reqId,
        systemPrompt: SVG_DECOMPOSE_PROMPT,
        userParts: [{ text }],
        temperature: 0.1,
        maxTokens: 8192,
      })
      if (reqIdRef.current === null) return
      setPlanContent(planRes.text)

      // ── Stage 2: SVG 코드 생성 ───────────────────────────────────────
      setStage('generate')
      const svgRes = await callGeminiIPC({
        requestId: reqId,
        systemPrompt: SVG_GENERATE_PROMPT,
        userParts: [
          { text: `Drawing request: ${text}\n\nGeometric plan:\n${planRes.text}` },
        ],
        temperature: 0.1,
        maxTokens: 8192,
      })
      if (reqIdRef.current === null) return

      const svg = cleanSVG(svgRes.text)
      if (!svg.includes('<svg')) throw new Error('SVG가 생성되지 않았습니다. 다시 시도해주세요.')
      setSvgContent(svg)
      setStage('done')
    } catch (err) {
      if (reqIdRef.current === null) return
      setError(err.message || '오류가 발생했습니다.')
      setStage('error')
    } finally {
      reqIdRef.current = null
    }
  }

  const handleCancel = () => {
    reqIdRef.current = null
    setStage('idle')
  }

  const handleDownload = () => {
    if (!svgContent) return
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'drawing.svg'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* 헤더 */}
      <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center gap-2 shrink-0">
        <FileImage className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-xs font-semibold text-zinc-300 flex-1">SVG 도면 모드</span>
        <button onClick={() => setMode('fast')}     className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors border border-zinc-700"><Zap className="w-3 h-3" /> 빠른</button>
        <button onClick={() => setMode('accurate')} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors border border-zinc-700"><SlidersHorizontal className="w-3 h-3" /> 정확</button>
        <button onClick={() => setMode('code')}     className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors border border-zinc-700"><Code2 className="w-3 h-3" /> 코드</button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3 min-h-0">
        <p className="text-xs text-zinc-500 leading-relaxed">
          그림을 도형+좌표로 분해한 뒤 FreeCAD 호환 SVG를 생성합니다.<br />
          <span className="text-violet-400">Import → SVG as geometry</span>로 바로 열 수 있습니다.
        </p>

        {/* 예시 칩 */}
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setInput(ex)}
              disabled={isRunning}
              className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-40"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* 입력 */}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate() } }}
            placeholder="그릴 도면을 설명하세요..."
            rows={3}
            className="flex-1 bg-zinc-900 text-sm text-zinc-100 placeholder-zinc-600 rounded-lg border border-zinc-700 focus:border-violet-500/50 focus:outline-none p-2.5 resize-none"
            disabled={isRunning}
          />
          {isRunning ? (
            <button onClick={handleCancel} className="px-3 rounded-lg bg-red-700 hover:bg-red-600 text-white transition-colors shrink-0">
              <span className="text-xs">중단</span>
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!input.trim()}
              className="px-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 진행 상태 */}
        {isRunning && (
          <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
              <span className="text-xs text-zinc-400">도면 생성 중...</span>
            </div>
            <StageIndicator stage={stage} />
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* SVG 미리보기 */}
        {svgContent && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">미리보기</span>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                SVG 다운로드
              </button>
            </div>
            <div
              className="bg-white rounded-lg p-2 border border-zinc-700 flex items-center justify-center overflow-hidden"
              style={{ minHeight: '160px', maxHeight: '320px' }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
            <details className="text-xs">
              <summary className="text-zinc-500 cursor-pointer hover:text-zinc-300 select-none">좌표 계산 플랜 보기</summary>
              <pre className="mt-1 bg-zinc-900 rounded-lg p-2 overflow-x-auto text-zinc-400 text-[10px] leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">{planContent}</pre>
            </details>
            <details className="text-xs">
              <summary className="text-zinc-500 cursor-pointer hover:text-zinc-300 select-none">SVG 코드 보기</summary>
              <pre className="mt-1 bg-zinc-900 rounded-lg p-2 overflow-x-auto text-zinc-400 text-[10px] leading-relaxed max-h-40 overflow-y-auto">{svgContent}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}
