'use client'

import { Paper, ThoughtMemo, EmotionNote, HappinessLog, ResearchNote, ResearchProject, TodoList, TodoItem } from './types'

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

function getUserKey(key: string): string {
  if (typeof window === 'undefined') return key
  const userId = localStorage.getItem('currentUserId')
  return userId ? `${userId}_${key}` : key
}

function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const item = localStorage.getItem(getUserKey(key))
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(getUserKey(key), JSON.stringify(value))
}

export const paperStore = {
  getAll: (): Paper[] => getFromStorage<Paper[]>('papers', []),
  save: (paper: Omit<Paper, 'id' | 'createdAt' | 'updatedAt'>): Paper => {
    const papers = paperStore.getAll()
    const now = new Date().toISOString()
    const newPaper: Paper = { ...paper, id: generateId(), createdAt: now, updatedAt: now }
    saveToStorage('papers', [...papers, newPaper])
    return newPaper
  },
  update: (id: string, updates: Partial<Paper>): Paper | null => {
    const papers = paperStore.getAll()
    const idx = papers.findIndex(p => p.id === id)
    if (idx === -1) return null
    const updated = { ...papers[idx], ...updates, updatedAt: new Date().toISOString() }
    papers[idx] = updated
    saveToStorage('papers', papers)
    return updated
  },
  delete: (id: string): void => {
    const papers = paperStore.getAll().filter(p => p.id !== id)
    saveToStorage('papers', papers)
  },
  getById: (id: string): Paper | undefined => paperStore.getAll().find(p => p.id === id),
}

export const thoughtStore = {
  getAll: (): ThoughtMemo[] => getFromStorage<ThoughtMemo[]>('thoughts', []),
  save: (memo: Omit<ThoughtMemo, 'id' | 'createdAt' | 'updatedAt'>): ThoughtMemo => {
    const memos = thoughtStore.getAll()
    const now = new Date().toISOString()
    const newMemo: ThoughtMemo = { ...memo, id: generateId(), createdAt: now, updatedAt: now }
    saveToStorage('thoughts', [...memos, newMemo])
    return newMemo
  },
  update: (id: string, updates: Partial<ThoughtMemo>): ThoughtMemo | null => {
    const memos = thoughtStore.getAll()
    const idx = memos.findIndex(m => m.id === id)
    if (idx === -1) return null
    const updated = { ...memos[idx], ...updates, updatedAt: new Date().toISOString() }
    memos[idx] = updated
    saveToStorage('thoughts', memos)
    return updated
  },
  delete: (id: string): void => {
    saveToStorage('thoughts', thoughtStore.getAll().filter(m => m.id !== id))
  },
}

export const emotionStore = {
  getAll: (): EmotionNote[] => getFromStorage<EmotionNote[]>('emotions', []),
  save: (note: Omit<EmotionNote, 'id' | 'createdAt' | 'updatedAt'>): EmotionNote => {
    const notes = emotionStore.getAll()
    const now = new Date().toISOString()
    const newNote: EmotionNote = { ...note, id: generateId(), createdAt: now, updatedAt: now }
    saveToStorage('emotions', [...notes, newNote])
    return newNote
  },
  update: (id: string, updates: Partial<EmotionNote>): EmotionNote | null => {
    const notes = emotionStore.getAll()
    const idx = notes.findIndex(n => n.id === id)
    if (idx === -1) return null
    const updated = { ...notes[idx], ...updates, updatedAt: new Date().toISOString() }
    notes[idx] = updated
    saveToStorage('emotions', notes)
    return updated
  },
  delete: (id: string): void => {
    saveToStorage('emotions', emotionStore.getAll().filter(n => n.id !== id))
  },
}

export const happinessStore = {
  getAll: (): HappinessLog[] => getFromStorage<HappinessLog[]>('happiness', []),
  save: (log: Omit<HappinessLog, 'id' | 'createdAt' | 'updatedAt'>): HappinessLog => {
    const logs = happinessStore.getAll()
    const now = new Date().toISOString()
    const newLog: HappinessLog = { ...log, id: generateId(), createdAt: now, updatedAt: now }
    saveToStorage('happiness', [...logs, newLog])
    return newLog
  },
  update: (id: string, updates: Partial<HappinessLog>): HappinessLog | null => {
    const logs = happinessStore.getAll()
    const idx = logs.findIndex(l => l.id === id)
    if (idx === -1) return null
    const updated = { ...logs[idx], ...updates, updatedAt: new Date().toISOString() }
    logs[idx] = updated
    saveToStorage('happiness', logs)
    return updated
  },
  delete: (id: string): void => {
    saveToStorage('happiness', happinessStore.getAll().filter(l => l.id !== id))
  },
}

export const researchNoteStore = {
  getAll: (): ResearchNote[] => getFromStorage<ResearchNote[]>('researchNotes', []),
  save: (note: Omit<ResearchNote, 'id' | 'createdAt' | 'updatedAt'>): ResearchNote => {
    const notes = researchNoteStore.getAll()
    const now = new Date().toISOString()
    const newNote: ResearchNote = { ...note, id: generateId(), createdAt: now, updatedAt: now }
    saveToStorage('researchNotes', [...notes, newNote])
    return newNote
  },
  update: (id: string, updates: Partial<ResearchNote>): ResearchNote | null => {
    const notes = researchNoteStore.getAll()
    const idx = notes.findIndex(n => n.id === id)
    if (idx === -1) return null
    const updated = { ...notes[idx], ...updates, updatedAt: new Date().toISOString() }
    notes[idx] = updated
    saveToStorage('researchNotes', notes)
    return updated
  },
  delete: (id: string): void => {
    saveToStorage('researchNotes', researchNoteStore.getAll().filter(n => n.id !== id))
  },
}

export const todoListStore = {
  getAll: (): TodoList[] => getFromStorage<TodoList[]>('todoLists', []),
  save: (title: string): TodoList => {
    const lists = todoListStore.getAll()
    const now = new Date().toISOString()
    const newList: TodoList = { id: generateId(), title, items: [], createdAt: now, updatedAt: now }
    saveToStorage('todoLists', [...lists, newList])
    return newList
  },
  update: (id: string, updates: Partial<Omit<TodoList, 'id' | 'createdAt'>>): TodoList | null => {
    const lists = todoListStore.getAll()
    const idx = lists.findIndex(l => l.id === id)
    if (idx === -1) return null
    const updated = { ...lists[idx], ...updates, updatedAt: new Date().toISOString() }
    lists[idx] = updated
    saveToStorage('todoLists', lists)
    return updated
  },
  delete: (id: string): void => {
    saveToStorage('todoLists', todoListStore.getAll().filter(l => l.id !== id))
  },
  addItem: (listId: string, text: string): TodoList | null => {
    const item: TodoItem = { id: generateId(), text, done: false, createdAt: new Date().toISOString() }
    const list = todoListStore.getAll().find(l => l.id === listId)
    if (!list) return null
    return todoListStore.update(listId, { items: [...list.items, item] })
  },
  toggleItem: (listId: string, itemId: string): TodoList | null => {
    const list = todoListStore.getAll().find(l => l.id === listId)
    if (!list) return null
    const items = list.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i)
    return todoListStore.update(listId, { items })
  },
  deleteItem: (listId: string, itemId: string): TodoList | null => {
    const list = todoListStore.getAll().find(l => l.id === listId)
    if (!list) return null
    return todoListStore.update(listId, { items: list.items.filter(i => i.id !== itemId) })
  },
}

export const projectStore = {
  getAll: (): ResearchProject[] => getFromStorage<ResearchProject[]>('projects', []),
  save: (project: Omit<ResearchProject, 'id' | 'createdAt'>): ResearchProject => {
    const projects = projectStore.getAll()
    const newProject: ResearchProject = { ...project, id: generateId(), createdAt: new Date().toISOString() }
    saveToStorage('projects', [...projects, newProject])
    return newProject
  },
  delete: (id: string): void => {
    saveToStorage('projects', projectStore.getAll().filter(p => p.id !== id))
  },
}
