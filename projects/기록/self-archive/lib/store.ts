'use client'

import { supabase } from './supabase'
import { Paper, ThoughtMemo, EmotionNote, HappinessLog, ResearchNote, ResearchProject } from './types'

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return session.user.id
}

// ===== Papers =====

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function paperFromRow(row: any): Paper {
  return {
    id: row.id,
    title: row.title || '',
    authors: row.authors || '',
    journal: row.journal || '',
    year: row.year || '',
    keywords: row.keywords || [],
    doi: row.doi || '',
    abstract: row.abstract || '',
    pdfUrl: row.pdf_url,
    originalFileName: row.original_file_name,
    readingStatus: row.reading_status || '읽지않음',
    researchField: row.research_field || '',
    purpose: row.purpose || '',
    method: row.method || '',
    result: row.result || '',
    limitation: row.limitation || '',
    myThought: row.my_thought || '',
    researchIdea: row.research_idea || '',
    oneSentence: row.one_sentence || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const paperStore = {
  getAll: async (): Promise<Paper[]> => {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('papers').select('*').eq('user_id', userId).order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map(paperFromRow)
  },

  save: async (paper: Omit<Paper, 'id' | 'createdAt' | 'updatedAt'>): Promise<Paper> => {
    const userId = await getUserId()
    const now = new Date().toISOString()
    const row = {
      id: generateId(), user_id: userId,
      title: paper.title, authors: paper.authors, journal: paper.journal, year: paper.year,
      keywords: paper.keywords, doi: paper.doi, abstract: paper.abstract,
      pdf_url: paper.pdfUrl, original_file_name: paper.originalFileName,
      reading_status: paper.readingStatus, research_field: paper.researchField,
      purpose: paper.purpose, method: paper.method, result: paper.result,
      limitation: paper.limitation, my_thought: paper.myThought,
      research_idea: paper.researchIdea, one_sentence: paper.oneSentence,
      created_at: now, updated_at: now,
    }
    const { data, error } = await supabase.from('papers').insert(row).select().single()
    if (error) throw error
    return paperFromRow(data)
  },

  update: async (id: string, updates: Partial<Paper>): Promise<Paper | null> => {
    const userId = await getUserId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: any = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) row.title = updates.title
    if (updates.authors !== undefined) row.authors = updates.authors
    if (updates.journal !== undefined) row.journal = updates.journal
    if (updates.year !== undefined) row.year = updates.year
    if (updates.keywords !== undefined) row.keywords = updates.keywords
    if (updates.doi !== undefined) row.doi = updates.doi
    if (updates.abstract !== undefined) row.abstract = updates.abstract
    if (updates.pdfUrl !== undefined) row.pdf_url = updates.pdfUrl
    if (updates.originalFileName !== undefined) row.original_file_name = updates.originalFileName
    if (updates.readingStatus !== undefined) row.reading_status = updates.readingStatus
    if (updates.researchField !== undefined) row.research_field = updates.researchField
    if (updates.purpose !== undefined) row.purpose = updates.purpose
    if (updates.method !== undefined) row.method = updates.method
    if (updates.result !== undefined) row.result = updates.result
    if (updates.limitation !== undefined) row.limitation = updates.limitation
    if (updates.myThought !== undefined) row.my_thought = updates.myThought
    if (updates.researchIdea !== undefined) row.research_idea = updates.researchIdea
    if (updates.oneSentence !== undefined) row.one_sentence = updates.oneSentence
    const { data, error } = await supabase
      .from('papers').update(row).eq('id', id).eq('user_id', userId).select().single()
    if (error) return null
    return paperFromRow(data)
  },

  delete: async (id: string): Promise<void> => {
    const userId = await getUserId()
    await supabase.from('papers').delete().eq('id', id).eq('user_id', userId)
  },

  getById: async (id: string): Promise<Paper | undefined> => {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('papers').select('*').eq('id', id).eq('user_id', userId).single()
    if (error || !data) return undefined
    return paperFromRow(data)
  },
}

// ===== Thoughts =====

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function thoughtFromRow(row: any): ThoughtMemo {
  return {
    id: row.id,
    thought: row.thought || '',
    summary: row.summary || '',
    why: row.why || '',
    howToApply: row.how_to_apply || '',
    oneSentence: row.one_sentence || '',
    tags: row.tags || [],
    createdAt: row.created_at,
  }
}

export const thoughtStore = {
  getAll: async (): Promise<ThoughtMemo[]> => {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('thoughts').select('*').eq('user_id', userId).order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map(thoughtFromRow)
  },

  save: async (memo: Omit<ThoughtMemo, 'id' | 'createdAt'>): Promise<ThoughtMemo> => {
    const userId = await getUserId()
    const row = {
      id: generateId(), user_id: userId,
      thought: memo.thought, summary: memo.summary, why: memo.why,
      how_to_apply: memo.howToApply, one_sentence: memo.oneSentence, tags: memo.tags,
      created_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('thoughts').insert(row).select().single()
    if (error) throw error
    return thoughtFromRow(data)
  },

  delete: async (id: string): Promise<void> => {
    const userId = await getUserId()
    await supabase.from('thoughts').delete().eq('id', id).eq('user_id', userId)
  },
}

// ===== Emotions =====

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function emotionFromRow(row: any): EmotionNote {
  return {
    id: row.id,
    emotion: row.emotion || '',
    actualEvent: row.actual_event || '',
    myInterpretation: row.my_interpretation || '',
    alternativeView: row.alternative_view || '',
    messageToSelf: row.message_to_self || '',
    createdAt: row.created_at,
  }
}

export const emotionStore = {
  getAll: async (): Promise<EmotionNote[]> => {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('emotions').select('*').eq('user_id', userId).order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map(emotionFromRow)
  },

  save: async (note: Omit<EmotionNote, 'id' | 'createdAt'>): Promise<EmotionNote> => {
    const userId = await getUserId()
    const row = {
      id: generateId(), user_id: userId,
      emotion: note.emotion, actual_event: note.actualEvent,
      my_interpretation: note.myInterpretation, alternative_view: note.alternativeView,
      message_to_self: note.messageToSelf,
      created_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('emotions').insert(row).select().single()
    if (error) throw error
    return emotionFromRow(data)
  },

  delete: async (id: string): Promise<void> => {
    const userId = await getUserId()
    await supabase.from('emotions').delete().eq('id', id).eq('user_id', userId)
  },
}

// ===== Happiness =====

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function happinessFromRow(row: any): HappinessLog {
  return {
    id: row.id,
    happyMoment: row.happy_moment || '',
    food: row.food,
    spending: row.spending,
    memorableSentence: row.memorable_sentence,
    achievement: row.achievement,
    messageToSelf: row.message_to_self,
    tags: row.tags || [],
    createdAt: row.created_at,
  }
}

export const happinessStore = {
  getAll: async (): Promise<HappinessLog[]> => {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('happiness').select('*').eq('user_id', userId).order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map(happinessFromRow)
  },

  save: async (log: Omit<HappinessLog, 'id' | 'createdAt'>): Promise<HappinessLog> => {
    const userId = await getUserId()
    const row = {
      id: generateId(), user_id: userId,
      happy_moment: log.happyMoment, food: log.food, spending: log.spending,
      memorable_sentence: log.memorableSentence, achievement: log.achievement,
      message_to_self: log.messageToSelf, tags: log.tags,
      created_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('happiness').insert(row).select().single()
    if (error) throw error
    return happinessFromRow(data)
  },

  delete: async (id: string): Promise<void> => {
    const userId = await getUserId()
    await supabase.from('happiness').delete().eq('id', id).eq('user_id', userId)
  },
}

// ===== Research Notes =====

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function researchNoteFromRow(row: any): ResearchNote {
  return {
    id: row.id,
    projectId: row.project_id || '',
    title: row.title || '',
    content: row.content || '',
    ideas: row.ideas || [],
    references: row.references || [],
    todoItems: row.todo_items || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const researchNoteStore = {
  getAll: async (): Promise<ResearchNote[]> => {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('research_notes').select('*').eq('user_id', userId).order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map(researchNoteFromRow)
  },

  save: async (note: Omit<ResearchNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<ResearchNote> => {
    const userId = await getUserId()
    const now = new Date().toISOString()
    const row = {
      id: generateId(), user_id: userId,
      project_id: note.projectId, title: note.title, content: note.content,
      ideas: note.ideas, references: note.references, todo_items: note.todoItems,
      created_at: now, updated_at: now,
    }
    const { data, error } = await supabase.from('research_notes').insert(row).select().single()
    if (error) throw error
    return researchNoteFromRow(data)
  },

  update: async (id: string, updates: Partial<ResearchNote>): Promise<ResearchNote | null> => {
    const userId = await getUserId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: any = { updated_at: new Date().toISOString() }
    if (updates.projectId !== undefined) row.project_id = updates.projectId
    if (updates.title !== undefined) row.title = updates.title
    if (updates.content !== undefined) row.content = updates.content
    if (updates.ideas !== undefined) row.ideas = updates.ideas
    if (updates.references !== undefined) row.references = updates.references
    if (updates.todoItems !== undefined) row.todo_items = updates.todoItems
    const { data, error } = await supabase
      .from('research_notes').update(row).eq('id', id).eq('user_id', userId).select().single()
    if (error) return null
    return researchNoteFromRow(data)
  },

  delete: async (id: string): Promise<void> => {
    const userId = await getUserId()
    await supabase.from('research_notes').delete().eq('id', id).eq('user_id', userId)
  },
}

// ===== Projects =====

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function projectFromRow(row: any): ResearchProject {
  return {
    id: row.id,
    name: row.name || '',
    description: row.description || '',
    goals: row.goals || [],
    color: row.color || '',
    createdAt: row.created_at,
  }
}

export const projectStore = {
  getAll: async (): Promise<ResearchProject[]> => {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map(projectFromRow)
  },

  save: async (project: Omit<ResearchProject, 'id' | 'createdAt'>): Promise<ResearchProject> => {
    const userId = await getUserId()
    const row = {
      id: generateId(), user_id: userId,
      name: project.name, description: project.description,
      goals: project.goals, color: project.color,
      created_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('projects').insert(row).select().single()
    if (error) throw error
    return projectFromRow(data)
  },

  delete: async (id: string): Promise<void> => {
    const userId = await getUserId()
    await supabase.from('projects').delete().eq('id', id).eq('user_id', userId)
  },
}

// ===== 기존 localStorage 데이터 마이그레이션 =====

export async function migrateFromLocalStorage(): Promise<void> {
  if (typeof window === 'undefined') return
  if (localStorage.getItem('self_archive_migrated')) return

  const userId = await getUserId()

  try {
    const thoughts: ThoughtMemo[] = JSON.parse(localStorage.getItem('thoughts') || '[]')
    if (thoughts.length > 0) {
      await supabase.from('thoughts').upsert(
        thoughts.map(t => ({
          id: t.id, user_id: userId, thought: t.thought, summary: t.summary,
          why: t.why, how_to_apply: t.howToApply, one_sentence: t.oneSentence,
          tags: t.tags, created_at: t.createdAt,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      )
    }

    const emotions: EmotionNote[] = JSON.parse(localStorage.getItem('emotions') || '[]')
    if (emotions.length > 0) {
      await supabase.from('emotions').upsert(
        emotions.map(e => ({
          id: e.id, user_id: userId, emotion: e.emotion, actual_event: e.actualEvent,
          my_interpretation: e.myInterpretation, alternative_view: e.alternativeView,
          message_to_self: e.messageToSelf, created_at: e.createdAt,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      )
    }

    const happiness: HappinessLog[] = JSON.parse(localStorage.getItem('happiness') || '[]')
    if (happiness.length > 0) {
      await supabase.from('happiness').upsert(
        happiness.map(h => ({
          id: h.id, user_id: userId, happy_moment: h.happyMoment, food: h.food,
          spending: h.spending, memorable_sentence: h.memorableSentence,
          achievement: h.achievement, message_to_self: h.messageToSelf,
          tags: h.tags, created_at: h.createdAt,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      )
    }

    const papers: Paper[] = JSON.parse(localStorage.getItem('papers') || '[]')
    if (papers.length > 0) {
      await supabase.from('papers').upsert(
        papers.map(p => ({
          id: p.id, user_id: userId, title: p.title, authors: p.authors,
          journal: p.journal, year: p.year, keywords: p.keywords, doi: p.doi,
          abstract: p.abstract, pdf_url: p.pdfUrl, original_file_name: p.originalFileName,
          reading_status: p.readingStatus, research_field: p.researchField,
          purpose: p.purpose, method: p.method, result: p.result,
          limitation: p.limitation, my_thought: p.myThought,
          research_idea: p.researchIdea, one_sentence: p.oneSentence,
          created_at: p.createdAt, updated_at: p.updatedAt,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      )
    }

    const notes: ResearchNote[] = JSON.parse(localStorage.getItem('researchNotes') || '[]')
    if (notes.length > 0) {
      await supabase.from('research_notes').upsert(
        notes.map(n => ({
          id: n.id, user_id: userId, project_id: n.projectId, title: n.title,
          content: n.content, ideas: n.ideas, references: n.references,
          todo_items: n.todoItems, created_at: n.createdAt, updated_at: n.updatedAt,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      )
    }

    const projects: ResearchProject[] = JSON.parse(localStorage.getItem('projects') || '[]')
    if (projects.length > 0) {
      await supabase.from('projects').upsert(
        projects.map(p => ({
          id: p.id, user_id: userId, name: p.name, description: p.description,
          goals: p.goals, color: p.color, created_at: p.createdAt,
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      )
    }

    localStorage.setItem('self_archive_migrated', 'true')
    console.log('localStorage 데이터를 Supabase로 마이그레이션 완료')
  } catch (e) {
    console.error('마이그레이션 실패:', e)
  }
}
