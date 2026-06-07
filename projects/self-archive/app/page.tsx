'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Brain, Heart, Smile, BookOpen, FileText, CheckSquare, Square } from 'lucide-react'
import { TodoList } from '@/lib/types'
import { todoListStore } from '@/lib/store'

const cards = [
  { href: '/thought-memo', icon: Brain, title: '생각 메모', desc: '내가 이해한 것, 떠오른 생각 기록' },
  { href: '/emotion-note', icon: Heart, title: '감정 분리 노트', desc: '감정을 사실과 분리해서 기록' },
  { href: '/research-notes', icon: FileText, title: '연구 노트', desc: '연구 프로젝트와 미팅 노트 관리' },
  { href: '/paper-archive', icon: BookOpen, title: '문헌 아카이브', desc: '읽은 논문과 책을 자기화해서 정리' },
  { href: '/happiness', icon: Smile, title: '행복 기록', desc: '오늘 좋았던 순간, 음식, 문장 저장' },
  { href: '/todo', icon: CheckSquare, title: '투두 리스트', desc: '할 일을 목록으로 정리하고 체크' },
]

export default function Home() {
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  const [lists, setLists] = useState<TodoList[]>([])

  const load = useCallback(() => setLists(todoListStore.getAll()), [])
  useEffect(() => { load() }, [load])

  const handleToggle = (listId: string, itemId: string) => {
    todoListStore.toggleItem(listId, itemId)
    load()
  }

  const listsWithItems = lists.filter(l => l.items.length > 0)
  const totalPending = lists.reduce((acc, l) => acc + l.items.filter(i => !i.done).length, 0)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-10 pt-16 pb-40 md:pb-16">
      <div className="w-full max-w-2xl">
        <div className="mb-12">
          <p className="text-xs text-gray-400 mb-2">{today}</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">나를 모으는 곳</h1>
          <p className="text-sm text-gray-400">오늘 무엇을 기록할까요?</p>
        </div>

        {listsWithItems.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                할 일 {totalPending > 0 ? `${totalPending}개 남음` : '모두 완료 ✓'}
              </p>
              <Link href="/todo" className="text-xs text-gray-300 hover:text-gray-500 transition-colors">전체 보기 →</Link>
            </div>
            <div className="space-y-3">
              {listsWithItems.map(list => (
                <div key={list.id}>
                  <p className="text-xs text-gray-300 mb-1.5 px-1">{list.title}</p>
                  <div className="space-y-0.5">
                    {list.items.map(item => (
                      <div key={item.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer"
                        onClick={() => handleToggle(list.id, item.id)}>
                        {item.done
                          ? <CheckSquare size={15} className="text-blue-400 flex-shrink-0" />
                          : <Square size={15} className="text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                        }
                        <span className={`text-sm transition-colors ${item.done ? 'text-gray-300 line-through' : 'text-gray-700'}`}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Link key={card.href} href={card.href}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 group-hover:bg-gray-200 transition-colors flex-shrink-0">
                  <Icon size={16} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{card.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.desc}</p>
                </div>
                <span className="text-gray-200 group-hover:text-gray-400 transition-colors text-sm">→</span>
              </Link>
            )
          })}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <p className="text-xs text-gray-300 mb-1.5">기록의 핵심 질문</p>
          <p className="text-base font-medium text-gray-600">이걸 통해 내가 얻은 한 문장은?</p>
        </div>
      </div>
    </div>
  )
}
