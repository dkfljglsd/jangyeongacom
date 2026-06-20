'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BookOpen,
  Brain,
  Heart,
  Smile,
  FileText,
  Tag,
  CheckSquare,
  Layout,
  Plus,
  ChevronDown,
  Search,
  X,
  Images,
  LogOut,
} from 'lucide-react'
import { userStore, UserProfile } from '@/lib/userStore'
import { saveUserToFirestore } from '@/lib/sync'
import {
  thoughtStore, emotionStore, happinessStore,
  researchNoteStore, paperStore,
} from '@/lib/store'

const menuItems = [
  { href: '/', label: '홈', icon: Layout },
  { href: '/research-notes', label: '연구 노트', icon: FileText },
  { href: '/paper-archive', label: '문헌 아카이브', icon: BookOpen },
  { href: '/thought-memo', label: '생각 메모', icon: Brain },
  { href: '/emotion-note', label: '감정 분리 노트', icon: Heart },
  { href: '/happiness', label: '행복 기록', icon: Smile },
  { href: '/keyword-archive', label: '키워드 아카이브', icon: Tag },
  { href: '/todo', label: '투두리스트', icon: CheckSquare },
  { href: '/schedule', label: '업무 노트', icon: FileText },
  { href: '/gallery', label: '파일 갤러리', icon: Images },
]

const quickActions = [
  { label: '연구 프로젝트 추가', href: '/research-notes?new=project' },
  { label: '문헌/서적 추가', href: '/paper-archive?new=true' },
  { label: '연구 노트 추가', href: '/research-notes?new=note' },
]

interface SearchResult {
  id: string
  category: string
  title: string
  preview: string
  href: string
}

function globalSearch(query: string): SearchResult[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  const results: SearchResult[] = []

  thoughtStore.getAll().forEach(n => {
    if ([n.thought, n.summary, n.why, n.oneSentence, ...n.tags].some(t => t?.toLowerCase().includes(q))) {
      results.push({ id: n.id, category: '생각 메모', title: n.thought || '(제목 없음)', preview: n.summary || n.why || '', href: '/thought-memo' })
    }
  })
  emotionStore.getAll().forEach(n => {
    if ([n.emotion, n.actualEvent, n.myInterpretation, n.messageToSelf].some(t => t?.toLowerCase().includes(q))) {
      results.push({ id: n.id, category: '감정 노트', title: n.emotion || n.actualEvent || '(제목 없음)', preview: n.actualEvent || '', href: '/emotion-note' })
    }
  })
  happinessStore.getAll().forEach(n => {
    if ([n.happyMoment, n.memorableSentence, n.food].some(t => t?.toLowerCase().includes(q))) {
      results.push({ id: n.id, category: '행복 기록', title: n.happyMoment || '(제목 없음)', preview: n.memorableSentence || '', href: '/happiness' })
    }
  })
  researchNoteStore.getAll().forEach(n => {
    if ([n.title, n.content, ...n.ideas].some(t => t?.toLowerCase().includes(q))) {
      results.push({ id: n.id, category: '연구 노트', title: n.title || '(제목 없음)', preview: n.content?.slice(0, 60) || '', href: '/research-notes' })
    }
  })
  paperStore.getAll().forEach(n => {
    if ([n.title, n.authors, n.abstract, n.purpose, n.myThought, ...n.keywords].some(t => t?.toLowerCase().includes(q))) {
      results.push({ id: n.id, category: '문헌 아카이브', title: n.title || '(제목 없음)', preview: n.authors || '', href: '/paper-archive' })
    }
  })

  return results.slice(0, 20)
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [showSwitcher, setShowSwitcher] = useState(false)
  const [addingUser, setAddingUser] = useState(false)
  const [newName, setNewName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q)
    setSearchResults(globalSearch(q))
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    setCurrentUser(userStore.getCurrent())
    setAllUsers(userStore.getAll())
  }, [])

  const handleSwitch = (userId: string) => {
    userStore.setCurrent(userId)
    window.location.reload()
  }

  const handleLogout = () => {
    userStore.logout()
    window.location.reload()
  }

  const handleAddUser = () => {
    if (!newName.trim()) return
    const user = userStore.create(newName)
    saveUserToFirestore(user)
    userStore.setCurrent(user.id)
    window.location.reload()
  }

  return (
    <aside className="hidden md:flex w-56 h-screen bg-gray-50 border-r border-gray-200 flex-col py-6 px-3">
      <Link href="/" className="mb-4 px-2 block group">
        <h1 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">나를 모으는 곳</h1>
        <p className="text-xs text-gray-400 mt-0.5">Self Archive</p>
      </Link>

      <div ref={searchRef} className="relative mb-4 px-1">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-100">
          <Search size={12} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="전체 검색..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            className="flex-1 text-xs bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 min-w-0"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchOpen(false) }}>
              <X size={11} className="text-gray-300 hover:text-gray-500" />
            </button>
          )}
        </div>

        {searchOpen && searchQuery && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-80 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-xs text-gray-400 px-3 py-3 text-center">검색 결과가 없어요</p>
            ) : (
              searchResults.map(r => (
                <button key={r.id} onClick={() => { router.push(r.href); setSearchOpen(false); setSearchQuery(''); setSearchResults([]) }}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                  <p className="text-xs text-blue-500 font-medium mb-0.5">{r.category}</p>
                  <p className="text-xs text-gray-800 font-medium truncate">{r.title}</p>
                  {r.preview && <p className="text-xs text-gray-400 truncate mt-0.5">{r.preview}</p>}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto min-h-0">
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
              <div className="border-t border-gray-100">
                <button onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 text-xs text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors flex items-center gap-1.5">
                  <LogOut size={11} />로그아웃
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
