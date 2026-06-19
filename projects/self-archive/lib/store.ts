'use client'

import { Paper, ThoughtMemo, EmotionNote, HappinessLog, ResearchNote, ResearchProject, TodoList, TodoItem, WorkNote } from './types'
import { firestoreSave, firestoreDelete } from './sync'

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

function getCurrentUserId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('currentUserId') ?? ''
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
    firestoreSave(getCurrentUserId(), 'papers', newPaper)
    return newPaper
  },
  update: (id: string, updates: Partial<Paper>): Paper | null => {
    const papers = paperStore.getAll()
    const idx = papers.findIndex(p => p.id === id)
    if (idx === -1) return null
    const updated = { ...papers[idx], ...updates, updatedAt: new Date().toISOString() }
    papers[idx] = updated
    saveToStorage('papers', papers)
    firestoreSave(getCurrentUserId(), 'papers', updated)
    return updated
  },
  delete: (id: string): void => {
    const papers = paperStore.getAll().filter(p => p.id !== id)
    saveToStorage('papers', papers)
    firestoreDelete(getCurrentUserId(), 'papers', id)
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
    firestoreSave(getCurrentUserId(), 'thoughts', newMemo)
    return newMemo
  },
  update: (id: string, updates: Partial<ThoughtMemo>): ThoughtMemo | null => {
    const memos = thoughtStore.getAll()
    const idx = memos.findIndex(m => m.id === id)
    if (idx === -1) return null
    const updated = { ...memos[idx], ...updates, updatedAt: new Date().toISOString() }
    memos[idx] = updated
    saveToStorage('thoughts', memos)
    firestoreSave(getCurrentUserId(), 'thoughts', updated)
    return updated
  },
  delete: (id: string): void => {
    saveToStorage('thoughts', thoughtStore.getAll().filter(m => m.id !== id))
    firestoreDelete(getCurrentUserId(), 'thoughts', id)
  },
}

export const emotionStore = {
  getAll: (): EmotionNote[] => getFromStorage<EmotionNote[]>('emotions', []),
  save: (note: Omit<EmotionNote, 'id' | 'createdAt' | 'updatedAt'>): EmotionNote => {
    const notes = emotionStore.getAll()
    const now = new Date().toISOString()
    const newNote: EmotionNote = { ...note, id: generateId(), createdAt: now, updatedAt: now }
    saveToStorage('emotions', [...notes, newNote])
    firestoreSave(getCurrentUserId(), 'emotions', newNote)
    return newNote
  },
  update: (id: string, updates: Partial<EmotionNote>): EmotionNote | null => {
    const notes = emotionStore.getAll()
    const idx = notes.findIndex(n => n.id === id)
    if (idx === -1) return null
    const updated = { ...notes[idx], ...updates, updatedAt: new Date().toISOString() }
    notes[idx] = updated
    saveToStorage('emotions', notes)
    firestoreSave(getCurrentUserId(), 'emotions', updated)
    return updated
  },
  delete: (id: string): void => {
    saveToStorage('emotions', emotionStore.getAll().filter(n => n.id !== id))
    firestoreDelete(getCurrentUserId(), 'emotions', id)
  },
}

export const happinessStore = {
  getAll: (): HappinessLog[] => getFromStorage<HappinessLog[]>('happiness', []),
  save: (log: Omit<HappinessLog, 'id' | 'createdAt' | 'updatedAt'>): HappinessLog => {
    const logs = happinessStore.getAll()
    const now = new Date().toISOString()
    const newLog: HappinessLog = { ...log, id: generateId(), createdAt: now, updatedAt: now }
    saveToStorage('happiness', [...logs, newLog])
    firestoreSave(getCurrentUserId(), 'happiness', newLog)
    return newLog
  },
  update: (id: string, updates: Partial<HappinessLog>): HappinessLog | null => {
    const logs = happinessStore.getAll()
    const idx = logs.findIndex(l => l.id === id)
    if (idx === -1) return null
    const updated = { ...logs[idx], ...updates, updatedAt: new Date().toISOString() }
    logs[idx] = updated
    saveToStorage('happiness', logs)
    firestoreSave(getCurrentUserId(), 'happiness', updated)
    return updated
  },
  delete: (id: string): void => {
    saveToStorage('happiness', happinessStore.getAll().filter(l => l.id !== id))
    firestoreDelete(getCurrentUserId(), 'happiness', id)
  },
}

export const researchNoteStore = {
  getAll: (): ResearchNote[] => getFromStorage<ResearchNote[]>('researchNotes', []),
  save: (note: Omit<ResearchNote, 'id' | 'createdAt' | 'updatedAt'>): ResearchNote => {
    const notes = researchNoteStore.getAll()
    const now = new Date().toISOString()
    const newNote: ResearchNote = { ...note, id: generateId(), createdAt: now, updatedAt: now }
    saveToStorage('researchNotes', [...notes, newNote])
    firestoreSave(getCurrentUserId(), 'researchNotes', newNote)
    return newNote
  },
  update: (id: string, updates: Partial<ResearchNote>): ResearchNote | null => {
    const notes = researchNoteStore.getAll()
    const idx = notes.findIndex(n => n.id === id)
    if (idx === -1) return null
    const updated = { ...notes[idx], ...updates, updatedAt: new Date().toISOString() }
    notes[idx] = updated
    saveToStorage('researchNotes', notes)
    firestoreSave(getCurrentUserId(), 'researchNotes', updated)
    return updated
  },
  delete: (id: string): void => {
    saveToStorage('researchNotes', researchNoteStore.getAll().filter(n => n.id !== id))
    firestoreDelete(getCurrentUserId(), 'researchNotes', id)
  },
}

export const todoListStore = {
  getAll: (): TodoList[] => getFromStorage<TodoList[]>('todoLists', []),
  save: (title: string): TodoList => {
    const lists = todoListStore.getAll()
    const now = new Date().toISOString()
    const newList: TodoList = { id: generateId(), title, items: [], createdAt: now, updatedAt: now }
    saveToStorage('todoLists', [...lists, newList])
    firestoreSave(getCurrentUserId(), 'todoLists', newList)
    return newList
  },
  update: (id: string, updates: Partial<Omit<TodoList, 'id' | 'createdAt'>>): TodoList | null => {
    const lists = todoListStore.getAll()
    const idx = lists.findIndex(l => l.id === id)
    if (idx === -1) return null
    const updated = { ...lists[idx], ...updates, updatedAt: new Date().toISOString() }
    lists[idx] = updated
    saveToStorage('todoLists', lists)
    firestoreSave(getCurrentUserId(), 'todoLists', updated)
    return updated
  },
  delete: (id: string): void => {
    saveToStorage('todoLists', todoListStore.getAll().filter(l => l.id !== id))
    firestoreDelete(getCurrentUserId(), 'todoLists', id)
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
  updateItem: (listId: string, itemId: string, text: string): TodoList | null => {
    const list = todoListStore.getAll().find(l => l.id === listId)
    if (!list) return null
    const items = list.items.map(i => i.id === itemId ? { ...i, text } : i)
    return todoListStore.update(listId, { items })
  },
}

export const workNoteStore = {
  getAll: (): WorkNote[] => getFromStorage<WorkNote[]>('workNotes', []),
  save: (data: Omit<WorkNote, 'id' | 'createdAt' | 'updatedAt'>): WorkNote => {
    const notes = workNoteStore.getAll()
    const now = new Date().toISOString()
    const note: WorkNote = { ...data, id: generateId(), createdAt: now, updatedAt: now }
    saveToStorage('workNotes', [...notes, note])
    firestoreSave(getCurrentUserId(), 'workNotes', note)
    return note
  },
  update: (id: string, data: Partial<WorkNote>): WorkNote | null => {
    const notes = workNoteStore.getAll()
    const idx = notes.findIndex(n => n.id === id)
    if (idx === -1) return null
    const updated = { ...notes[idx], ...data, updatedAt: new Date().toISOString() }
    notes[idx] = updated
    saveToStorage('workNotes', notes)
    firestoreSave(getCurrentUserId(), 'workNotes', updated)
    return updated
  },
  delete: (id: string): void => {
    saveToStorage('workNotes', workNoteStore.getAll().filter(n => n.id !== id))
    firestoreDelete(getCurrentUserId(), 'workNotes', id)
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
