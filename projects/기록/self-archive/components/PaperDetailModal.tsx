'use client'

import { useState } from 'react'
import { X, Pencil, Trash2 } from 'lucide-react'
import { Paper, ReadingStatus } from '@/lib/types'
import { paperStore } from '@/lib/store'
import StatusBadge from './StatusBadge'

const READING_STATUSES: ReadingStatus[] = ['읽지않음', '읽는중', '다읽음', '요약완료', '아이디어화']

interface Props {
  paper: Paper
  onClose: () => void
  onDelete: () => void
  onEdit: () => void
  onUpdate: (updated: Paper) => void
}

export default function PaperDetailModal({ paper, onClose, onDelete, onEdit, onUpdate }: Props) {
  const [status, setStatus] = useState<ReadingStatus>(paper.readingStatus)
  const [notes, setNotes] = useState({
    purpose: paper.purpose,
    method: paper.method,
    result: paper.result,
    limitation: paper.limitation,
    myThought: paper.myThought,
    researchIdea: paper.researchIdea,
    oneSentence: paper.oneSentence,
  })
  const [saving, setSaving] = useState(false)

  const handleStatusChange = async (newStatus: ReadingStatus) => {
    setStatus(newStatus)
    const updated = await paperStore.update(paper.id, { readingStatus: newStatus })
    if (updated) onUpdate(updated)
  }

  const handleSaveNotes = async () => {
    setSaving(true)
    const updated = await paperStore.update(paper.id, { ...notes, readingStatus: status })
    if (updated) onUpdate(updated)
    setTimeout(() => setSaving(false), 800)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gray-400">⚛</span>
                <h2 className="text-lg font-bold text-gray-900 leading-snug">{paper.title}</h2>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{paper.authors}</span>
                {paper.year && <><span>·</span><span>{paper.year}</span></>}
                {paper.journal && <><span>·</span><span>{paper.journal}</span></>}
                {paper.doi && <><span>·</span><span className="font-mono text-xs">{paper.doi}</span></>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <Pencil size={15} className="text-gray-500" />
              </button>
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 size={15} className="text-red-400" />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          {paper.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {paper.keywords.map(k => (
                <span key={k} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{k}</span>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Status selector */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">읽기 상태</p>
            <div className="flex flex-wrap gap-2">
              {READING_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    status === s
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {paper.abstract && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">초록</p>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl">{paper.abstract}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">내 논문 노트</p>
            <div className="space-y-3">
              {[
                { key: 'purpose', label: '1. 연구 목적' },
                { key: 'method', label: '2. 핵심 방법' },
                { key: 'result', label: '3. 주요 결과' },
                { key: 'limitation', label: '4. 한계점' },
                { key: 'myThought', label: '5. 내 연구와 연결점' },
                { key: 'researchIdea', label: '6. 후속 연구 아이디어' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <textarea
                    value={notes[key as keyof typeof notes]}
                    onChange={e => setNotes(n => ({ ...n, [key]: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 bg-gray-50 resize-none transition-colors"
                  />
                </div>
              ))}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <label className="block text-xs font-semibold text-amber-700 mb-2">
                  이 논문을 통해 내가 얻은 한 문장은?
                </label>
                <textarea
                  value={notes.oneSentence}
                  onChange={e => setNotes(n => ({ ...n, oneSentence: e.target.value }))}
                  rows={2}
                  placeholder="핵심을 한 문장으로 압축해보세요..."
                  className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-100 bg-white resize-none font-medium"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveNotes}
            className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            {saving ? '저장됨 ✓' : '노트 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
