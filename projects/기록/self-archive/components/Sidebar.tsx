'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  Brain,
  Heart,
  Smile,
  FileText,
  Tag,
  CheckSquare,
  Calendar,
  Layout,
  Plus,
  LogOut,
} from 'lucide-react'

const menuItems = [
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

const quickActions = [
  { label: '연구 프로젝트 추가', href: '/research-notes?new=project' },
  { label: '문헌/서적 추가', href: '/paper-archive?new=true' },
  { label: '연구 노트 추가', href: '/research-notes?new=note' },
]

export default function Sidebar({ onSignOut }: { onSignOut?: () => void }) {
  const pathname = usePathname()

  return (
    <aside className="w-56 min-h-screen bg-gray-50 border-r border-gray-200 flex flex-col py-6 px-3">
      <div className="mb-6 px-2">
        <h1 className="text-lg font-bold text-gray-800">나를 모으는 곳</h1>
        <p className="text-xs text-gray-400 mt-0.5">Self Archive</p>
      </div>

      <nav className="flex-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">메뉴</p>
        <ul className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={15} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-6 border-t border-gray-200 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">빠른 추가</p>
        <ul className="space-y-0.5">
          {quickActions.map((action) => (
            <li key={action.href}>
              <Link
                href={action.href}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <Plus size={12} />
                {action.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {onSignOut && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors w-full"
          >
            <LogOut size={12} />
            로그아웃
          </button>
        </div>
      )}
    </aside>
  )
}
