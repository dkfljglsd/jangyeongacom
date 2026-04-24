import { useState, useRef, useEffect } from 'react'
import { Send, Square, AlertCircle, Zap, SlidersHorizontal, ImagePlus, X, RotateCcw } from 'lucide-react'
import usePipelineStore from '../../store/pipelineStore'
import { usePipeline } from '../../hooks/usePipeline'
import PipelineProgress from '../pipeline/PipelineProgress'
import ViewDraftPanel from '../pipeline/ViewDraftPanel'
import ConstraintPanel from '../pipeline/ConstraintPanel'
import PlanPanel from '../pipeline/PlanPanel'
import ValidationPanel from '../pipeline/ValidationPanel'

const STAGE_LABELS = {
  view_inference: '정면/측면/평면 분석 중...',
  constraint_extraction: '치수 및 제약 추출 중...',
  cad_planning: 'CAD 계획 수립 중...',
  code_generation: 'replicad 코드 생성 중...',
  geometry_execution: 'OpenCASCADE 형상 계산 중...',
  validation: '모델 검증 중...',
  done: '완료',
  error: '오류 발생',
}

export default function PipelinePanel() {
  const [input, setInput] = useState('')
  const [images, setImages] = useState([]) // [{ dataUrl, name }]
  const [isDragging, setIsDragging] = useState(false)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const dragCounterRef = useRef(0)

  const stage = usePipelineStore((s) => s.stage)
  const isRunning = usePipelineStore((s) => s.isRunning)
  const error = usePipelineStore((s) => s.error)
  const viewInference = usePipelineStore((s) => s.viewInference)
  const constraints = usePipelineStore((s) => s.constraints)
  const plan = usePipelineStore((s) => s.plan)
  const validation = usePipelineStore((s) => s.validation)
  const userText = usePipelineStore((s) => s.userText)
  const userImages = usePipelineStore((s) => s.userImages)
  const resetPipeline = usePipelineStore((s) => s.resetPipeline)
  const setMode = usePipelineStore((s) => s.setMode)
  const pendingImages = usePipelineStore((s) => s.pendingImages)
  const clearPendingImages = usePipelineStore((s) => s.clearPendingImages)

  const { run, cancel } = usePipeline()

  // AIPanel에서 드래그앤드롭으로 넘긴 이미지 수신
  useEffect(() => {
    if (pendingImages.length > 0) {
      setImages((prev) => [...prev, ...pendingImages])
      clearPendingImages()
    }
  }, [pendingImages, clearPendingImages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [stage, viewInference, constraints, plan, validation])

  const addImageFiles = (files) => {
    Array.from(files).filter((f) => f.type.startsWith('image/')).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setImages((prev) => [...prev, { dataUrl: ev.target.result, name: file.name }])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleImageAdd = (e) => {
    addImageFiles(e.target.files)
    e.target.value = ''
  }

  const panelRef = useRef(null)

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const onDragEnter = (e) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current += 1
      setIsDragging(true)
    }
    const onDragLeave = (e) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current -= 1
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0
        setIsDragging(false)
      }
    }
    const onDragOver = (e) => {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'copy'
    }
    const onDrop = (e) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current = 0
      setIsDragging(false)
      addImageFiles(e.dataTransfer.files)
    }

    panel.addEventListener('dragenter', onDragEnter)
    panel.addEventListener('dragleave', onDragLeave)
    panel.addEventListener('dragover', onDragOver)
    panel.addEventListener('drop', onDrop)
    return () => {
      panel.removeEventListener('dragenter', onDragEnter)
      panel.removeEventListener('dragleave', onDragLeave)
      panel.removeEventListener('dragover', onDragOver)
      panel.removeEventListener('drop', onDrop)
    }
  }, [])

  const handleImageRemove = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSend = async () => {
    const text = input.trim()
    if ((!text && images.length === 0) || isRunning) return
    const sentImages = images.map((img) => img.dataUrl)
    setInput('')
    setImages([])
    resetPipeline()
    await run(text || '이미지를 보고 3D 모델을 만들어주세요', sentImages)
  }

  const handleRetry = async () => {
    if (!userText || isRunning) return
    resetPipeline()
    await run(userText, userImages)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      ref={panelRef}
      className="flex flex-col h-full bg-zinc-950 relative"
    >
      {/* 드래그 오버레이 */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-zinc-950/90 border-2 border-dashed border-blue-500 rounded-lg pointer-events-none">
          <ImagePlus className="w-10 h-10 text-blue-400" />
          <p className="text-sm font-semibold text-blue-300">이미지를 여기에 놓으세요</p>
          <p className="text-xs text-zinc-500">정면·측면·평면을 자동 분석합니다</p>
        </div>
      )}
      {/* 헤더 - 항상 표시 */}
      <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center gap-2 bg-zinc-950 shrink-0">
        <SlidersHorizontal className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-xs font-semibold text-zinc-300 flex-1">정확 모드</span>
        <button
          onClick={() => setMode('fast')}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors border border-zinc-700"
        >
          <Zap className="w-3 h-3" />
          빠른 모드
        </button>
      </div>

      {/* 파이프라인 진행 상태 */}
      {isRunning && <PipelineProgress stage={stage} />}

      {/* 결과 패널들 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {stage === 'idle' && !error && (
          <div className="text-center py-6">
            <p className="text-sm text-zinc-500 mb-1">정확 모드</p>
            <p className="text-xs text-zinc-600 mb-3">
              뷰 분석 → 치수 추출 → CAD 계획 → 코드 생성 → 검증
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
              <ImagePlus className="w-3.5 h-3.5" />
              <span>이미지를 첨부하면 정면·측면·평면을 자동 분석합니다</span>
            </div>
          </div>
        )}

        {/* 전송된 이미지 미리보기 */}
        {userText && stage !== 'idle' && (
          <div className="flex flex-col items-end gap-1">
            {/* 실행 시 저장된 이미지는 없으므로 텍스트만 표시 */}
            <div className="bg-blue-600 text-white text-sm px-3 py-2 rounded-2xl rounded-tr-sm max-w-[80%]">
              {userText}
            </div>
          </div>
        )}

        {isRunning && (
          <div className="text-xs text-zinc-500 text-center py-1 animate-pulse">
            {STAGE_LABELS[stage] || '처리 중...'}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-800 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {viewInference && <ViewDraftPanel viewInference={viewInference} />}
        {constraints && <ConstraintPanel constraints={constraints} />}
        {plan && <PlanPanel plan={plan} />}
        {validation && <ValidationPanel validation={validation} />}

        {stage === 'done' && (
          <div className="flex items-center justify-between px-1 py-2">
            <p className="text-xs text-green-400">모델 생성 완료</p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              재시도
            </button>
          </div>
        )}

        {stage === 'error' && userText && (
          <div className="flex justify-center py-1">
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              다시 시도
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div className="p-3 border-t border-zinc-800 shrink-0">
        {/* 첨부 이미지 미리보기 */}
        {images.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {images.map((img, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="w-14 h-14 object-cover rounded-lg border border-zinc-700"
                />
                <button
                  onClick={() => handleImageRemove(idx)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-900 border border-zinc-600 text-zinc-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 bg-zinc-800 rounded-2xl px-3 py-2 border border-zinc-700 focus-within:border-blue-500/50 transition-colors">
          {/* 이미지 첨부 버튼 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isRunning}
            className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-zinc-300 disabled:opacity-40 transition-colors shrink-0 mb-0.5"
            title="이미지 첨부"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageAdd}
          />

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={images.length > 0 ? '이미지 설명 추가 (선택)...' : '만들고 싶은 것을 설명하세요...'}
            rows={2}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none leading-relaxed"
            disabled={isRunning}
          />
          {isRunning ? (
            <button
              onClick={cancel}
              className="w-8 h-8 rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shrink-0"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() && images.length === 0}
              className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white flex items-center justify-center shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-700 mt-1.5 text-center">
          Enter로 전송 · 이미지 첨부 또는 드래그앤드롭
        </p>
      </div>
    </div>
  )
}
