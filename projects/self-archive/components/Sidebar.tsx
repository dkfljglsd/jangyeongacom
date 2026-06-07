'use client'

import { useState, useEffect } from 'react'
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
  ChevronDown,
} from 'lucide-react'
import { userStore, UserProfile } from '@/lib/userStore'

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

export default function Sidebar() {
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [showSwitcher, setShowSwitcher] = useState(false)
  const [addingUser, setAddingUser] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    setCurrentUser(userStore.getCurrent())
    setAllUsers(userStore.getAll())
  }, [])

  const handleSwitch = (userId: string) => {
    userStore.setCurrent(userId)
    window.location.reload()
  }

  const handleLogout = () => {
    localStorage.removeItem('currentUserId')
    window.location.reload()
  }

  const handleAddUser = () => {
    if (!newName.trim()) return
    const user = userStore.create(newName)
    userStore.setCurrent(user.id)
    window.location.reload()
  }

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

      {currentUser && (
        <div className="mt-auto pt-4 border-t border-gray-200 relative">
          <button
            onClick={() => setShowSwitcher(o => !o)}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <span className="flex-1 text-sm text-gray-700 font-medium truncate">{currentUser.name}</span>
            <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />
          </button>

          {showSwitcher && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
              {allUsers.filter(u => u.id !== currentUser.id).map(user => (
                <button key={user.id} onClick={() => handleSwitch(user.id)}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500">
                    {user.name.charAt(0)}
                  </div>
                  <span className="text-sm text-gray-700">{user.name}</span>
                </button>
              ))}
              <div className="border-t border-gray-100">
                {addingUser ? (
                  <div className="px-3 py-2.5 flex items-center gap-2">
                    <input
                      autoFocus
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAddUser()
                        if (e.key === 'Escape') { setAddingUser(false); setNewName('') }
                      }}
                      placeholder="이름 입력..."
                      className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <button onClick={handleAddUser}
                      className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors">
                      추가
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setAddingUser(true)}
                    className="w-full text-left px-3 py-2.5 text-xs text-gray-400 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                    <Plus size={11} />새 사용자 추가
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
