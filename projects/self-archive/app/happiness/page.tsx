'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, PanelLeftClose, PanelLeftOpen, ChevronLeft } from 'lucide-react'
import { HappinessLog, Attachment } from '@/lib/types'
import { happinessStore } from '@/lib/store'
import { FileAttachments } from '@/components/FileAttachments'
import { useIsMobile } from '@/lib/useIsMobile'
import RichEditor from '@/components/RichEditor'

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
function stripHtml(html: string): string {
  if (!html || !html.startsWith('<')) return html
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
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

type Panel = { type: 'edit'; log?: HappinessLog } | { type: 'weekly' } | null

export default function HappinessPage() {
  const [logs, setLogs] = useState<HappinessLog[]>([])
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

  const load = useCallback(() => setLogs(happinessStore.getAll().reverse()), [])
  useEffect(() => { load() }, [load])

  const filtered = logs.filter(l =>
    matchSearch(l.happyMoment, search) ||
    matchSearch(stripHtml(l.memorableSentence ?? ''), search) ||
    l.tags.some(t => matchSearch(t, search))
  )
  const thisWeekLogs = logs.filter(log => {
    const diffDays = (Date.now() - new Date(log.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= 7
  })

  const activeLogId = panel?.type === 'edit' ? (panel.log?.id ?? null) : null

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
          <h1 className="text-sm font-bold text-gray-900">행복 기록</h1>
        </div>
        <div className="px-3 py-2 border-b border-gray-200">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {!search && thisWeekLogs.length > 0 && (
            <button onClick={() => { setPanel({ type: 'weekly' }); if (!isMobile) setSidebarOpen(true) }}
              className={`w-full text-left px-4 py-2.5 border-b border-gray-200 transition-colors ${
                panel?.type === 'weekly' ? 'bg-green-50 border-l-2 border-l-green-400' : 'hover:bg-gray-100'
              }`}>
              <p className="text-xs font-semibold text-green-600">📊 이번 주 리포트</p>
              <p className="text-xs text-gray-400 mt-0.5">{thisWeekLogs.length}개의 기록</p>
            </button>
          )}
          {filtered.map(log => {
            const sentenceText = stripHtml(log.memorableSentence ?? '')
            const msgText = stripHtml(log.messageToSelf ?? '')
            return (
              <button key={log.id}
                onClick={() => { setPanel({ type: 'edit', log }); if (!isMobile) setSidebarOpen(true) }}
                className={`w-full text-left px-4 py-2.5 border-b border-gray-100 transition-colors ${
                  activeLogId === log.id ? 'bg-green-50 border-l-2 border-l-green-400' : 'hover:bg-gray-100'
                }`}>
                <p className="text-xs font-medium text-gray-800 truncate mb-0.5">{log.happyMoment}</p>
                <p className="text-xs text-gray-400 truncate mb-1">
                  {new Date(log.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  {' · 🕒 '}{new Date(log.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {sentenceText && (
                  <p className="text-xs text-gray-500 truncate mb-0.5">
                    {sentenceText.length > 20 ? sentenceText.slice(0, 20) + '...' : sentenceText}
                  </p>
                )}
                {[
                  { label: '성취', val: log.achievement },
                  { label: '나에게', val: msgText },
                ].filter(f => f.val).map(({ label, val }) => (
                  <p key={label} className="text-xs text-gray-500 truncate mb-0.5">
                    <span className="text-gray-400">{label} </span>
                    {val!.length > 20 ? val!.slice(0, 20) + '...' : val}
                  </p>
                ))}
              </button>
            )
          })}
        </div>
        <div className="p-3 border-t border-gray-200">
          <button onClick={() => { setPanel({ type: 'edit' }); if (!isMobile) setSidebarOpen(true) }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              panel?.type === 'edit' && !panel.log ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-200'
            }`}>
            <Plus size={14} />행복 기록하기
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
          <HappinessEditor
            log={panel.log}
            onCancel={() => setPanel(null)}
            onDelete={() => { happinessStore.delete(panel.log!.id); load(); setPanel(null) }}
            onSaved={saved => { load(); setPanel({ type: 'edit', log: saved }) }}
          />
        )}
        {panel?.type === 'weekly' && <WeeklyReport logs={thisWeekLogs} />}
        {panel === null && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-4xl mb-4">🌟</p>
            <p className="text-gray-400 text-sm">행복했던 순간을 선택하거나 새로 기록해보세요</p>
          </div>
        )}
      </div>
    </div>
  )
}

function HappinessEditor({ log, onCancel, onDelete, onSaved }: {
  log?: HappinessLog
  onCancel: () => void
  onDelete: () => void
  onSaved: (l: HappinessLog) => void
}) {
  const [form, setForm] = useState({
    happyMoment: log?.happyMoment ?? '',
    food: log?.food ?? '',
    spending: log?.spending ?? '',
    memorableSentence: log?.memorableSentence ?? '',
    achievement: log?.achievement ?? '',
    messageToSelf: log?.messageToSelf ?? '',
    tags: log?.tags.join(', ') ?? '',
  })
  const [savedId, setSavedId] = useState<string | null>(log?.id ?? null)
  const [attachments, setAttachments] = useState<Attachment[]>(log?.attachments ?? [])
  const [achievementOpen, setAchievementOpen] = useState(true)
  const [messageOpen, setMessageOpen] = useState(true)

  useEffect(() => {
    if (!log) return
    setForm({
      happyMoment: log.happyMoment, food: log.food ?? '',
      spending: log.spending ?? '', memorableSentence: log.memorableSentence ?? '',
      achievement: log.achievement ?? '', messageToSelf: log.messageToSelf ?? '',
      tags: log.tags.join(', '),
    })
    setAttachments(log.attachments ?? [])
    setSavedId(log.id)
  }, [log?.id])

  const save = useCallback((f: typeof form) => {
    if (!f.happyMoment.trim()) return
    const data = { ...f, tags: f.tags.split(',').map(t => t.trim()).filter(Boolean) }
    if (savedId) {
      const updated = happinessStore.update(savedId, data)
      if (updated) onSaved(updated)
    } else {
      const created = happinessStore.save({ ...data, attachments: [] })
      setSavedId(created.id)
      onSaved(created)
    }
  }, [savedId, onSaved])

  const handleAttachmentsChange = useCallback((newAtts: Attachment[]) => {
    setAttachments(newAtts)
    if (savedId) happinessStore.update(savedId, { attachments: newAtts })
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

      <AutoTextarea value={form.happyMoment} onChange={v => setForm(f => ({ ...f, happyMoment: v }))} onBlur={handleBlur}
        placeholder="오늘 행복했던 순간"
        className="w-full text-4xl font-bold text-gray-900 placeholder-gray-200 bg-transparent border-none outline-none leading-tight mb-6" />

      <div className="space-y-2 mb-8">
        <div className="flex items-center gap-3">
          <span className="w-24 text-xs font-medium text-gray-400">🍽 음식</span>
          <input value={form.food} onChange={e => setForm(f => ({ ...f, food: e.target.value }))} onBlur={handleBlur}
            placeholder="기억에 남는 음식"
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-300" />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-24 text-xs font-medium text-gray-400">💰 소비</span>
          <input value={form.spending} onChange={e => setForm(f => ({ ...f, spending: e.target.value }))} onBlur={handleBlur}
            placeholder="좋은 소비"
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-300" />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-24 text-xs font-medium text-gray-400">🏷 태그</span>
          <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} onBlur={handleBlur}
            placeholder="여행, 음식, 성취"
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-300" />
        </div>
      </div>

      <div className="mb-8">
        <RichEditor value={form.memorableSentence} onChange={v => setForm(f => ({ ...f, memorableSentence: v }))} onBlur={handleBlur}
          placeholder="기억하고 싶은 문장..."
          className="text-base text-gray-700 leading-relaxed" />
      </div>

      <div className="border-t border-gray-100 pt-5 mb-6">
        <button onClick={() => setAchievementOpen(o => !o)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 hover:text-gray-700 transition-colors w-full text-left">
          <span className={`transition-transform duration-150 text-gray-400 ${achievementOpen ? 'rotate-90' : ''}`}>▶</span>
          이번의 성취
        </button>
        {achievementOpen && (
          <input value={form.achievement} onChange={e => setForm(f => ({ ...f, achievement: e.target.value }))} onBlur={handleBlur}
            placeholder="작은 성취도 좋아요"
            className="w-full text-base text-gray-700 placeholder-gray-300 bg-transparent border-none outline-none" />
        )}
      </div>

      <div className="border-t border-gray-100 pt-5">
        <button onClick={() => setMessageOpen(o => !o)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 hover:text-gray-700 transition-colors w-full text-left">
          <span className={`transition-transform duration-150 text-gray-400 ${messageOpen ? 'rotate-90' : ''}`}>▶</span>
          나에게 해주고 싶은 말
        </button>
        {messageOpen && (
          <RichEditor value={form.messageToSelf} onChange={v => setForm(f => ({ ...f, messageToSelf: v }))} onBlur={handleBlur}
            placeholder="오늘 하루 수고한 나에게..."
            className="text-base text-gray-800 leading-relaxed" />
        )}
      </div>

      <div className="border-t border-gray-100 pt-5 mt-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">📎 첨부 파일</p>
        <FileAttachments
          entityType="happiness"
          entityId={savedId}
          attachments={attachments}
          onChange={handleAttachmentsChange}
        />
      </div>
    </div>
  )
}

function WeeklyReport({ logs }: { logs: HappinessLog[] }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 md:px-16 md:py-16">
      <p className="text-4xl font-bold text-gray-900 mb-2">이번 주 행복 리포트</p>
      <p className="text-sm text-gray-400 mb-10">{logs.length}개의 기록</p>
      <div className="space-y-8">
        {[
          { label: '행복했던 순간들', emoji: '🌟', values: logs.map(l => l.happyMoment).filter(Boolean) },
          { label: '기억나는 음식', emoji: '🍽', values: logs.map(l => l.food).filter(Boolean) as string[] },
          { label: '좋은 소비', emoji: '💰', values: logs.map(l => l.spending).filter(Boolean) as string[] },
          { label: '이번 주 성취', emoji: '⭐', values: logs.map(l => l.achievement).filter(Boolean) as string[] },
          { label: '기억하고 싶은 문장들', emoji: '💬', values: logs.map(l => stripHtml(l.memorableSentence ?? '')).filter(Boolean) },
        ].filter(item => item.values.length > 0).map(item => (
          <div key={item.label}>
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-3">{item.emoji} {item.label}</p>
            <ul className="space-y-2">
              {item.values.map((v, i) => (
                <li key={i} className="text-base text-gray-700 leading-relaxed">— {v}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
