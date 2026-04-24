import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, Loader2, Trash2, Bot, User, Square, Zap, SlidersHorizontal, ImagePlus, Code2, X, FileImage } from 'lucide-react'
import useCADStore from '../../store/cadStore'
import { useAIGenerate } from '../../hooks/useAIGenerate'
import usePipelineStore from '../../store/pipelineStore'
import PipelinePanel from './PipelinePanel'
import CodePanel from './CodePanel'
import SVGPanel from './SVGPanel'

const INITIAL_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  text: "I created a new project for you. What shall we build?",
}

const EXAMPLE_PROMPTS = [
  'A wooden dining table with 4 legs',
  'A modern minimalist chair',
  'A simple house with a roof',
  'A robot with box body',
  'A racing car with wheels',
  'A coffee mug',
]

function ChatBubble({ message }) {
  const isAI = message.role === 'assistant'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-2.5 ${isAI ? '' : 'flex-row-reverse'}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
          isAI
            ? 'bg-gradient-to-br from-blue-500 to-violet-600 text-white'
            : 'bg-zinc-700 text-zinc-300'
        }`}
      >
        {isAI ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1 max-w-[80%] ${isAI ? '' : 'items-end'}`}>
        {isAI && (
          <span className="text-xs text-zinc-500 font-medium px-1">AI Assistant</span>
        )}
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isAI
              ? 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
              : 'bg-blue-600 text-white rounded-tr-sm'
          }`}
        >
          {message.text}
        </div>
        {message.objectCount !== undefined && (
          <span className="text-xs text-zinc-600 px-1">
            {message.objectCount} objects generated
          </span>
        )}
      </div>
    </motion.div>
  )
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-2.5"
    >
      <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-violet-600">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-zinc-400"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  )
}

export default function AIPanel() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [pendingImages, setPendingImages] = useState([])
  const messagesEndRef = useRef(null)
  const panelRef = useRef(null)
  const dragCounterRef = useRef(0)

  const mode = usePipelineStore((s) => s.mode)
  const setMode = usePipelineStore((s) => s.setMode)
  const setPipelinePendingImages = usePipelineStore((s) => s.setPendingImages)

  const prompt = useCADStore((s) => s.prompt)
  const setPrompt = useCADStore((s) => s.setPrompt)
  const isGenerating = useCADStore((s) => s.isGenerating)
  const clearScene = useCADStore((s) => s.clearScene)
  const { generate, cancel } = useAIGenerate()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isGenerating])

  // 드래그앤드롭: 이미지 드롭 시 정확 모드로 전환 + 이미지 전달
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const onDragEnter = (e) => {
      e.preventDefault()
      dragCounterRef.current += 1
      setIsDragging(true)
    }
    const onDragLeave = (e) => {
      e.preventDefault()
      dragCounterRef.current -= 1
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0
        setIsDragging(false)
      }
    }
    const onDragOver = (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
    const onDrop = (e) => {
      e.preventDefault()
      dragCounterRef.current = 0
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
      if (files.length === 0) return
      const loaded = []
      files.forEach((file) => {
        const reader = new FileReader()
        reader.onload = (ev) => {
          loaded.push({ dataUrl: ev.target.result, name: file.name })
          if (loaded.length === files.length) {
            setPendingImages(loaded)
            setMode('accurate')
          }
        }
        reader.readAsDataURL(file)
      })
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
  }, [setMode, setPendingImages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isGenerating) return

    // Add user message
    const userMsg = { id: Date.now(), role: 'user', text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setPrompt(text)

    // Call AI with the text directly
    const result = await generate(text)

    // Add AI response
    if (result) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: `Here's your model! I generated ${result.objects.length} object${result.objects.length !== 1 ? 's' : ''} based on your description. You can select and edit them in the properties panel.`,
          objectCount: result.objects.length,
        },
      ])
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: useCADStore.getState().generationError || 'Sorry, something went wrong.',
        },
      ])
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = () => {
    clearScene()
    setMessages([INITIAL_MESSAGE])
    setInput('')
  }

  const handleExample = (ex) => {
    setInput(ex)
  }

  if (mode === 'accurate') return <PipelinePanel />
  if (mode === 'code') return <CodePanel />
  if (mode === 'svg') return <SVGPanel />

  return (
    <div ref={panelRef} className="flex flex-col h-full bg-zinc-950 relative">
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-zinc-950/90 border-2 border-dashed border-blue-500 rounded-lg pointer-events-none">
          <ImagePlus className="w-10 h-10 text-blue-400" />
          <p className="text-sm font-semibold text-blue-300">이미지를 여기에 놓으세요</p>
          <p className="text-xs text-zinc-500">정확 모드로 전환 후 뷰를 자동 분석합니다</p>
        </div>
      )}
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">AI Assistant</p>
          <p className="text-xs text-zinc-500">Powered by Gemini</p>
        </div>
        <button
          onClick={() => setMode('accurate')}
          title="정확 모드로 전환"
          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setMode('code')}
          title="코드 모드"
          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          <Code2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setMode('svg')}
          title="SVG 도면 모드"
          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          <FileImage className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleClear}
          title="Clear chat"
          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        <AnimatePresence>
          {isGenerating && <TypingIndicator />}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Example chips */}
      {messages.length <= 1 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              onClick={() => handleExample(ex)}
              className="text-xs px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-full text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-zinc-800">
        <div className="flex items-end gap-2 bg-zinc-800 rounded-2xl px-3 py-2 border border-zinc-700 focus-within:border-blue-500/50 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            rows={2}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none leading-relaxed"
            disabled={isGenerating}
          />
          {isGenerating ? (
            <button
              onClick={cancel}
              className="w-8 h-8 rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shrink-0 transition-colors"
              title="Stop"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white flex items-center justify-center shrink-0 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-700 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
