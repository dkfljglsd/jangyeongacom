'use client'

import { useState, useEffect, useCallback } from 'react'
import { userStore, UserProfile } from '@/lib/userStore'
import { pullFromFirestore, pushToFirestore, fetchUsersFromFirestore, saveUserToFirestore } from '@/lib/sync'

export default function UserGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'selecting' | 'syncing' | 'ready'>('loading')
  const [syncKey, setSyncKey] = useState(0)

  const initialSync = useCallback(async () => {
    const userId = localStorage.getItem('currentUserId')
    if (!userId) { setStatus('ready'); return }
    setStatus('syncing')

    // Save user profile to Firestore so other devices can discover it
    const user = userStore.getCurrent()
    if (user) saveUserToFirestore(user)

    // Pull remote data first
    await pullFromFirestore(userId).catch(() => {})

    // Push ALL local data to Firestore (awaited, so we know it completes)
    await pushToFirestore(userId).catch(() => {})

    setStatus('ready')
    setSyncKey(k => k + 1)
  }, [])

  const backgroundSync = useCallback(async () => {
    const userId = localStorage.getItem('currentUserId')
    if (!userId) return
    await pullFromFirestore(userId).catch(() => {})
    setSyncKey(k => k + 1)
  }, [])

  useEffect(() => {
    const current = userStore.getCurrent()
    if (current) { initialSync() } else { setStatus('selecting') }
  }, [initialSync])

  // Re-sync silently when tab becomes visible (for multi-device use)
  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') backgroundSync() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [backgroundSync])

  if (status === 'loading' || status === 'syncing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-gray-400">동기화 중...</p>
      </div>
    )
  }
  if (status === 'selecting') return <UserSelectScreen onDone={initialSync} />
  return <div key={syncKey}>{children}</div>
}

function UserSelectScreen({ onDone }: { onDone: () => void }) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [fetching, setFetching] = useState(false)
  const hasLegacy = userStore.hasLegacyData()

  useEffect(() => {
    const local = userStore.getAll()
    if (local.length > 0) {
      setUsers(local)
    } else {
      // No local users — try to restore from Firestore
      setFetching(true)
      fetchUsersFromFirestore().then(remote => {
        if (remote.length > 0) {
          // Save to localStorage so they appear on reload
          localStorage.setItem('app_users', JSON.stringify(remote))
          setUsers(remote)
        } else {
          setCreating(true)
        }
        setFetching(false)
      }).catch(() => { setCreating(true); setFetching(false) })
    }
  }, [])

  const handleSelect = (userId: string) => {
    userStore.setCurrent(userId)
    onDone()
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    const user = userStore.create(newName)
    saveUserToFirestore(user)
    if (hasLegacy && users.length === 0) {
      userStore.migrateLegacyData(user.id)
    }
    userStore.setCurrent(user.id)
    onDone()
  }

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-gray-400">사용자 정보 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">나를 모으는 곳</h1>
        <p className="text-sm text-gray-400 mb-10">사용자를 선택하거나 새로 만들어주세요</p>

        {users.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">사용자 선택</p>
            <div className="space-y-1">
              {users.map(user => (
                <button key={user.id} onClick={() => handleSelect(user.id)}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors group flex items-center gap-3 border border-transparent hover:border-gray-200">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {creating ? (
          <div>
            {users.length > 0 && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">새 사용자</p>
            )}
            {hasLegacy && users.length === 0 && (
              <p className="text-xs text-blue-500 bg-blue-50 rounded-lg px-3 py-2 mb-4">
                기존 데이터가 감지되었습니다. 새 사용자로 자동 이전됩니다.
              </p>
            )}
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleCreate()}
              placeholder="이름 입력..."
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 mb-3"
            />
            <div className="flex gap-2">
              <button onClick={handleCreate}
                className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors">
                시작하기
              </button>
              {users.length > 0 && (
                <button onClick={() => setCreating(false)}
                  className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  취소
                </button>
              )}
            </div>
          </div>
        ) : (
          <button onClick={() => setCreating(true)}
            className="w-full py-2.5 text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors">
            + 새 사용자 추가
          </button>
        )}
      </div>
    </div>
  )
}
