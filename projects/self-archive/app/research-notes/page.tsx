'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, CheckSquare, Square, PanelLeftClose, PanelLeftOpen, ChevronLeft } from 'lucide-react'
import { ResearchNote, Attachment } from '@/lib/types'
import { researchNoteStore } from '@/lib/store'
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

type RightPanel = { type: 'edit'; note?: ResearchNote } | null

function AutoTextarea({
  value, onChange, onBlur, placeholder, className,
}: {
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      rows={1}
      className={className}
      style={{ resize: 'none', overflow: 'hidden' }}
    />
  )
}

export default function ResearchNotesPage() {
  const [notes, setNotes] = useState<ResearchNote[]>([])
  const [panel, setPanel] = useState<RightPanel>(null)
  const [search, setSearch] = useState('')
  const [newTodo, setNewTodo] = useState('')
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

  const load = useCallback(() => setNotes(researchNoteStore.getAll().reverse()), [])
  useEffect(() => { load() }, [load])

  const toggleTodo = (noteId: string, todoId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    const updated = note.todoItems.map(t => t.id === todoId ? { ...t, done: !t.done } : t)
    const result = researchNoteStore.update(noteId, { todoItems: updated })
    if (result) { load(); setPanel({ type: 'edit', note: result }) }
  }

  const addTodo = (noteId: string) => {
    if (!newTodo.trim()) return
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    const item = { id: Math.random().toString(36).substr(2, 9), text: newTodo.trim(), done: false }
    const result = researchNoteStore.update(noteId, { todoItems: [...note.todoItems, item] })
    if (result) { load(); setPanel({ type: 'edit', note: result }) }
    setNewTodo('')
  }

  const filtered = notes.filter(n =>
    matchSearch(n.title, search) ||
    matchSearch(n.content, search) ||
    matchSearch(n.projectId, search)
  )
  const activeNoteId = panel?.note?.id ?? null

  return (
    <div className="flex h-full relative">
      <button
        onClick={() => setSidebarOpen(o => !o)}
        className="hidden md:block absolute top-3 right-3 z-10 p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
      >
        {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
      </button>

      {/* List panel */}
      <div className={[
        'border-r border-gray-200 flex flex-col bg-gray-50 max-md:pb-16',
        !isDragging ? 'transition-all duration-200' : '',
        panel !== null ? 'max-md:hidden' : 'max-md:flex-1',
        !sidebarOpen ? 'md:flex-1' : 'md:flex-shrink-0',
      ].filter(Boolean).join(' ')}
        style={sidebarOpen && !isMobile ? { width: sidebarWidth } : undefined}>
        <div className="flex items-center px-4 py-3 border-b border-gray-200">
          <h1 className="text-sm font-bold text-gray-900">연구 노트</h1>
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
            <button
              key={note.id}
              onClick={() => { setPanel({ type: 'edit', note }); if (!isMobile) setSidebarOpen(true) }}
              className={`w-full text-left px-4 py-2.5 border-b border-gray-100 transition-colors ${
                activeNoteId === note.id
                  ? 'bg-blue-50 border-l-2 border-l-blue-500'
                  : 'hover:bg-gray-100'
              }`}
            >
              <p className="text-xs font-medium text-gray-800 truncate mb-0.5">{note.title}</p>
              <p className="text-xs text-gray-400 truncate mb-1">
                {new Date(note.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                {' · 🕒 '}{new Date(note.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              {note.content && (
                <p className="text-xs text-gray-500 truncate mb-0.5">
                  {note.content.length > 20 ? note.content.slice(0, 20) + '...' : note.content}
                </p>
              )}
              {note.ideas.length > 0 && (
                <p className="text-xs text-gray-500 truncate mb-0.5">
                  <span className="text-gray-400">아이디어 </span>
                  {note.ideas[0].length > 20 ? note.ideas[0].slice(0, 20) + '...' : note.ideas[0]}
                </p>
              )}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-gray-200">
          <button
            onClick={() => { setPanel({ type: 'edit' }); if (!isMobile) setSidebarOpen(true) }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              panel?.type === 'edit' && !panel.note
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Plus size={14} />
            연구 노트 추가
          </button>
        </div>
      </div>

      <div onMouseDown={sidebarOpen ? onDividerMouseDown : undefined}
        className={`hidden md:flex flex-shrink-0 ${sidebarOpen ? 'w-1 cursor-col-resize hover:bg-blue-200' : 'w-0'} ${isDragging ? 'bg-blue-300' : ''} transition-colors`}
      />

      {/* Editor panel */}
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
          <NoteEditor
            note={panel.note}
            onCancel={() => setPanel(null)}
            onDelete={() => { researchNoteStore.delete(panel.note!.id); load(); setPanel(null) }}
            onSaved={saved => { load(); setPanel({ type: 'edit', note: saved }) }}
            newTodo={newTodo}
            setNewTodo={setNewTodo}
            onToggleTodo={toggleTodo}
            onAddTodo={addTodo}
          />
        )}
        {panel === null && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-4xl mb-4">📝</p>
            <p className="text-gray-400 text-sm">연구 노트를 선택하거나 새로 만들어보세요</p>
          </div>
        )}
      </div>
    </div>
  )
}

function NoteEditor({
  note, onCancel, onDelete, onSaved, newTodo, setNewTodo, onToggleTodo, onAddTodo,
}: {
  note?: ResearchNote
  onCancel: () => void
  onDelete: () => void
  onSaved: (n: ResearchNote) => void
  newTodo: string
  setNewTodo: (v: string) => void
  onToggleTodo: (noteId: string, todoId: string) => void
  onAddTodo: (noteId: string) => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [title, setTitle] = useState(note?.title ?? '')
  const [noteDate, setNoteDate] = useState(note?.noteDate ?? today)
  const [projectId, setProjectId] = useState(note?.projectId ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [ideas, setIdeas] = useState(note?.ideas.join('\n') ?? '')
  const [ideasOpen, setIdeasOpen] = useState(true)
  const [todoOpen, setTodoOpen] = useState(true)
  const [savedId, setSavedId] = useState<string | null>(note?.id ?? null)
  const [attachments, setAttachments] = useState<Attachment[]>(note?.attachments ?? [])

  useEffect(() => {
    if (!note) return
    setTitle(note.title)
    setNoteDate(note.noteDate ?? today)
    setProjectId(note.projectId)
    setContent(note.content)
    setIdeas(note.ideas.join('\n'))
    setAttachments(note.attachments ?? [])
    setSavedId(note.id)
  }, [note?.id])

  const save = useCallback((t: string, nd: string, pid: string, c: string, id: string) => {
    if (!t.trim()) return
    if (savedId) {
      const updated = researchNoteStore.update(savedId, {
        title: t, noteDate: nd, projectId: pid, content: c,
        ideas: id.split('\n').filter(Boolean),
      })
      if (updated) onSaved(updated)
    } else {
      const created = researchNoteStore.save({
        title: t, projectId: pid, noteDate: nd, content: c,
        ideas: id.split('\n').filter(Boolean),
        references: [], todoItems: [],
      })
      setSavedId(created.id)
      onSaved(created)
    }
  }, [savedId, onSaved])

  const handleBlur = useCallback(() => save(title, noteDate, projectId, content, ideas),
    [save, title, noteDate, projectId, content, ideas])

  const handleAttachmentsChange = useCallback((newAtts: Attachment[]) => {
    setAttachments(newAtts)
    if (savedId) researchNoteStore.update(savedId, { attachments: newAtts })
  }, [savedId])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:px-16 md:py-16">
      <div className="flex items-center justify-end mb-6">
        {savedId
          ? <button onClick={onDelete} className="text-xs text-gray-300 hover:text-red-400 transition-colors">삭제</button>
          : <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">취소</button>
        }
      </div>

      <AutoTextarea
        value={title}
        onChange={setTitle}
        onBlur={handleBlur}
        placeholder="제목"
        className="w-full text-4xl font-bold text-gray-900 placeholder-gray-200 bg-transparent border-none outline-none leading-tight mb-6"
      />

      <div className="space-y-2 mb-8">
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <span className="w-24 text-gray-500 text-xs font-medium">📅 날짜</span>
          <input
            type="date"
            value={noteDate}
            onChange={e => setNoteDate(e.target.value)}
            onBlur={handleBlur}
            className="bg-transparent border-none outline-none text-sm text-gray-700"
          />
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <span className="w-24 text-gray-500 text-xs font-medium">📁 프로젝트</span>
          <input
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            onBlur={handleBlur}
            placeholder="연구 프로젝트 이름"
            className="bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-300"
          />
        </div>
      </div>

      <AutoTextarea
        value={content}
        onChange={setContent}
        onBlur={handleBlur}
        placeholder="내용을 자유롭게 작성하세요..."
        className="w-full text-base text-gray-800 placeholder-gray-300 bg-transparent border-none outline-none leading-relaxed mb-8"
      />

      {/* Ideas */}
      <div className="border-t border-gray-100 pt-5 mb-6">
        <button
          onClick={() => setIdeasOpen(o => !o)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 hover:text-gray-700 transition-colors w-full text-left"
        >
          <span className={`transition-transform duration-150 text-gray-400 ${ideasOpen ? 'rotate-90' : ''}`}>▶</span>
          💡 아이디어
        </button>
        {ideasOpen && (
          <AutoTextarea
            value={ideas}
            onChange={setIdeas}
            onBlur={handleBlur}
            placeholder="떠오른 아이디어를 적어보세요 (줄바꿈으로 구분)"
            className="w-full text-base text-gray-700 placeholder-gray-300 bg-transparent border-none outline-none leading-relaxed"
          />
        )}
      </div>

      {/* Todo */}
      <div className="border-t border-gray-100 pt-5">
        <button
          onClick={() => setTodoOpen(o => !o)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 hover:text-gray-700 transition-colors w-full text-left"
        >
          <span className={`transition-transform duration-150 text-gray-400 ${todoOpen ? 'rotate-90' : ''}`}>▶</span>
          ✅ 투두
        </button>
        {todoOpen && (
          <>
            <div className="space-y-2 mb-4">
              {(note?.todoItems ?? []).map(todo => (
                <div key={todo.id} className="flex items-center gap-2">
                  <button onClick={() => savedId && onToggleTodo(savedId, todo.id)} className="flex-shrink-0">
                    {todo.done
                      ? <CheckSquare size={16} className="text-blue-400" />
                      : <Square size={16} className="text-gray-300" />
                    }
                  </button>
                  <span className={`text-base ${todo.done ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                    {todo.text}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-gray-300" />
              <input
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && savedId && (e.preventDefault(), onAddTodo(savedId))}
                placeholder="할 일 추가..."
                className="flex-1 bg-transparent border-none outline-none text-base text-gray-700 placeholder-gray-300"
              />
            </div>
          </>
        )}
      </div>

      <div className="border-t border-gray-100 pt-5 mt-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">📎 첨부 파일</p>
        <FileAttachments
          entityType="research"
          entityId={savedId}
          attachments={attachments}
          onChange={handleAttachmentsChange}
        />
      </div>
    </div>
  )
}
