'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Paperclip, X } from 'lucide-react'
import { Attachment } from '@/lib/types'
import { fileStore, detectMime } from '@/lib/fileStore'

const ACCEPT = '.pdf,.hwp,.hwpx,.doc,.docx,image/jpeg,image/png,image/gif,image/webp,image/*'

function fkey(entityType: string, entityId: string, attachmentId: string): string {
  return `${entityType}_${entityId}_${attachmentId}`
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function fileIcon(type: string, name: string): string {
  if (type.startsWith('image/')) return '🖼️'
  if (type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return '📄'
  if (type.includes('hwp') || name.toLowerCase().endsWith('.hwp') || name.toLowerCase().endsWith('.hwpx')) return '📝'
  if (type.includes('word') || name.toLowerCase().endsWith('.doc') || name.toLowerCase().endsWith('.docx')) return '📃'
  return '📎'
}

interface Props {
  entityType: string
  entityId: string | null
  attachments: Attachment[]
  onChange: (attachments: Attachment[]) => void
}

export function FileAttachments({ entityType, entityId, attachments, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [imgPreviews, setImgPreviews] = useState<Record<string, string>>({})
  const [pdfModal, setPdfModal] = useState<{ url: string; name: string } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const loadedIds = useRef<Set<string>>(new Set())
  const pdfModalUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!entityId) return
    for (const att of attachments) {
      if (att.type.startsWith('image/') && !loadedIds.current.has(att.id)) {
        loadedIds.current.add(att.id)
        fileStore.get(fkey(entityType, entityId, att.id)).then(stored => {
          if (!stored) return
          const url = URL.createObjectURL(stored.blob)
          setImgPreviews(p => ({ ...p, [att.id]: url }))
        })
      }
    }
  }, [attachments, entityId, entityType])

  useEffect(() => {
    return () => {
      Object.values(imgPreviews).forEach(url => URL.revokeObjectURL(url))
      if (pdfModalUrlRef.current) URL.revokeObjectURL(pdfModalUrlRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFiles = useCallback(async (files: FileList) => {
    if (!entityId) return
    const added: Attachment[] = []
    for (const file of Array.from(files)) {
      const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
      await fileStore.save(fkey(entityType, entityId, id), file)
      const type = file.type || detectMime(file.name)
      const attachment: Attachment = {
        id, name: file.name, type, size: file.size,
        createdAt: new Date().toISOString(),
      }
      added.push(attachment)
      if (type.startsWith('image/')) {
        loadedIds.current.add(id)
        const url = URL.createObjectURL(file)
        setImgPreviews(p => ({ ...p, [id]: url }))
      }
    }
    onChange([...attachments, ...added])
  }, [entityId, entityType, attachments, onChange])

  const handleRemove = useCallback(async (att: Attachment) => {
    if (!entityId) return
    await fileStore.delete(fkey(entityType, entityId, att.id))
    loadedIds.current.delete(att.id)
    setImgPreviews(p => {
      if (p[att.id]) URL.revokeObjectURL(p[att.id])
      const next = { ...p }
      delete next[att.id]
      return next
    })
    onChange(attachments.filter(a => a.id !== att.id))
  }, [entityId, entityType, attachments, onChange])

  const handleOpen = useCallback(async (att: Attachment) => {
    if (!entityId) return
    const stored = await fileStore.get(fkey(entityType, entityId, att.id))
    if (!stored) return
    const url = URL.createObjectURL(stored.blob)
    const isPdf = att.type === 'application/pdf' || att.name.toLowerCase().endsWith('.pdf')
    const isImage = att.type.startsWith('image/')
    if (isPdf) {
      if (pdfModalUrlRef.current) URL.revokeObjectURL(pdfModalUrlRef.current)
      pdfModalUrlRef.current = url
      setPdfModal({ url, name: att.name })
    } else if (isImage) {
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } else {
      const a = document.createElement('a')
      a.href = url; a.download = att.name; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    }
  }, [entityId, entityType])

  const closePdf = useCallback(() => {
    if (pdfModalUrlRef.current) { URL.revokeObjectURL(pdfModalUrlRef.current); pdfModalUrlRef.current = null }
    setPdfModal(null)
  }, [])

  if (!entityId) {
    return <p className="text-xs text-gray-300 italic py-1">내용을 먼저 입력하면 파일을 첨부할 수 있어요</p>
  }

  return (
    <>
      {attachments.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-2 group min-w-0">
              {att.type.startsWith('image/') && imgPreviews[att.id] ? (
                <img
                  src={imgPreviews[att.id]} alt={att.name}
                  onClick={() => window.open(imgPreviews[att.id], '_blank')}
                  className="w-9 h-9 rounded object-cover border border-gray-200 cursor-zoom-in flex-shrink-0 hover:opacity-80"
                />
              ) : (
                <span className="w-9 text-center text-base flex-shrink-0 leading-none">{fileIcon(att.type, att.name)}</span>
              )}
              <button
                type="button"
                onClick={() => handleOpen(att)}
                className="flex-1 text-left text-sm text-gray-600 hover:text-blue-500 truncate transition-colors min-w-0"
              >
                {att.name}
              </button>
              <span className="text-xs text-gray-300 flex-shrink-0 tabular-nums">{formatSize(att.size)}</span>
              <button
                type="button"
                onClick={() => handleRemove(att)}
                className="p-0.5 text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                title="삭제"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={e => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer select-none transition-colors ${
          isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Paperclip size={12} className="text-gray-300 flex-shrink-0" />
        <span className="text-xs text-gray-400">파일 첨부 — PDF · 한글(.hwp) · 이미지 · 드래그 가능</span>
        <input
          ref={inputRef} type="file" multiple className="hidden"
          accept={ACCEPT}
          onChange={e => { if (e.target.files?.length) { handleFiles(e.target.files); e.target.value = '' } }}
        />
      </div>

      {pdfModal && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={e => { if (e.target === e.currentTarget) closePdf() }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 text-white text-sm flex-shrink-0">
            <span className="truncate mr-4">{pdfModal.name}</span>
            <div className="flex items-center gap-4 flex-shrink-0">
              <a href={pdfModal.url} target="_blank" rel="noreferrer"
                className="text-xs text-gray-400 hover:text-white transition-colors">새 탭</a>
              <button onClick={closePdf} className="text-gray-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>
          <iframe src={pdfModal.url} className="flex-1 w-full bg-white" title={pdfModal.name} />
        </div>
      )}
    </>
  )
}
