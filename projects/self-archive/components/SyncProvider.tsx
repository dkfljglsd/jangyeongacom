'use client'

import { useEffect, useRef, useState } from 'react'
import { pullFromFirestore, subscribeToFirestore } from '@/lib/sync'

interface Props {
  onReady: () => void
  children: React.ReactNode
}

export default function SyncProvider({ onReady, children }: Props) {
  const [synced, setSynced] = useState(false)
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const userId = localStorage.getItem('currentUserId')
    if (!userId) { setSynced(true); onReady(); return }

    // Initial pull from Firestore, then subscribe to real-time updates
    pullFromFirestore(userId).then(() => {
      setSynced(true)
      onReady()
      unsubRef.current = subscribeToFirestore(userId, () => {
        // Force a storage event so React re-reads localStorage
        window.dispatchEvent(new Event('storage'))
      })
    }).catch(() => {
      setSynced(true)
      onReady()
    })

    return () => { unsubRef.current?.() }
  }, [])

  if (!synced) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">동기화 중...</p>
      </div>
    )
  }

  return <>{children}</>
}
