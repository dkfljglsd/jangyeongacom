'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, PanelLeftClose, PanelLeftOpen, ChevronLeft, X } from 'lucide-react'
import { WorkNote, WorkNoteStatus, Attachment } from '@/lib/types'
import { workNoteStore } from '@/lib/store'
import { FileAttachments } from '@/components/FileAttachments'
import { useIsMobile } from '@/lib/useIsMobile'
import RichEditor from '@/components/RichEditor'

const STATUS_STYLE: Record<WorkNoteStatus, string> = {
  '진행중': 'bg-blue-100 text-blue-700',
  '완료':   'bg-green-100 text-green-700',
  '보류':   'bg-gray-100 text-gray-500',
}

type Panel = { type: 'edit'; note?: WorkNote } | null

export default function WorkNotePage() {
  const [notes, setNotes] = useState<WorkNote[]>([])
  const [panel, setPanel] = useState<Panel>(null)
  const [editorKey, setEditorKey] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [isDragging, setIsDragging] = useState(false)
  const isMobile = useIsMobile()

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const startX = e.clientX, startW = sidebarWidth
    const onMove = (mv: MouseEvent) => setSidebarWidth(Math.max(180, Math.min(480, startW + mv.clientX - startX)))
    const onUp = () => { setIsDragging(false); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  const load = useCallback(() => setNotes(workNoteStore.getAll().reverse()), [])
  useEffect(() => { load() }, [load])

  const activeId = panel?.note?.id ?? null

  return (
    <div className="flex h-full relative">
      <button onClick={() => setSidebarOpen(o => !o)}
        className="hidden md:block absolute top-3 right-3 z-10 p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600">
        {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
      </button>

      {/* 사이드바 */}
      <div className={[
        'border-r border-gray-200 flex flex-col bg-gray-50 max-md:pb-16',
        !isDragging ? 'transition-all duration-200' : '',
        panel !== null ? 'max-md:hidden' : 'max-md:flex-1',
        !sidebarOpen ? 'md:flex-1' : 'md:flex-shrink-0',
      ].filter(Boolean).join(' ')}
        style={sidebarOpen && !isMobile ? { width: sidebarWidth } : undefined}>

        <div className="px-4 py-3 border-b border-gray-200">
          <h1 className="text-sm font-bold text-gray-900">업무 노트</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notes.map(note => (
            <div key={note.id} className={`relative group border-b border-gray-100 transition-colors ${
              activeId === note.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-100'
            }`}>
              <button
                onClick={() => { setPanel({ type: 'edit', note }); setEditorKey(note.id as unknown as number); if (!isMobile) setSidebarOpen(true) }}
                className="w-full text-left px-4 py-2.5 pr-8">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_STYLE[note.status]}`}>{note.status}</span>
                </div>
                <p className="text-xs font-medium text-gray-800 truncate mb-0.5">{note.title || '제목 없음'}</p>
                <p className="text-xs text-gray-400 truncate">
                  {new Date(note.updatedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  {note.dueDate && <span className="ml-1.5 text-orange-400">마감 {new Date(note.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>}
                </p>
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  workNoteStore.delete(note.id)
                  load()
                  if (activeId === note.id) setPanel(null)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          ))}
          {notes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-xs text-gray-400">업무 노트가 없습니다</p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-200">
          <button onClick={() => { setPanel({ type: 'edit' }); setEditorKey(k => k + 1); if (!isMobile) setSidebarOpen(true) }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              panel?.type === 'edit' && !panel.note ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-200'
            }`}>
            <Plus size={14} />업무 노트 추가
          </button>
        </div>
      </div>

      <div onMouseDown={sidebarOpen ? onDividerMouseDown : undefined}
        className={`hidden md:flex flex-shrink-0 ${sidebarOpen ? 'w-1 cursor-col-resize hover:bg-blue-200' : 'w-0'} ${isDragging ? 'bg-blue-300' : ''} transition-colors`} />

      {/* 본문 */}
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
          <WorkNoteEditor
            key={editorKey}
            note={panel.note}
            onCancel={() => setPanel(null)}
            onDelete={() => { workNoteStore.delete(panel.note!.id); load(); setPanel(null) }}
            onSaved={saved => { load(); setPanel({ type: 'edit', note: saved }) }}
          />
        )}
        {panel === null && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-gray-400 text-sm">업무 노트를 선택하거나 새로 추가해보세요</p>
          </div>
        )}
      </div>
    </div>
  )
}

function WorkNoteEditor({ note, onCancel, onDelete, onSaved }: {
  note?: WorkNote
  onCancel: () => void
  onDelete: () => void
  onSaved: (n: WorkNote) => void
}) {
  const [form, setForm] = useState({
    title: note?.title ?? '',
    status: note?.status ?? '진행중' as WorkNoteStatus,
    content: note?.content ?? '',
    dueDate: note?.dueDate ?? '',
  })
  const [savedId, setSavedId] = useState<string | null>(note?.id ?? null)
  const savedIdRef = useRef<string | null>(note?.id ?? null)
  const [attachments, setAttachments] = useState<Attachment[]>(note?.attachments ?? [])

  useEffect(() => {
    if (!note) return
    setForm({ title: note.title, status: note.status, content: note.content, dueDate: note.dueDate ?? '' })
    setAttachments(note.attachments ?? [])
    setSavedId(note.id)
    savedIdRef.current = note.id
  }, [note?.id])

  const save = useCallback((f: typeof form) => {
    if (!f.title.trim()) return
    const data = { ...f, category: '기타' as const, dueDate: f.dueDate || undefined, attachments }
    if (savedIdRef.current) {
      const updated = workNoteStore.update(savedIdRef.current, data)
      if (updated) onSaved(updated)
    } else {
      const created = workNoteStore.save(data)
      savedIdRef.current = created.id
      setSavedId(created.id)
      onSaved(created)
    }
  }, [attachments, onSaved])

  const handleBlur = useCallback(() => save(form), [save, form])

  const handleAttachmentsChange = useCallback((newAtts: Attachment[]) => {
    setAttachments(newAtts)
    if (savedIdRef.current) workNoteStore.update(savedIdRef.current, { attachments: newAtts })
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 md:px-16 md:py-16">
      <div className="flex justify-end mb-6">
        {savedId
          ? <button onClick={onDelete} className="text-xs text-gray-300 hover:text-red-400 transition-colors">삭제</button>
          : <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">취소</button>}
      </div>

      {/* 제목 */}
      <input
        value={form.title}
        onChange={e => {
          const newForm = { ...form, title: e.target.value }
          setForm(newForm)
          if (!savedIdRef.current && newForm.title.trim()) save(newForm)
        }}
        onBlur={handleBlur}
        placeholder="업무 제목"
        className="w-full text-4xl font-bold text-gray-900 placeholder-gray-200 bg-transparent border-none outline-none leading-tight mb-6"
      />

      {/* 내용 */}
      <div className="mb-8">
        <RichEditor
          value={form.content}
          onChange={v => setForm(f => ({ ...f, content: v }))}
          onBlur={handleBlur}
          placeholder="업무 내용, 처리 사항, 메모..."
          className="text-base text-gray-800 leading-relaxed"
        />
      </div>

      {/* 첨부 파일 */}
      <div className="border-t border-gray-100 pt-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">📎 첨부 파일</p>
        <FileAttachments
          entityType="worknote"
          entityId={savedId}
          attachments={attachments}
          onChange={handleAttachmentsChange}
        />
      </div>
    </div>
  )
}
