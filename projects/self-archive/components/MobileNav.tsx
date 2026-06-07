'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Layout, Brain, FileText, BookOpen, Heart, Smile,
  Tag, CheckSquare, Calendar, Menu, X, ChevronLeft,
} from 'lucide-react'

const bottomItems = [
  { href: '/', label: '홈', icon: Layout },
  { href: '/thought-memo', label: '생각', icon: Brain },
  { href: '/research-notes', label: '연구', icon: FileText },
  { href: '/paper-archive', label: '문헌', icon: BookOpen },
]

const allItems = [
  { href: '/', label: '홈', icon: Layout },
  { href: '/research-notes', label: '연구 노트', icon: FileText },
  { href: '/paper-archive', label: '문헌 아카이브', icon: BookOpen },
  { href: '/thought-memo', label: '생각 메모', icon: Brain },
  { href: '/emotion-note', label: '감정 분리 노트', icon: Heart },
  { href: '/happiness', label: '행복 기록', icon: Smile },
  { href: '/keyword-archive', label: '키워드 아카이브', icon: Tag },
  { href: '/todo', label: '투두리스트', icon: CheckSquare },
  { href: '/schedule', label: '연구 일정 스케줄', icon: Calendar },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex h-14">
        {bottomItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${active ? 'text-blue-600' : 'text-gray-400'}`}>
              <Icon size={21} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
        <button onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400">
          <Menu size={21} />
          <span className="text-[10px] font-medium">더보기</span>
        </button>
      </nav>

      {/* Drawer overlay */}
      {open && (
        <div className="md:hidden">
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">전체 메뉴</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 p-1"><X size={18} /></button>
            </div>
            <div className="px-3 py-2 pb-6">
              {allItems.map(item => {
                const Icon = item.icon
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3.5 rounded-xl transition-colors ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 active:bg-gray-100'}`}>
                    <Icon size={18} className={active ? 'text-blue-600' : 'text-gray-400'} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
