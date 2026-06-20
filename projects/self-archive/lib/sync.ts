'use client'

import {
  collection, doc, setDoc, deleteDoc, getDocs, onSnapshot,
  writeBatch, Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'

const COLLECTIONS = ['papers', 'thoughts', 'emotions', 'happiness', 'researchNotes', 'todoLists', 'workNotes'] as const
type ColName = typeof COLLECTIONS[number]

function userCol(userId: string, col: ColName) {
  return collection(db, 'archive', userId, col)
}

// Write single item to Firestore (fire-and-forget)
export function firestoreSave(userId: string, col: ColName, item: { id: string }) {
  if (!userId) return
  const clean = Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined))
  setDoc(doc(db, 'archive', userId, col, item.id), clean).catch(() => {})
}

// Delete single item from Firestore (fire-and-forget)
export function firestoreDelete(userId: string, col: ColName, itemId: string) {
  if (!userId) return
  deleteDoc(doc(db, 'archive', userId, col, itemId)).catch(() => {})
}

// Pull all data from Firestore and write to localStorage
export async function pullFromFirestore(userId: string): Promise<void> {
  if (!userId || typeof window === 'undefined') return
  await Promise.all(
    COLLECTIONS.map(async col => {
      const snap = await getDocs(userCol(userId, col))
      const items = snap.docs.map(d => d.data())
      if (items.length > 0) {
        localStorage.setItem(`${userId}_${col}`, JSON.stringify(items))
      }
    })
  )
}

// Push all localStorage data to Firestore (initial upload / force sync)
export async function pushToFirestore(userId: string): Promise<void> {
  if (!userId || typeof window === 'undefined') return
  for (const col of COLLECTIONS) {
    const raw = localStorage.getItem(`${userId}_${col}`)
    if (!raw) continue
    let items: { id: string }[]
    try { items = JSON.parse(raw) } catch { continue }
    if (!items.length) continue

    const batch = writeBatch(db)
    items.forEach(item => {
      const clean = Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined))
      batch.set(doc(db, 'archive', userId, col, item.id), clean)
    })
    await batch.commit().catch(() => {})
  }
}

// Real-time listener: update localStorage when Firestore changes
export function subscribeToFirestore(userId: string, onUpdate: () => void): Unsubscribe {
  if (!userId) return () => {}
  const unsubs: Unsubscribe[] = COLLECTIONS.map(col =>
    onSnapshot(userCol(userId, col), snap => {
      const items = snap.docs.map(d => d.data())
      localStorage.setItem(`${userId}_${col}`, JSON.stringify(items))
      onUpdate()
    })
  )
  return () => unsubs.forEach(u => u())
}
