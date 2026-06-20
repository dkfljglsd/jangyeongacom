'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Layout, Brain, FileText, BookOpen, Heart, Smile,
  Tag, CheckSquare, Menu, X, Plus, LogOut, Images, RefreshCw,
} from 'lucide-react'
import { userStore, UserProfile } from '@/lib/userStore'
import { saveUserToFirestore, deleteUserFromFirestore, pushToFirestore, pullFromFirestore } from '@/lib/sync'

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
  { href: '/schedule', label: '업무 노트', icon: FileText },
  { href: '/gallery', label: '파일 갤러리', icon: Images },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [addingUser, setAddingUser] = useState(false)
  const [newName, setNewName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleteInput, setDeleteInput] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  useEffect(() => {
    setCurrentUser(userStore.getCurrent())
    setAllUsers(userStore.getAll())
  }, [open])

  const handleSwitch = (userId: string) => {
    userStore.setCurrent(userId)
    window.location.reload()
  }

  const handleAddUser = () => {
    if (!newName.trim()) return
    const user = userStore.create(newName.trim())
    saveUserToFirestore(user)
    userStore.setCurrent(user.id)
    window.location.reload()
  }

  const handleLogout = () => {
    userStore.logout()
    window.location.reload()
  }

  function hasUserData(userId: string): boolean {
    const keys = ['papers', 'thoughts', 'emotions', 'happiness', 'researchNotes', 'todoLists', 'workNotes']
    return keys.some(k => {
      try { return JSON.parse(localStorage.getItem(`${userId}_${k}`) ?? '[]').length > 0 } catch { return false }
    })
  }

  const handleDelete = (userId: string) => {
    deleteUserFromFirestore(userId)
    userStore.delete(userId)
    setConfirmDelete(null)
    setDeleteInput('')
    setAllUsers(userStore.getAll())
    const current = userStore.getCurrent()
    if (!current) window.location.reload()
    else setCurrentUser(current)
  }

  const handleForceSync = async () => {
    const userId = localStorage.getItem('currentUserId')
    if (!userId || syncing) return
    setSyncing(true)
    setSyncMsg(null)
    try {
      const pushed = await pushToFirestore(userId)
      await pullFromFirestore(userId)
      if (pushed === -1) {
        setSyncMsg('실패 — 네트워크 확인')
      } else {
        setSyncMsg(`완료 (${pushed}개)`)
        setTimeout(() => window.location.reload(), 800)
      }
    } catch {
      setSyncMsg('동기화 실패')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      {/* Bottom tab bar */}
      <nav className="mobile-nav md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex">
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
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => { setOpen(false); setConfirmDelete(null) }} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">전체 메뉴</p>
              <button onClick={() => { setOpen(false); setConfirmDelete(null) }} className="text-gray-400 p-1"><X size={18} /></button>
            </div>
            <div className="px-5 py-2">
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

            {/* User section */}
            <div className="border-t border-gray-100 mx-5 mt-2 pt-3 pb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">사용자</p>

              {/* All users */}
              {[...(currentUser ? [currentUser] : []), ...allUsers.filter(u => u.id !== currentUser?.id)].map(user => {
                const isCurrent = user.id === currentUser?.id
                const isConfirming = confirmDelete === user.id
                const needsVerify = hasUserData(user.id)
                const canDelete = !needsVerify || deleteInput === user.name
                return (
                  <div key={user.id} className="mb-1">
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${isCurrent ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        {isCurrent ? (
                          <>
                            <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                            <p className="text-xs text-gray-400">현재 사용자</p>
                          </>
                        ) : (
                          <button onPointerUp={() => handleSwitch(user.id)} className="text-sm text-gray-600 text-left w-full truncate">
                            {user.name}
                          </button>
                        )}
                      </div>
                      {isCurrent && (
                        <button onPointerUp={handleLogout} className="p-2 text-gray-300 active:text-orange-400">
                          <LogOut size={16} />
                        </button>
                      )}
                      <button onPointerUp={() => { setConfirmDelete(isConfirming ? null : user.id); setDeleteInput('') }}
                        className="p-2 text-gray-300 active:text-red-400 flex-shrink-0">
                        <X size={16} />
                      </button>
                    </div>
                    {isConfirming && (
                      <div className="mx-3 mb-2 p-3 bg-red-50 rounded-xl">
                        {needsVerify ? (
                          <>
                            <p className="text-xs text-red-600 mb-2">데이터가 삭제됩니다.<br />계속하려면 이름을 입력하세요</p>
                            <input
                              value={deleteInput}
                              onChange={e => setDeleteInput(e.target.value)}
                              placeholder={user.name}
                              className="w-full text-sm border border-red-200 rounded-xl px-3 py-2 outline-none mb-2 bg-white"
                            />
                          </>
                        ) : (
                          <p className="text-xs text-red-600 mb-2">'{user.name}' 삭제할까요?</p>
                        )}
                        <div className="flex gap-2">
                          <button onPointerUp={() => canDelete && handleDelete(user.id)}
                            className={`flex-1 py-2 text-sm rounded-xl font-medium transition-opacity ${canDelete ? 'bg-red-500 text-white' : 'bg-red-200 text-white opacity-50'}`}>
                            삭제
                          </button>
                          <button onPointerUp={() => { setConfirmDelete(null); setDeleteInput('') }}
                            className="flex-1 py-2 text-sm bg-gray-100 text-gray-500 rounded-xl">
                            취소
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Add new user */}
              {addingUser ? (
                <div className="flex items-center gap-2 px-3 py-2 mt-1">
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAddUser()
                      if (e.key === 'Escape') { setAddingUser(false); setNewName('') }
                    }}
                    placeholder="이름 입력..."
                    className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button onPointerUp={handleAddUser}
                    className="text-sm text-blue-500 font-medium px-2">추가</button>
                </div>
              ) : (
                <button onPointerUp={() => setAddingUser(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 text-gray-400 active:bg-gray-100 rounded-xl transition-colors">
                  <Plus size={16} />
                  <span className="text-sm">새 사용자 추가</span>
                </button>
              )}

              {/* Sync button */}
              <div className="mt-3 border-t border-gray-100 pt-3">
                <button onPointerUp={handleForceSync} disabled={syncing}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 active:bg-blue-50 rounded-xl transition-colors disabled:opacity-50">
                  <RefreshCw size={16} className={syncing ? 'animate-spin text-blue-400' : ''} />
                  <span className="text-sm">{syncing ? '동기화 중...' : syncMsg ?? '클라우드 동기화'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
