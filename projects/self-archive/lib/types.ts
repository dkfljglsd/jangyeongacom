export type ReadingStatus = '읽지않음' | '읽는중' | '다읽음' | '요약완료' | '아이디어화'

export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  createdAt: string
}

export interface Paper {
  id: string
  title: string
  authors: string
  journal: string
  year: string
  keywords: string[]
  doi: string
  abstract: string
  pdfUrl?: string
  originalFileName?: string
  readingStatus: ReadingStatus
  researchField: string
  purpose: string
  method: string
  result: string
  limitation: string
  myThought: string
  researchIdea: string
  oneSentence: string
  attachments?: Attachment[]
  createdAt: string
  updatedAt: string
}

export interface ThoughtMemo {
  id: string
  thought: string
  summary: string
  why: string
  howToApply: string
  oneSentence: string
  tags: string[]
  attachments?: Attachment[]
  createdAt: string
  updatedAt: string
}

export interface EmotionNote {
  id: string
  emotion: string
  actualEvent: string
  myInterpretation: string
  alternativeView: string
  messageToSelf: string
  attachments?: Attachment[]
  createdAt: string
  updatedAt: string
}

export interface HappinessLog {
  id: string
  happyMoment: string
  food?: string
  spending?: string
  memorableSentence?: string
  achievement?: string
  messageToSelf?: string
  tags: string[]
  attachments?: Attachment[]
  createdAt: string
  updatedAt: string
}

export interface ResearchNote {
  id: string
  projectId: string
  title: string
  noteDate: string
  content: string
  ideas: string[]
  references: string[]
  todoItems: { id: string; text: string; done: boolean }[]
  attachments?: Attachment[]
  createdAt: string
  updatedAt: string
}

export interface TodoItem {
  id: string
  text: string
  done: boolean
  createdAt: string
}

export interface TodoList {
  id: string
  title: string
  items: TodoItem[]
  createdAt: string
  updatedAt: string
}

export interface ResearchProject {
  id: string
  name: string
  description: string
  goals: string[]
  color: string
  createdAt: string
}
