'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { ThoughtMemo, Attachment } from '@/lib/types'
import { thoughtStore } from '@/lib/store'
import { FileAttachments } from '@/components/FileAttachments'

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

type Panel = { type: 'edit'; memo?: ThoughtMemo } | null

const emptyForm = { thought: '', summary: '', why: '', howToApply: '', oneSentence: '', tags: '' }

export default function ThoughtMemoPage() {
  const [memos, setMemos] = useState<ThoughtMemo[]>([])
  const [panel, setPanel] = useState<Panel>(null)
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(224)
  const [isDragging, setIsDragging] = useState(false)
  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const startX = e.clientX, startW = sidebarWidth
    const onMove = (mv: MouseEvent) => setSidebarWidth(Math.max(160, Math.min(480, startW + mv.clientX - startX)))
    const onUp = () => { setIsDragging(false); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  const load = useCallback(() => setMemos(thoughtStore.getAll().reverse()), [])
  useEffect(() => { load() }, [load])

  const filtered = memos.filter(m =>
    matchSearch(m.thought, search) ||
    matchSearch(m.summary, search) ||
    m.tags.some(t => matchSearch(t, search))
  )
  const activeMemoId = panel?.memo?.id ?? null

  return (
    <div className="flex h-screen relative">
      <button onClick={() => setSidebarOpen(o => !o)}
        className="absolute top-3 right-3 z-10 p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600">
        {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
      </button>

      <div className={`border-r border-gray-200 flex flex-col bg-gray-50 flex-shrink-0 ${!isDragging ? 'transition-all duration-200' : ''} ${!sidebarOpen ? 'flex-1' : ''}`}
        style={sidebarOpen ? { width: sidebarWidth } : undefined}>
        <div className="px-4 py-3 border-b border-gray-200">
          <h1 className="text-sm font-bold text-gray-900">생각 메모</h1>
        </div>
        <div className="px-3 py-2 border-b border-gray-200">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(memo => (
            <button key={memo.id}
              onClick={() => { setPanel({ type: 'edit', memo }); setSidebarOpen(true) }}
              className={`w-full text-left px-4 py-2.5 border-b border-gray-100 transition-colors ${
                activeMemoId === memo.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-100'
              }`}>
              <p className="text-xs font-medium text-gray-800 truncate mb-0.5">{memo.thought}</p>
              <p className="text-xs text-gray-400 truncate mb-1">
                {new Date(memo.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                {' · 🕒 '}{new Date(memo.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              {memo.summary && (
                <p className="text-xs text-gray-500 truncate mb-0.5">
                  {memo.summary.length > 20 ? memo.summary.slice(0, 20) + '...' : memo.summary}
                </p>
              )}
              {[
                { label: '왜', val: memo.why },
                { label: '적용', val: memo.howToApply },
                { label: '한문장', val: memo.oneSentence },
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
          <button onClick={() => { setPanel({ type: 'edit' }); setSidebarOpen(true) }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              panel?.type === 'edit' && !panel.memo ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-200'
            }`}>
            <Plus size={14} />새 생각 기록
          </button>
        </div>
      </div>

      <div
        onMouseDown={sidebarOpen ? onDividerMouseDown : undefined}
        className={`flex-shrink-0 ${sidebarOpen ? 'w-1 cursor-col-resize hover:bg-blue-200' : 'w-0'} ${isDragging ? 'bg-blue-300' : ''} transition-colors`}
      />
      <div className={`overflow-y-auto transition-all duration-200 ${sidebarOpen ? 'flex-1' : 'w-0 overflow-hidden'}`}>
        {panel?.type === 'edit' && (
          <MemoEditor
            memo={panel.memo}
            onCancel={() => setPanel(null)}
            onDelete={() => { thoughtStore.delete(panel.memo!.id); load(); setPanel(null) }}
            onSaved={saved => { load(); setPanel({ type: 'edit', memo: saved }) }}
          />
        )}
        {panel === null && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-4xl mb-4">💡</p>
            <p className="text-gray-400 text-sm">생각을 선택하거나 새로 기록해보세요</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MemoEditor({ memo, onCancel, onDelete, onSaved }: {
  memo?: ThoughtMemo
  onCancel: () => void
  onDelete: () => void
  onSaved: (m: ThoughtMemo) => void
}) {
  const [form, setForm] = useState({
    thought: memo?.thought ?? '',
    summary: memo?.summary ?? '',
    why: memo?.why ?? '',
    howToApply: memo?.howToApply ?? '',
    oneSentence: memo?.oneSentence ?? '',
    tags: memo?.tags.join(', ') ?? '',
  })
  const [savedId, setSavedId] = useState<string | null>(memo?.id ?? null)
  const [attachments, setAttachments] = useState<Attachment[]>(memo?.attachments ?? [])
  const [whyOpen, setWhyOpen] = useState(true)
  const [howToApplyOpen, setHowToApplyOpen] = useState(true)
  const [oneSentenceOpen, setOneSentenceOpen] = useState(true)

  useEffect(() => {
    if (!memo) return
    setForm({
      thought: memo.thought, summary: memo.summary, why: memo.why,
      howToApply: memo.howToApply, oneSentence: memo.oneSentence,
      tags: memo.tags.join(', '),
    })
    setAttachments(memo.attachments ?? [])
    setSavedId(memo.id)
  }, [memo?.id])

  const save = useCallback((f: typeof form) => {
    if (!f.thought.trim()) return
    const data = { ...f, tags: f.tags.split(',').map(t => t.trim()).filter(Boolean) }
    if (savedId) {
      const updated = thoughtStore.update(savedId, data)
      if (updated) onSaved(updated)
    } else {
      const created = thoughtStore.save({ ...data, attachments: [] })
      setSavedId(created.id)
      onSaved(created)
    }
  }, [savedId, onSaved])

  const handleAttachmentsChange = useCallback((newAtts: Attachment[]) => {
    setAttachments(newAtts)
    if (savedId) thoughtStore.update(savedId, { attachments: newAtts })
  }, [savedId])

  const handleBlur = useCallback(() => save(form), [save, form])

  return (
    <div className="max-w-3xl mx-auto px-16 py-16">
      <div className="flex justify-end mb-6">
        {savedId
          ? <button onClick={onDelete} className="text-xs text-gray-300 hover:text-red-400 transition-colors">삭제</button>
          : <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">취소</button>
        }
      </div>

      <AutoTextarea value={form.thought} onChange={v => setForm(f => ({ ...f, thought: v }))} onBlur={handleBlur}
        placeholder="오늘 떠오른 생각"
        className="w-full text-4xl font-bold text-gray-900 placeholder-gray-200 bg-transparent border-none outline-none leading-tight mb-6" />

      <AutoTextarea value={form.summary} onChange={v => setForm(f => ({ ...f, summary: v }))} onBlur={handleBlur}
        placeholder="내 언어로 다시 써보세요..."
        className="w-full text-base text-gray-800 placeholder-gray-300 bg-transparent border-none outline-none leading-relaxed mb-8" />

      <div className="border-t border-gray-100 pt-5 mb-6">
        <button onClick={() => setWhyOpen(o => !o)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 hover:text-gray-700 transition-colors w-full text-left">
          <span className={`transition-transform duration-150 text-gray-400 ${whyOpen ? 'rotate-90' : ''}`}>▶</span>
          왜 이런 생각을 했나?
        </button>
        {whyOpen && (
          <AutoTextarea value={form.why} onChange={v => setForm(f => ({ ...f, why: v }))} onBlur={handleBlur}
            placeholder="질문의 크기가 생각의 크기를 결정합니다"
            className="w-full text-base text-gray-700 placeholder-gray-300 bg-transparent border-none outline-none leading-relaxed" />
        )}
      </div>

      <div className="border-t border-gray-100 pt-5 mb-6">
        <button onClick={() => setHowToApplyOpen(o => !o)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 hover:text-gray-700 transition-colors w-full text-left">
          <span className={`transition-transform duration-150 text-gray-400 ${howToApplyOpen ? 'rotate-90' : ''}`}>▶</span>
          어떻게 적용할까?
        </button>
        {howToApplyOpen && (
          <AutoTextarea value={form.howToApply} onChange={v => setForm(f => ({ ...f, howToApply: v }))} onBlur={handleBlur}
            placeholder="구체적인 행동으로 연결해보세요"
            className="w-full text-base text-gray-700 placeholder-gray-300 bg-transparent border-none outline-none leading-relaxed" />
        )}
      </div>

      <div className="border-t border-gray-100 pt-5 mb-6">
        <button onClick={() => setOneSentenceOpen(o => !o)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 hover:text-gray-700 transition-colors w-full text-left">
          <span className={`transition-transform duration-150 text-gray-400 ${oneSentenceOpen ? 'rotate-90' : ''}`}>▶</span>
          한 문장으로
        </button>
        {oneSentenceOpen && (
          <AutoTextarea value={form.oneSentence} onChange={v => setForm(f => ({ ...f, oneSentence: v }))} onBlur={handleBlur}
            placeholder="극단적으로 압축해보세요"
            className="w-full text-base font-medium text-gray-900 placeholder-gray-300 bg-transparent border-none outline-none leading-relaxed" />
        )}
      </div>

      <div className="border-t border-gray-100 pt-5">
        <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} onBlur={handleBlur}
          placeholder="태그 (쉼표로 구분)"
          className="w-full text-sm text-gray-400 placeholder-gray-300 bg-transparent border-none outline-none" />
      </div>

      <div className="border-t border-gray-100 pt-5 mt-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">📎 첨부 파일</p>
        <FileAttachments
          entityType="thought"
          entityId={savedId}
          attachments={attachments}
          onChange={handleAttachmentsChange}
        />
      </div>
    </div>
  )
}
