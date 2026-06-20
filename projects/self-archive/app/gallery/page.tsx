'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Download } from 'lucide-react'
import {
  researchNoteStore, workNoteStore, thoughtStore,
  emotionStore, happinessStore, paperStore,
} from '@/lib/store'
import { fileStore } from '@/lib/fileStore'
import { Attachment } from '@/lib/types'

interface GalleryItem {
  key: string
  attachment: Attachment
  entityLabel: string
  entityName: string
}

function fileIcon(type: string, name: string): string {
  if (type.startsWith('image/')) return '🖼️'
  if (type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return '📄'
  if (name.toLowerCase().endsWith('.hwp') || name.toLowerCase().endsWith('.hwpx')) return '📝'
  if (name.toLowerCase().endsWith('.doc') || name.toLowerCase().endsWith('.docx')) return '📃'
  return '📎'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function collectAll(): GalleryItem[] {
  const items: GalleryItem[] = []

  researchNoteStore.getAll().forEach(n =>
    n.attachments?.forEach(att => items.push({
      key: `research_${n.id}_${att.id}`,
      attachment: att,
      entityLabel: '연구 노트',
      entityName: n.title || '연구 노트',
    }))
  )
  workNoteStore.getAll().forEach(n =>
    n.attachments?.forEach(att => items.push({
      key: `worknote_${n.id}_${att.id}`,
      attachment: att,
      entityLabel: '업무 노트',
      entityName: n.title || '업무 노트',
    }))
  )
  thoughtStore.getAll().forEach(n =>
    n.attachments?.forEach(att => items.push({
      key: `thought_${n.id}_${att.id}`,
      attachment: att,
      entityLabel: '생각 메모',
      entityName: n.thought || '생각 메모',
    }))
  )
  emotionStore.getAll().forEach(n =>
    n.attachments?.forEach(att => items.push({
      key: `emotion_${n.id}_${att.id}`,
      attachment: att,
      entityLabel: '감정 노트',
      entityName: n.emotion || '감정 노트',
    }))
  )
  happinessStore.getAll().forEach(n =>
    n.attachments?.forEach(att => items.push({
      key: `happiness_${n.id}_${att.id}`,
      attachment: att,
      entityLabel: '행복 기록',
      entityName: n.happyMoment || '행복 기록',
    }))
  )
  paperStore.getAll().forEach(n =>
    n.attachments?.forEach(att => items.push({
      key: `paper_${n.id}_${att.id}`,
      attachment: att,
      entityLabel: '문헌 아카이브',
      entityName: n.title || '문헌',
    }))
  )

  return items.sort((a, b) =>
    b.attachment.createdAt.localeCompare(a.attachment.createdAt)
  )
}

export default function GalleryPage() {
  const [items] = useState<GalleryItem[]>(() => collectAll())
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<'all' | 'image' | 'doc'>('all')
  const [fullscreen, setFullscreen] = useState<GalleryItem | null>(null)
  const [docModal, setDocModal] = useState<{ item: GalleryItem; url: string; isPdf: boolean } | null>(null)
  const previewsRef = useRef<Record<string, string>>({})
  const docUrlRef = useRef<string | null>(null)

  useEffect(() => { previewsRef.current = previews }, [previews])
  useEffect(() => () => {
    Object.values(previewsRef.current).forEach(u => URL.revokeObjectURL(u))
    if (docUrlRef.current) URL.revokeObjectURL(docUrlRef.current)
  }, [])

  const handleDocClick = useCallback(async (item: GalleryItem) => {
    const stored = await fileStore.get(item.key)
    if (!stored) return
    if (docUrlRef.current) URL.revokeObjectURL(docUrlRef.current)
    const url = URL.createObjectURL(stored.blob)
    docUrlRef.current = url
    const isPdf = item.attachment.type === 'application/pdf' || item.attachment.name.toLowerCase().endsWith('.pdf')
    setDocModal({ item, url, isPdf })
  }, [])

  const closeDocModal = useCallback(() => {
    if (docUrlRef.current) { URL.revokeObjectURL(docUrlRef.current); docUrlRef.current = null }
    setDocModal(null)
  }, [])

  useEffect(() => {
    const loaded = new Set<string>()
    items.forEach(item => {
      if (!item.attachment.type.startsWith('image/')) return
      if (loaded.has(item.key)) return
      loaded.add(item.key)
      fileStore.get(item.key).then(stored => {
        if (!stored) return
        const url = URL.createObjectURL(stored.blob)
        setPreviews(p => ({ ...p, [item.key]: url }))
      })
    })
  }, [items])

  const images = items.filter(i => i.attachment.type.startsWith('image/'))
  const docs = items.filter(i => !i.attachment.type.startsWith('image/'))
  const visibleImages = filter !== 'doc' ? images : []
  const visibleDocs = filter !== 'image' ? docs : []

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-4xl mb-4">🗂️</p>
        <p className="text-gray-400 text-sm">아직 첨부된 파일이 없습니다</p>
        <p className="text-gray-300 text-xs mt-1">노트에 파일을 첨부하면 여기서 모아볼 수 있어요</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 pb-20">
      <h1 className="text-xl font-bold text-gray-900 mb-6">파일 갤러리</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'all', label: `전체 ${items.length}` },
          { key: 'image', label: `이미지 ${images.length}` },
          { key: 'doc', label: `문서 ${docs.length}` },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Image masonry grid */}
      {visibleImages.length > 0 && (
        <div className="columns-2 sm:columns-3 md:columns-4 gap-3 mb-8">
          {visibleImages.map(item => {
            const url = previews[item.key]
            return (
              <div key={item.key}
                className="break-inside-avoid mb-3 group relative cursor-pointer"
                onClick={() => url && setFullscreen(item)}>
                {url ? (
                  <img src={url} alt={item.attachment.name}
                    className="w-full rounded-xl object-cover hover:opacity-90 transition-opacity" />
                ) : (
                  <div className="w-full h-28 rounded-xl bg-gray-100 animate-pulse" />
                )}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-transparent via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <p className="text-xs text-white/90 truncate drop-shadow">{item.entityLabel}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Document list */}
      {visibleDocs.length > 0 && (
        <div>
          {filter === 'all' && images.length > 0 && (
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">문서</h2>
          )}
          <div className="space-y-2">
            {visibleDocs.map(item => (
              <button key={item.key}
                onClick={() => handleDocClick(item)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors text-left group">
                <span className="text-2xl leading-none flex-shrink-0">
                  {fileIcon(item.attachment.type, item.attachment.name)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate font-medium">{item.attachment.name}</p>
                  <p className="text-xs text-gray-400">{item.entityLabel} · {item.entityName} · {formatSize(item.attachment.size)}</p>
                </div>
                <span className="text-xs text-gray-300 flex-shrink-0 group-hover:hidden">
                  {new Date(item.attachment.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-xs text-blue-400 flex-shrink-0 hidden group-hover:flex items-center gap-1">
                  <Download size={12} />열기
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image fullscreen modal */}
      {fullscreen && previews[fullscreen.key] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setFullscreen(null)}>
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white p-2 transition-colors"
            onClick={() => setFullscreen(null)}>
            <X size={24} />
          </button>
          <div className="absolute top-4 left-4">
            <p className="text-sm font-medium text-white/80 truncate max-w-xs">{fullscreen.attachment.name}</p>
            <p className="text-xs text-white/50">{fullscreen.entityLabel} · {fullscreen.entityName}</p>
          </div>
          <img
            src={previews[fullscreen.key]}
            alt={fullscreen.attachment.name}
            className="max-w-full max-h-full object-contain rounded"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
            onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Document modal */}
      {docModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90"
          onClick={e => { if (e.target === e.currentTarget) closeDocModal() }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white/5 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{docModal.item.attachment.name}</p>
              <p className="text-xs text-white/50">{docModal.item.entityLabel} · {docModal.item.entityName}</p>
            </div>
            <a href={docModal.url} download={docModal.item.attachment.name}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors flex-shrink-0">
              <Download size={13} />다운로드
            </a>
            <button onClick={closeDocModal}
              className="text-white/60 hover:text-white p-1.5 transition-colors flex-shrink-0">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {docModal.isPdf ? (
              <iframe src={docModal.url} title={docModal.item.attachment.name}
                className="w-full h-full" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <p className="text-5xl mb-4">{fileIcon(docModal.item.attachment.type, docModal.item.attachment.name)}</p>
                <p className="text-white font-medium mb-1">{docModal.item.attachment.name}</p>
                <p className="text-white/50 text-sm mb-6">{formatSize(docModal.item.attachment.size)}</p>
                <p className="text-white/40 text-xs mb-6">이 파일 형식은 브라우저에서 미리볼 수 없어요</p>
                <a href={docModal.url} download={docModal.item.attachment.name}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors">
                  <Download size={15} />다운로드
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
