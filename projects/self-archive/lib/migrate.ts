'use client'

function getUserKey(key: string): string {
  const userId = localStorage.getItem('currentUserId')
  return userId ? `${userId}_${key}` : key
}

export function runMigrations() {
  if (typeof window === 'undefined') return

  const keys = ['thoughts', 'emotions', 'happiness']
  for (const key of keys) {
    try {
      const storageKey = getUserKey(key)
      const raw = localStorage.getItem(storageKey)
      if (!raw) continue
      const items = JSON.parse(raw) as Array<Record<string, unknown>>
      let changed = false
      const migrated = items.map(item => {
        if (!item.updatedAt) {
          changed = true
          return { ...item, updatedAt: item.createdAt }
        }
        return item
      })
      if (changed) localStorage.setItem(storageKey, JSON.stringify(migrated))
    } catch {
      // corrupt data — leave as-is
    }
  }
}
