'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, CheckSquare, Square } from 'lucide-react'
import { ResearchNote } from '@/lib/types'
import { researchNoteStore } from '@/lib/store'

const empty = { title: '', projectId: '', content: '', ideas: '', references: '', todoText: '' }
const ACTIVE_NOTE_KEY = 'research_active_note_id'

export default function ResearchNotesPage() {
  const [notes, setNotes] = useState<ResearchNote[]>([])
  const [activeNote, setActiveNote] = useState<ResearchNote | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [newTodo, setNewTodo] = useState('')
  const [loading, setLoading] = useState(true)

  const selectNote = useCallback((note: ResearchNote) => {
    setActiveNote(note)
    localStorage.setItem(ACTIVE_NOTE_KEY, note.id)
  }, [])

  const load = useCallback(async () => {
    const all = (await researchNoteStore.getAll()).slice().reverse()
    setNotes(all)
    if (all.length > 0) {
      const savedId = localStorage.getItem(ACTIVE_NOTE_KEY)
      const toRestore = savedId ? all.find(n => n.id === savedId) : null
      setActiveNote(prev => prev ?? toRestore ?? all[0])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const saved = await researchNoteStore.save({
      title: form.title,
      projectId: form.projectId,
      content: form.content,
      ideas: form.ideas.split('\n').filter(Boolean),
      references: form.references.split('\n').filter(Boolean),
      todoItems: [],
    })
    setForm(empty)
    setShowForm(false)
    await load()
    setActiveNote(saved)
  }

  const toggleTodo = async (noteId: string, todoId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    const updated = note.todoItems.map(t => t.id === todoId ? { ...t, done: !t.done } : t)
    const result = await researchNoteStore.update(noteId, { todoItems: updated })
    if (result) {
      await load()
      setActiveNote(result)
    }
  }

  const addTodo = async (noteId: string) => {
    if (!newTodo.trim()) return
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    const todoItem = { id: Math.random().toString(36).substr(2, 9), text: newTodo.trim(), done: false }
    const result = await researchNoteStore.update(noteId, { todoItems: [...note.todoItems, todoItem] })
    if (result) {
      await load()
      setActiveNote(result)
    }
    setNewTodo('')
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar list */}
      <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-base font-bold text-gray-900">연구 노트</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-gray-400 p-4">불러오는 중...</p>
          ) : (
            notes.map(note => (
              <button
                key={note.id}
                onClick={() => selectNote(note)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                  activeNote?.id === note.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-100'
                }`}
              >
                <p className="text-sm font-medium text-gray-800 truncate">{note.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(note.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </p>
              </button>
            ))
          )}
        </div>
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Plus size={14} />
            연구 노트 추가
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">새 연구 노트</h2>
                <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className={labelClass}>제목 *</label>
                  <input required value={form.title} onChange={set('title')} placeholder="연구 노트 제목"
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>연구 프로젝트</label>
                  <input value={form.projectId} onChange={set('projectId')} placeholder="예: 딥러닝 의료영상 AI 프로젝트"
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>내용</label>
                  <textarea value={form.content} onChange={set('content')} rows={4}
                    placeholder="연구 내용을 자유롭게 작성하세요" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>아이디어 (줄바꿈으로 구분)</label>
                  <textarea value={form.ideas} onChange={set('ideas')} rows={3}
                    placeholder="떠오른 아이디어를 적어보세요" className={inputClass} />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                    취소
                  </button>
                  <button type="submit"
                    className="flex-1 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700">
                    저장
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeNote ? (
          <>
            {/* 스크롤 영역: 노트 내용 + 투두 체크박스 */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-8 max-w-3xl mx-auto">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{activeNote.title}</h2>
                    {activeNote.projectId && (
                      <p className="text-sm text-gray-500 mt-1">📁 {activeNote.projectId}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(activeNote.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={async () => { await researchNoteStore.delete(activeNote.id); setActiveNote(null); localStorage.removeItem(ACTIVE_NOTE_KEY); await load() }}
                    className="p-1.5 rounded hover:bg-red-50 transition-colors"
                  >
                    <X size={16} className="text-gray-400 hover:text-red-400" />
                  </button>
                </div>

                {activeNote.content && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">내용</p>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{activeNote.content}</p>
                    </div>
                  </div>
                )}

                {activeNote.ideas.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">💡 아이디어</p>
                    <ul className="space-y-2">
                      {activeNote.ideas.map((idea, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-purple-400 mt-0.5">▪</span>
                          {idea}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeNote.todoItems.length > 0 && (
                  <div className="pb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">✅ 투두리스트</p>
                    <div className="space-y-2">
                      {activeNote.todoItems.map(todo => (
                        <div key={todo.id} className="flex items-center gap-2">
                          <button onClick={() => toggleTodo(activeNote.id, todo.id)} className="flex-shrink-0">
                            {todo.done
                              ? <CheckSquare size={16} className="text-blue-500" />
                              : <Square size={16} className="text-gray-400" />
                            }
                          </button>
                          <span className={`text-sm ${todo.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {todo.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 할 일 입력창 - 하단 고정 (스크롤 영역 밖) */}
            <div className="flex-shrink-0 border-t border-gray-100 px-8 py-3 bg-white">
              <div className="max-w-3xl mx-auto">
                {activeNote.todoItems.length === 0 && (
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">✅ 투두리스트</p>
                )}
                <div className="flex gap-2">
                  <input
                    value={newTodo}
                    onChange={e => setNewTodo(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTodo(activeNote.id))}
                    placeholder="할 일 추가..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 bg-gray-50"
                  />
                  <button
                    onClick={() => addTodo(activeNote.id)}
                    className="px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <p className="text-4xl mb-4">📝</p>
            <p className="text-gray-500 font-medium">연구 노트를 선택하거나 새로 만들어보세요</p>
          </div>
        )}
      </div>
    </div>
  )
}

const labelClass = 'block text-xs font-medium text-gray-600 mb-1'
const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 bg-gray-50 transition-colors'
