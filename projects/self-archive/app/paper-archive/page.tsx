'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, PanelLeftClose, PanelLeftOpen, ChevronLeft } from 'lucide-react'
import { Paper, ReadingStatus, Attachment } from '@/lib/types'
import { paperStore } from '@/lib/store'
import { savePdf, getPdf, deletePdf } from '@/lib/pdfStore'
import StatusBadge from '@/components/StatusBadge'
import { FileAttachments } from '@/components/FileAttachments'
import { useIsMobile } from '@/lib/useIsMobile'

const READING_STATUSES: ReadingStatus[] = ['읽지않음', '읽는중', '다읽음', '요약완료', '아이디어화']

const CHOSUNG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const JUNGSUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
const JONGSUNG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'

function decomposeHangul(str: string): string {
  return str.split('').map(ch => {
    const code = ch.charCodeAt(0) - 0xAC00
    if (code < 0 || code > 11171) return ch
    const cho = Math.floor(code / 28 / 21)
    const jung = Math.floor(code / 28) % 21
    const jong = code % 28
    return CHOSUNG[cho] + JUNGSUNG[jung] + (jong ? JONGSUNG[jong] : '')
  }).join('')
}

function matchSearch(text: string, query: string): boolean {
  return decomposeHangul(text.toLowerCase()).includes(decomposeHangul(query.toLowerCase()))
}

function AutoTextarea({ value, onChange, placeholder, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  return (
    <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={1} className={className}
      style={{ resize: 'none', overflow: 'hidden' }} />
  )
}

type Panel = { type: 'new' } | { type: 'view'; paper: Paper } | null

const emptyForm = {
  title: '', authors: '', journal: '', year: '', doi: '', abstract: '',
  keywords: '', researchField: '', readingStatus: '읽지않음' as ReadingStatus,
  purpose: '', method: '', result: '', limitation: '', myThought: '', researchIdea: '', oneSentence: '',
}

export default function PaperArchivePage() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [panel, setPanel] = useState<Panel>(null)
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [isDragging, setIsDragging] = useState(false)
  const isMobile = useIsMobile()
  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const startX = e.clientX, startW = sidebarWidth
    const onMove = (mv: MouseEvent) => setSidebarWidth(Math.max(160, Math.min(480, startW + mv.clientX - startX)))
    const onUp = () => { setIsDragging(false); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  const load = useCallback(() => setPapers(paperStore.getAll().reverse()), [])
  useEffect(() => { load() }, [load])

  const filtered = papers.filter(p =>
    matchSearch(p.title, search) ||
    matchSearch(p.authors, search) ||
    p.keywords.some(k => matchSearch(k, search))
  )

  const activePaperId = panel?.type === 'view' ? panel.paper.id : null

  return (
    <div className="flex h-full relative">
      <button onClick={() => setSidebarOpen(o => !o)}
        className="hidden md:block absolute top-3 right-3 z-10 p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600">
        {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
      </button>

      <div className={[
        'border-r border-gray-200 flex flex-col bg-gray-50',
        !isDragging ? 'transition-all duration-200' : '',
        panel !== null ? 'max-md:hidden' : 'max-md:flex-1',
        !sidebarOpen ? 'md:flex-1' : 'md:flex-shrink-0',
      ].filter(Boolean).join(' ')}
        style={sidebarOpen && !isMobile ? { width: sidebarWidth } : undefined}>
        <div className="px-4 py-3 border-b border-gray-200">
          <h1 className="text-sm font-bold text-gray-900">학술논문 아카이브</h1>
        </div>
        <div className="px-3 py-2 border-b border-gray-200">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="논문 검색..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(paper => (
            <button key={paper.id}
              onClick={() => { setPanel({ type: 'view', paper }); if (!isMobile) setSidebarOpen(true) }}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                activePaperId === paper.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-100'
              }`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs font-medium text-gray-800 leading-snug line-clamp-2 flex-1">{paper.title}</p>
                <span className="text-xs text-gray-300 flex-shrink-0">
                  {new Date(paper.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate mb-1.5">
                {[
                  paper.authors && `👤 ${paper.authors.length > 20 ? paper.authors.slice(0, 20) + '...' : paper.authors}`,
                  paper.year && `📅 ${paper.year}`,
                  paper.journal && `📚 ${paper.journal.length > 20 ? paper.journal.slice(0, 20) + '...' : paper.journal}`,
                  paper.researchField && `🔬 ${paper.researchField.length > 20 ? paper.researchField.slice(0, 20) + '...' : paper.researchField}`,
                  paper.keywords.length > 0 && (() => { const kw = paper.keywords.join(', '); return `🏷 ${kw.length > 20 ? kw.slice(0, 20) + '...' : kw}` })(),
                  `🕒 ${new Date(paper.updatedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
                ].filter(Boolean).join('  ·  ')}
              </p>
              {paper.abstract && (
                <p className="text-xs text-gray-500 truncate mb-1">
                  {paper.abstract.length > 20 ? paper.abstract.slice(0, 20) + '...' : paper.abstract}
                </p>
              )}
              {[
                { label: '연구목적', val: paper.purpose },
                { label: '핵심방법', val: paper.method },
                { label: '주요결과', val: paper.result },
                { label: '한계점', val: paper.limitation },
                { label: '연결점', val: paper.myThought },
                { label: '아이디어', val: paper.researchIdea },
              ].filter(f => f.val).map(({ label, val }) => (
                <p key={label} className="text-xs text-gray-500 truncate mb-0.5">
                  <span className="text-gray-400">{label} </span>
                  {val!.length > 20 ? val!.slice(0, 20) + '...' : val}
                </p>
              ))}
              <div className="mt-1.5">
                <StatusBadge status={paper.readingStatus} />
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">📄</p>
              <p className="text-xs text-gray-400">논문이 없습니다</p>
            </div>
          )}
        </div>
        <div className="p-3 border-t border-gray-200">
          <button onClick={() => { setPanel({ type: 'new' }); if (!isMobile) setSidebarOpen(true) }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              panel?.type === 'new' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-200'
            }`}>
            <Plus size={14} />논문 추가
          </button>
        </div>
      </div>

      <div onMouseDown={sidebarOpen ? onDividerMouseDown : undefined}
        className={`hidden md:flex flex-shrink-0 ${sidebarOpen ? 'w-1 cursor-col-resize hover:bg-blue-200' : 'w-0'} ${isDragging ? 'bg-blue-300' : ''} transition-colors`}
      />
      <div className={[
        'overflow-y-auto transition-all duration-200',
        panel !== null ? 'max-md:fixed max-md:inset-0 max-md:z-20 max-md:bg-white max-md:pb-14' : 'max-md:hidden',
        sidebarOpen ? 'md:flex-1' : 'md:w-0 md:overflow-hidden',
      ].join(' ')}>
        {panel !== null && (
          <button onClick={() => setPanel(null)}
            className="md:hidden flex items-center gap-1.5 w-full px-4 py-3.5 text-sm text-blue-600 border-b border-gray-100 bg-white active:bg-gray-50">
            <ChevronLeft size={16} />목록으로
          </button>
        )}
        {panel?.type === 'new' && (
          <PaperEditor
            onCancel={() => setPanel(null)}
            onCreate={saved => { load(); setPanel({ type: 'view', paper: saved }) }}
          />
        )}
        {panel?.type === 'view' && (
          <PaperEditor
            paper={panel.paper}
            onDelete={() => { paperStore.delete(panel.paper.id); load(); setPanel(null) }}
            onUpdate={updated => { load(); setPanel({ type: 'view', paper: updated }) }}
          />
        )}
        {panel === null && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-4xl mb-4">⚛</p>
            <p className="text-gray-400 text-sm">논문을 선택하거나 새로 추가해보세요</p>
          </div>
        )}
      </div>
    </div>
  )
}

function PaperEditor({ paper, onDelete, onUpdate, onCreate, onCancel }: {
  paper?: Paper
  onDelete?: () => void
  onUpdate?: (p: Paper) => void
  onCreate?: (p: Paper) => void
  onCancel?: () => void
}) {
  const [form, setForm] = useState(paper ? {
    title: paper.title, authors: paper.authors, journal: paper.journal,
    year: paper.year, doi: paper.doi, abstract: paper.abstract,
    keywords: paper.keywords.join(', '), researchField: paper.researchField,
    readingStatus: paper.readingStatus,
    purpose: paper.purpose, method: paper.method, result: paper.result,
    limitation: paper.limitation, myThought: paper.myThought,
    researchIdea: paper.researchIdea, oneSentence: paper.oneSentence,
  } : emptyForm)
  const [savedId, setSavedId] = useState<string | null>(paper?.id ?? null)
  const [attachments, setAttachments] = useState<Attachment[]>(paper?.attachments ?? [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const blobUrlRef = useRef<string | null>(null)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [pdfName, setPdfName] = useState(paper?.originalFileName ?? '')
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)

  useEffect(() => {
    if (!paper) return
    setForm({
      title: paper.title, authors: paper.authors, journal: paper.journal,
      year: paper.year, doi: paper.doi, abstract: paper.abstract,
      keywords: paper.keywords.join(', '), researchField: paper.researchField,
      readingStatus: paper.readingStatus,
      purpose: paper.purpose, method: paper.method, result: paper.result,
      limitation: paper.limitation, myThought: paper.myThought,
      researchIdea: paper.researchIdea, oneSentence: paper.oneSentence,
    })
    setAttachments(paper.attachments ?? [])
    setSavedId(paper.id)
  }, [paper?.id])

  useEffect(() => {
    if (!paper?.pdfUrl || !paper.id) return
    getPdf(paper.id).then(data => {
      if (!data) return
      const blob = new Blob([data.buf], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = url
      setPdfBlobUrl(url)
      setPdfName(data.name)
    })
  }, [paper?.id])

  useEffect(() => {
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current) }
  }, [])

  const save = useCallback((currentForm: typeof emptyForm) => {
    if (!currentForm.title.trim()) return
    const data = {
      ...currentForm,
      keywords: currentForm.keywords.split(',').map(k => k.trim()).filter(Boolean),
    }
    if (savedId) {
      const updated = paperStore.update(savedId, data)
      if (updated) onUpdate?.(updated)
    } else {
      const created = paperStore.save({ ...data, pdfUrl: undefined, originalFileName: undefined })
      setSavedId(created.id)
      onCreate?.(created)
    }
  }, [savedId, onUpdate, onCreate])

  const handleBlur = useCallback(() => save(form), [save, form])

  const handleAttachmentsChange = useCallback((newAtts: Attachment[]) => {
    setAttachments(newAtts)
    if (savedId) paperStore.update(savedId, { attachments: newAtts })
  }, [savedId])

  const saveNow = useCallback((): string | null => {
    if (!form.title.trim()) return null
    if (savedId) return savedId
    const data = { ...form, keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean) }
    const created = paperStore.save({ ...data, pdfUrl: undefined, originalFileName: undefined })
    setSavedId(created.id)
    onCreate?.(created)
    return created.id
  }, [form, savedId, onCreate])

  const handlePdfUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const id = savedId ?? saveNow()
    if (!id) return
    await savePdf(id, file)
    paperStore.update(id, { pdfUrl: 'idb:attached', originalFileName: file.name })
    const url = URL.createObjectURL(file)
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    blobUrlRef.current = url
    setPdfBlobUrl(url)
    setPdfName(file.name)
    setPdfViewerOpen(true)
  }, [savedId, saveNow])

  const handlePdfDelete = useCallback(async () => {
    if (!savedId) return
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
    setPdfBlobUrl(null)
    setPdfName('')
    setPdfViewerOpen(false)
    await deletePdf(savedId)
    paperStore.update(savedId, { pdfUrl: undefined, originalFileName: undefined })
  }, [savedId])

  return (
    <div className="max-w-3xl mx-auto px-16 py-16">
      <div className="flex justify-end mb-6">
        {savedId
          ? <button onClick={onDelete} className="text-xs text-gray-300 hover:text-red-400 transition-colors">삭제</button>
          : <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">취소</button>
        }
      </div>
      <PaperFields form={form} setForm={setForm} onBlur={handleBlur} />

      <div className="border-t border-gray-100 pt-5 mt-2">
        {pdfBlobUrl ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setPdfViewerOpen(o => !o)}
                className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest hover:text-gray-700 transition-colors">
                <span className={`transition-transform duration-150 text-gray-400 ${pdfViewerOpen ? 'rotate-90' : ''}`}>▶</span>
                📎 {pdfName}
              </button>
              <div className="flex items-center gap-3">
                <a href={pdfBlobUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-600 transition-colors">새 탭에서 열기</a>
                <button onClick={handlePdfDelete}
                  className="text-xs text-gray-300 hover:text-red-400 transition-colors">삭제</button>
              </div>
            </div>
            {pdfViewerOpen && (
              <iframe src={pdfBlobUrl} className="w-full rounded border border-gray-100" style={{ height: '700px' }} />
            )}
          </>
        ) : (
          <>
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">
              <span className="text-gray-300">+</span>
              PDF 첨부
            </button>
          </>
        )}
      </div>

      <div className="border-t border-gray-100 pt-5 mt-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">📎 첨부 파일</p>
        <FileAttachments
          entityType="paper"
          entityId={savedId}
          attachments={attachments}
          onChange={handleAttachmentsChange}
        />
      </div>
    </div>
  )
}

function PaperFields({ form, setForm, onBlur }: {
  form: typeof emptyForm
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>
  onBlur?: () => void
}) {
  const [abstractOpen, setAbstractOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(true)
  const [oneSentenceOpen, setOneSentenceOpen] = useState(true)

  return (
    <>
      <AutoTextarea value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))}
        placeholder="논문 제목"
        className="w-full text-4xl font-bold text-gray-900 placeholder-gray-200 bg-transparent border-none outline-none leading-tight mb-6" />

      <div className="flex flex-wrap gap-2 mb-8">
        {READING_STATUSES.map(s => (
          <button key={s} onClick={() => { setForm(f => ({ ...f, readingStatus: s })); onBlur?.() }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              form.readingStatus === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-2 text-sm mb-8" onBlur={onBlur}>
        <div className="flex items-center gap-3">
          <span className="w-24 text-xs font-medium text-gray-400">👤 저자</span>
          <input value={form.authors} onChange={e => setForm(f => ({ ...f, authors: e.target.value }))} onBlur={onBlur}
            placeholder="저자명"
            className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-300" />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-24 text-xs font-medium text-gray-400">📅 출판연도</span>
          <input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} onBlur={onBlur}
            placeholder="2024"
            className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-300" />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-24 text-xs font-medium text-gray-400">📚 저널</span>
          <input value={form.journal} onChange={e => setForm(f => ({ ...f, journal: e.target.value }))} onBlur={onBlur}
            placeholder="Journal name"
            className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-300" />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-24 text-xs font-medium text-gray-400">🔗 DOI</span>
          <input value={form.doi} onChange={e => setForm(f => ({ ...f, doi: e.target.value }))} onBlur={onBlur}
            placeholder="10.xxxx/xxxxx"
            className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-300 font-mono text-xs" />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-24 text-xs font-medium text-gray-400">🔬 연구 분야</span>
          <input value={form.researchField} onChange={e => setForm(f => ({ ...f, researchField: e.target.value }))} onBlur={onBlur}
            placeholder="예: CVAP, 딥러닝, 원자력"
            className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-300" />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-24 text-xs font-medium text-gray-400">🏷 키워드</span>
          <input value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} onBlur={onBlur}
            placeholder="CVAP, Pump, Fault Detection"
            className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-300" />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-5 mb-6">
        <button onClick={() => setAbstractOpen(o => !o)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 hover:text-gray-700 transition-colors w-full text-left">
          <span className={`transition-transform duration-150 text-gray-400 ${abstractOpen ? 'rotate-90' : ''}`}>▶</span>
          초록
        </button>
        {abstractOpen && (
          <AutoTextarea value={form.abstract} onChange={v => setForm(f => ({ ...f, abstract: v }))}
            placeholder="논문 초록"
            className="w-full text-base text-gray-700 placeholder-gray-300 bg-transparent border-none outline-none leading-relaxed" />
        )}
      </div>

      <div className="border-t border-gray-100 pt-5 mb-6">
        <button onClick={() => setNotesOpen(o => !o)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 hover:text-gray-700 transition-colors w-full text-left">
          <span className={`transition-transform duration-150 text-gray-400 ${notesOpen ? 'rotate-90' : ''}`}>▶</span>
          내 논문 노트
        </button>
        {notesOpen && (
          <div className="space-y-6" onBlur={onBlur}>
            {[
              { key: 'purpose', label: '1. 연구 목적' },
              { key: 'method', label: '2. 핵심 방법' },
              { key: 'result', label: '3. 주요 결과' },
              { key: 'limitation', label: '4. 한계점' },
              { key: 'myThought', label: '5. 내 연구와 연결점' },
              { key: 'researchIdea', label: '6. 후속 연구 아이디어' },
            ].map(({ key, label }) => (
              <div key={key}>
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-2">{label}</p>
                <AutoTextarea value={form[key as keyof typeof form] as string}
                  onChange={v => setForm(f => ({ ...f, [key]: v }))}
                  placeholder="자유롭게 작성하세요"
                  className="w-full text-base text-gray-700 placeholder-gray-300 bg-transparent border-none outline-none leading-relaxed" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-5">
        <button onClick={() => setOneSentenceOpen(o => !o)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 hover:text-gray-700 transition-colors w-full text-left">
          <span className={`transition-transform duration-150 text-gray-400 ${oneSentenceOpen ? 'rotate-90' : ''}`}>▶</span>
          한 문장으로
        </button>
        {oneSentenceOpen && (
          <AutoTextarea value={form.oneSentence} onChange={v => setForm(f => ({ ...f, oneSentence: v }))}
            placeholder="핵심을 한 문장으로 압축해보세요"
            className="w-full text-base font-medium text-gray-900 placeholder-gray-300 bg-transparent border-none outline-none leading-relaxed" />
        )}
      </div>
    </>
  )
}
