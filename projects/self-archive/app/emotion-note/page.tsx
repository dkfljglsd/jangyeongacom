'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, PanelLeftClose, PanelLeftOpen, ChevronLeft } from 'lucide-react'
import { EmotionNote, Attachment } from '@/lib/types'
import { emotionStore } from '@/lib/store'
import { FileAttachments } from '@/components/FileAttachments'
import { useIsMobile } from '@/lib/useIsMobile'

const CHOSUNG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const JUNGSUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
const JONGSUNG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'
function decomposeHangul(str: string): string {
  return str.split('').map(ch => {
    const code = ch.charCodeAt(0) - 0xAC00
    if (code < 0 || code > 11171) return ch
    const cho = Math.floor(code / 28 / 21)
    const jung = Math.floor(code / 28) % 21
    const jong = code % 28
    return CHOSUNG[cho] + JUNGSUNG[jung] + (jong ? JONGSUNG[jong] : '')
  }).join('')
}
function matchSearch(text: string, query: string): boolean {
  return decomposeHangul(text.toLowerCase()).includes(decomposeHangul(query.toLowerCase()))
}

const EMOTIONS = ['불안', '두려움', '슬픔', '외로움', '화남', '좌절', '기쁨', '설렘', '감사', '평온']

function AutoTextarea({ value, onChange, onBlur, placeholder, className }: {
  value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  return (
    <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)}
      onBlur={onBlur} placeholder={placeholder} rows={1} className={className}
      style={{ resize: 'none', overflow: 'hidden' }} />
  )
}

type Panel = { type: 'edit'; note?: EmotionNote } | null

export default function EmotionNotePage() {
  const [notes, setNotes] = useState<EmotionNote[]>([])
  const [panel, setPanel] = useState<Panel>(null)
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(224)
  const [isDragging, setIsDragging] = useState(false)
  const isMobile = useIsMobile()
  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const startX = e.clientX, startW = sidebarWidth
    const onMove = (mv: MouseEvent) => setSidebarWidth(Math.max(160, Math.min(480, startW + mv.clientX - startX)))
    const onUp = () => { setIsDragging(false); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  const load = useCallback(() => setNotes(emotionStore.getAll().reverse()), [])
  useEffect(() => { load() }, [load])

  const filtered = notes.filter(n =>
    matchSearch(n.emotion, search) ||
    matchSearch(n.actualEvent, search)
  )
  const activeNoteId = panel?.note?.id ?? null

  return (
    <div className="flex h-full relative">
      <button onClick={() => setSidebarOpen(o => !o)}
        className="hidden md:block absolute top-3 right-3 z-10 p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600">
        {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
      </button>

      <div className={[
        'border-r border-gray-200 flex flex-col bg-gray-50 max-md:pb-16',
        !isDragging ? 'transition-all duration-200' : '',
        panel !== null ? 'max-md:hidden' : 'max-md:flex-1',
        !sidebarOpen ? 'md:flex-1' : 'md:flex-shrink-0',
      ].filter(Boolean).join(' ')}
        style={sidebarOpen && !isMobile ? { width: sidebarWidth } : undefined}>
        <div className="px-4 py-3 border-b border-gray-200">
          <h1 className="text-sm font-bold text-gray-900">감정 분리 노트</h1>
        </div>
        <div className="px-3 py-2 border-b border-gray-200">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(note => (
            <button key={note.id}
              onClick={() => { setPanel({ type: 'edit', note }); if (!isMobile) setSidebarOpen(true) }}
              className={`w-full text-left px-4 py-2.5 border-b border-gray-100 transition-colors ${
                activeNoteId === note.id ? 'bg-pink-50 border-l-2 border-l-pink-400' : 'hover:bg-gray-100'
              }`}>
              <p className="text-xs font-medium text-pink-600 truncate mb-0.5">{note.emotion || '감정'}</p>
              <p className="text-xs text-gray-400 truncate mb-1">
                {new Date(note.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                {' · 🕒 '}{new Date(note.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              {note.actualEvent && (
                <p className="text-xs text-gray-500 truncate mb-0.5">
                  {note.actualEvent.length > 20 ? note.actualEvent.slice(0, 20) + '...' : note.actualEvent}
                </p>
              )}
              {[
                { label: '해석', val: note.myInterpretation },
                { label: '다른해석', val: note.alternativeView },
                { label: '나에게', val: note.messageToSelf },
              ].filter(f => f.val).map(({ label, val }) => (
                <p key={label} className="text-xs text-gray-500 truncate mb-0.5">
                  <span className="text-gray-400">{label} </span>
                  {val.length > 20 ? val.slice(0, 20) + '...' : val}
                </p>
              ))}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-gray-200">
          <button onClick={() => { setPanel({ type: 'edit' }); if (!isMobile) setSidebarOpen(true) }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              panel?.type === 'edit' && !panel.note ? 'bg-pink-100 text-pink-700 font-medium' : 'text-gray-600 hover:bg-gray-200'
            }`}>
            <Plus size={14} />감정 기록
          </button>
        </div>
      </div>

      <div onMouseDown={sidebarOpen ? onDividerMouseDown : undefined}
        className={`hidden md:flex flex-shrink-0 ${sidebarOpen ? 'w-1 cursor-col-resize hover:bg-blue-200' : 'w-0'} ${isDragging ? 'bg-blue-300' : ''} transition-colors`}
      />
      <div className={[
        'overflow-y-auto transition-all duration-200',
        panel !== null ? 'max-md:fixed max-md:inset-0 max-md:z-20 max-md:bg-white max-md:pb-14' : 'max-md:hidden',
        sidebarOpen ? 'md:flex-1' : 'md:w-0 md:overflow-hidden',
      ].join(' ')}>
        {panel !== null && (
          <button onClick={() => setPanel(null)}
            className="md:hidden flex items-center gap-1.5 w-full px-4 py-3.5 text-sm text-blue-600 border-b border-gray-100 bg-white active:bg-gray-50">
            <ChevronLeft size={16} />목록으로
          </button>
        )}
        {panel?.type === 'edit' && (
          <EmotionEditor
            note={panel.note}
            onCancel={() => setPanel(null)}
            onDelete={() => { emotionStore.delete(panel.note!.id); load(); setPanel(null) }}
            onSaved={saved => { load(); setPanel({ type: 'edit', note: saved }) }}
          />
        )}
        {panel === null && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-4xl mb-4">💭</p>
            <p className="text-gray-400 text-sm">감정을 선택하거나 새로 기록해보세요</p>
          </div>
        )}
      </div>
    </div>
  )
}

function EmotionEditor({ note, onCancel, onDelete, onSaved }: {
  note?: EmotionNote
  onCancel: () => void
  onDelete: () => void
  onSaved: (n: EmotionNote) => void
}) {
  const [form, setForm] = useState({
    emotion: note?.emotion ?? '',
    actualEvent: note?.actualEvent ?? '',
    myInterpretation: note?.myInterpretation ?? '',
    alternativeView: note?.alternativeView ?? '',
    messageToSelf: note?.messageToSelf ?? '',
  })
  const [savedId, setSavedId] = useState<string | null>(note?.id ?? null)
  const [attachments, setAttachments] = useState<Attachment[]>(note?.attachments ?? [])
  const [interpretationOpen, setInterpretationOpen] = useState(true)
  const [alternativeOpen, setAlternativeOpen] = useState(true)
  const [messageOpen, setMessageOpen] = useState(true)

  useEffect(() => {
    if (!note) return
    setForm({
      emotion: note.emotion, actualEvent: note.actualEvent,
      myInterpretation: note.myInterpretation, alternativeView: note.alternativeView,
      messageToSelf: note.messageToSelf,
    })
    setAttachments(note.attachments ?? [])
    setSavedId(note.id)
  }, [note?.id])

  const save = useCallback((f: typeof form) => {
    if (!f.actualEvent.trim() && !f.emotion.trim()) return
    if (savedId) {
      const updated = emotionStore.update(savedId, f)
      if (updated) onSaved(updated)
    } else {
      const created = emotionStore.save({ ...f, attachments: [] })
      setSavedId(created.id)
      onSaved(created)
    }
  }, [savedId, onSaved])

  const handleAttachmentsChange = useCallback((newAtts: Attachment[]) => {
    setAttachments(newAtts)
    if (savedId) emotionStore.update(savedId, { attachments: newAtts })
  }, [savedId])

  const handleBlur = useCallback(() => save(form), [save, form])

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 md:px-16 md:py-16">
      <div className="flex justify-end mb-6">
        {savedId
          ? <button onClick={onDelete} className="text-xs text-gray-300 hover:text-red-400 transition-colors">삭제</button>
          : <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">취소</button>
        }
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {EMOTIONS.map(e => (
          <button key={e} type="button"
            onClick={() => { setForm(f => ({ ...f, emotion: e })); setTimeout(handleBlur, 0) }}
            className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
              form.emotion === e ? 'bg-pink-500 text-white border-pink-500' : 'bg-white text-gray-600 border-gray-200 hover:border-pink-200'
            }`}>
            {e}
          </button>
        ))}
      </div>

      <input value={form.emotion} onChange={e => setForm(f => ({ ...f, emotion: e.target.value }))} onBlur={handleBlur}
        placeholder="감정을 선택하거나 직접 입력..."
        className="w-full text-4xl font-bold text-gray-900 placeholder-gray-200 bg-transparent border-none outline-none leading-tight mb-8" />

      <AutoTextarea value={form.actualEvent} onChange={v => setForm(f => ({ ...f, actualEvent: v }))} onBlur={handleBlur}
        placeholder="실제로 일어난 일을 사실만 적어보세요"
        className="w-full text-base text-gray-800 placeholder-gray-300 bg-transparent border-none outline-none leading-relaxed mb-8" />

      <div className="border-t border-gray-100 pt-5 mb-6">
        <button onClick={() => setInterpretationOpen(o => !o)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 hover:text-gray-700 transition-colors w-full text-left">
          <span className={`transition-transform duration-150 text-gray-400 ${interpretationOpen ? 'rotate-90' : ''}`}>▶</span>
          내가 해석한 것
        </button>
        {interpretationOpen && (
          <AutoTextarea value={form.myInterpretation} onChange={v => setForm(f => ({ ...f, myInterpretation: v }))} onBlur={handleBlur}
            placeholder="나는 이 상황을 어떻게 해석했나요?"
            className="w-full text-base text-gray-700 placeholder-gray-300 bg-transparent border-none outline-none leading-relaxed" />
        )}
      </div>

      <div className="border-t border-gray-100 pt-5 mb-6">
        <button onClick={() => setAlternativeOpen(o => !o)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 hover:text-gray-700 transition-colors w-full text-left">
          <span className={`transition-transform duration-150 text-gray-400 ${alternativeOpen ? 'rotate-90' : ''}`}>▶</span>
          다른 해석
        </button>
        {alternativeOpen && (
          <AutoTextarea value={form.alternativeView} onChange={v => setForm(f => ({ ...f, alternativeView: v }))} onBlur={handleBlur}
            placeholder="만약 다른 방식으로 본다면?"
            className="w-full text-base text-gray-700 placeholder-gray-300 bg-transparent border-none outline-none leading-relaxed" />
        )}
      </div>

      <div className="border-t border-gray-100 pt-5">
        <button onClick={() => setMessageOpen(o => !o)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 hover:text-gray-700 transition-colors w-full text-left">
          <span className={`transition-transform duration-150 text-gray-400 ${messageOpen ? 'rotate-90' : ''}`}>▶</span>
          나에게 해줄 말
        </button>
        {messageOpen && (
          <AutoTextarea value={form.messageToSelf} onChange={v => setForm(f => ({ ...f, messageToSelf: v }))} onBlur={handleBlur}
            placeholder="지금 나에게 어떤 말을 해주고 싶나요?"
            className="w-full text-base text-gray-800 placeholder-gray-300 bg-transparent border-none outline-none leading-relaxed" />
        )}
      </div>

      <div className="border-t border-gray-100 pt-5 mt-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">📎 첨부 파일</p>
        <FileAttachments
          entityType="emotion"
          entityId={savedId}
          attachments={attachments}
          onChange={handleAttachmentsChange}
        />
      </div>
    </div>
  )
}
