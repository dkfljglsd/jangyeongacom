'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, CheckSquare, Square, Trash2, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { TodoList } from '@/lib/types'
import { todoListStore } from '@/lib/store'

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
  if (!query) return true
  return decomposeHangul(text.toLowerCase()).includes(decomposeHangul(query.toLowerCase()))
}

export default function TodoPage() {
  const [lists, setLists] = useState<TodoList[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
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

  const load = useCallback(() => setLists(todoListStore.getAll().reverse()), [])
  useEffect(() => { load() }, [load])

  const filtered = lists.filter(l => matchSearch(l.title, search))
  const selectedList = lists.find(l => l.id === selectedId) ?? null

  const handleAddList = () => {
    const created = todoListStore.save('새 목록')
    load()
    setSelectedId(created.id)
    setSidebarOpen(true)
  }

  const handleUpdate = (updated: TodoList) => {
    load()
    setSelectedId(updated.id)
  }

  return (
    <div className="flex h-screen relative">
      <button onClick={() => setSidebarOpen(o => !o)}
        className="absolute top-3 right-3 z-10 p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600">
        {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
      </button>

      <div className={`border-r border-gray-200 flex flex-col bg-gray-50 flex-shrink-0 ${!isDragging ? 'transition-all duration-200' : ''} ${!sidebarOpen ? 'flex-1' : ''}`}
        style={sidebarOpen ? { width: sidebarWidth } : undefined}>
        <div className="px-4 py-3 border-b border-gray-200">
          <h1 className="text-sm font-bold text-gray-900">투두 리스트</h1>
        </div>
        <div className="px-3 py-2 border-b border-gray-200">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(list => {
            const doneCount = list.items.filter(i => i.done).length
            const total = list.items.length
            return (
              <button key={list.id}
                onClick={() => { setSelectedId(list.id); setSidebarOpen(true) }}
                className={`w-full text-left px-4 py-2.5 border-b border-gray-100 transition-colors ${
                  selectedId === list.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-100'
                }`}>
                <p className="text-xs font-medium text-gray-800 truncate mb-0.5">{list.title}</p>
                <p className="text-xs text-gray-400 truncate mb-0.5">
                  {new Date(list.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  {' · 🕒 '}{new Date(list.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {total > 0 && (
                  <p className="text-xs text-gray-400">{doneCount}/{total} 완료</p>
                )}
              </button>
            )
          })}
        </div>
        <div className="p-3 border-t border-gray-200">
          <button onClick={handleAddList}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-gray-600 hover:bg-gray-200">
            <Plus size={14} />새 목록 만들기
          </button>
        </div>
      </div>

      <div
        onMouseDown={sidebarOpen ? onDividerMouseDown : undefined}
        className={`flex-shrink-0 ${sidebarOpen ? 'w-1 cursor-col-resize hover:bg-blue-200' : 'w-0'} ${isDragging ? 'bg-blue-300' : ''} transition-colors`}
      />

      <div className={`overflow-y-auto transition-all duration-200 ${sidebarOpen ? 'flex-1' : 'w-0 overflow-hidden'}`}>
        {selectedList ? (
          <TodoEditor
            key={selectedList.id}
            list={selectedList}
            onUpdate={handleUpdate}
            onDelete={() => { todoListStore.delete(selectedList.id); load(); setSelectedId(null) }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-4xl mb-4">✅</p>
            <p className="text-gray-400 text-sm">목록을 선택하거나 새로 만들어보세요</p>
          </div>
        )}
      </div>
    </div>
  )
}

function TodoEditor({ list, onUpdate, onDelete }: {
  list: TodoList
  onUpdate: (l: TodoList) => void
  onDelete: () => void
}) {
  const [title, setTitle] = useState(list.title)
  const [newText, setNewText] = useState('')
  const [doneOpen, setDoneOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTitle(list.title) }, [list.id])

  const handleTitleBlur = () => {
    if (title.trim() && title !== list.title) {
      const updated = todoListStore.update(list.id, { title: title.trim() })
      if (updated) onUpdate(updated)
    }
  }

  const handleAddItem = () => {
    if (!newText.trim()) return
    const updated = todoListStore.addItem(list.id, newText.trim())
    if (updated) onUpdate(updated)
    setNewText('')
    inputRef.current?.focus()
  }

  const pending = list.items.filter(i => !i.done)
  const done = list.items.filter(i => i.done)

  return (
    <div className="max-w-3xl mx-auto px-16 py-16">
      <div className="flex justify-end mb-6">
        <button onClick={onDelete} className="text-xs text-gray-300 hover:text-red-400 transition-colors">삭제</button>
      </div>

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
        placeholder="목록 이름"
        className="w-full text-4xl font-bold text-gray-900 placeholder-gray-200 bg-transparent border-none outline-none leading-tight mb-10"
      />

      <div className="space-y-1 mb-4">
        {pending.map(item => (
          <div key={item.id} className="flex items-center gap-3 group py-1.5">
            <button onClick={() => { const u = todoListStore.toggleItem(list.id, item.id); if (u) onUpdate(u) }} className="flex-shrink-0">
              <Square size={16} className="text-gray-300 hover:text-blue-400 transition-colors" />
            </button>
            <span className="flex-1 text-base text-gray-700">{item.text}</span>
            <button onClick={() => { const u = todoListStore.deleteItem(list.id, item.id); if (u) onUpdate(u) }}
              className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 size={13} className="text-gray-300 hover:text-red-400 transition-colors" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-10">
        <Plus size={16} className="text-gray-300 flex-shrink-0" />
        <input
          ref={inputRef}
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleAddItem()}
          placeholder="할 일 추가..."
          className="flex-1 text-base text-gray-700 placeholder-gray-300 bg-transparent border-none outline-none"
        />
      </div>

      {done.length > 0 && (
        <div className="border-t border-gray-100 pt-5">
          <button onClick={() => setDoneOpen(o => !o)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 hover:text-gray-600 transition-colors w-full text-left">
            <span className={`transition-transform duration-150 text-gray-300 ${doneOpen ? 'rotate-90' : ''}`}>▶</span>
            완료 {done.length}개
          </button>
          {doneOpen && (
            <div className="space-y-1">
              {done.map(item => (
                <div key={item.id} className="flex items-center gap-3 group py-1.5">
                  <button onClick={() => { const u = todoListStore.toggleItem(list.id, item.id); if (u) onUpdate(u) }} className="flex-shrink-0">
                    <CheckSquare size={16} className="text-blue-400" />
                  </button>
                  <span className="flex-1 text-base text-gray-300 line-through">{item.text}</span>
                  <button onClick={() => { const u = todoListStore.deleteItem(list.id, item.id); if (u) onUpdate(u) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={13} className="text-gray-300 hover:text-red-400 transition-colors" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
