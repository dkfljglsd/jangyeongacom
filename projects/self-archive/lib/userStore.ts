'use client'

export interface UserProfile {
  id: string
  name: string
  createdAt: string
}

const USERS_KEY = 'app_users'
const CURRENT_KEY = 'currentUserId'
const DATA_KEYS = ['papers', 'thoughts', 'emotions', 'happiness', 'researchNotes', 'todoLists']

export const userStore = {
  getAll(): UserProfile[] {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]') } catch { return [] }
  },

  getCurrent(): UserProfile | null {
    if (typeof window === 'undefined') return null
    const id = localStorage.getItem(CURRENT_KEY)
    if (!id) return null
    return userStore.getAll().find(u => u.id === id) ?? null
  },

  setCurrent(userId: string): void {
    localStorage.setItem(CURRENT_KEY, userId)
  },

  create(name: string): UserProfile {
    const user: UserProfile = {
      id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    }
    const users = userStore.getAll()
    localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]))
    return user
  },

  delete(id: string): void {
    const users = userStore.getAll().filter(u => u.id !== id)
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
    DATA_KEYS.forEach(k => localStorage.removeItem(`${id}_${k}`))
    if (localStorage.getItem(CURRENT_KEY) === id) localStorage.removeItem(CURRENT_KEY)
  },

  hasLegacyData(): boolean {
    if (typeof window === 'undefined') return false
    return DATA_KEYS.some(k => localStorage.getItem(k) !== null)
  },

  migrateLegacyData(userId: string): void {
    DATA_KEYS.forEach(k => {
      const raw = localStorage.getItem(k)
      if (raw) {
        localStorage.setItem(`${userId}_${k}`, raw)
        localStorage.removeItem(k)
      }
    })
  },
}
