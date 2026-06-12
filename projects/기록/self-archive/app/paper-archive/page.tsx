'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, SlidersHorizontal, ArrowUpDown, LayoutList, Columns } from 'lucide-react'
import { Paper, ReadingStatus } from '@/lib/types'
import { paperStore } from '@/lib/store'
import StatusBadge from '@/components/StatusBadge'
import PaperModal from '@/components/PaperModal'
import PaperDetailModal from '@/components/PaperDetailModal'

type ViewMode = 'table' | 'field' | 'status'

const STATUS_COLUMNS: ReadingStatus[] = ['읽지않음', '읽는중', '다읽음', '요약완료', '아이디어화']

export default function PaperArchivePage() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [view, setView] = useState<ViewMode>('table')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null)
  const [detailPaper, setDetailPaper] = useState<Paper | null>(null)
  const [loading, setLoading] = useState(true)

  const loadPapers = useCallback(async () => {
    const data = await paperStore.getAll()
    setPapers(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadPapers()
  }, [loadPapers])

  const filtered = papers.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.authors.toLowerCase().includes(search.toLowerCase()) ||
    p.keywords.some(k => k.toLowerCase().includes(search.toLowerCase()))
  )

  const byStatus = STATUS_COLUMNS.reduce<Record<string, Paper[]>>((acc, status) => {
    acc[status] = filtered.filter(p => p.readingStatus === status)
    return acc
  }, {})

  const allFields = Array.from(new Set(filtered.map(p => p.researchField).filter(Boolean)))
  const byField = allFields.reduce<Record<string, Paper[]>>((acc, field) => {
    acc[field] = filtered.filter(p => p.researchField === field)
    return acc
  }, {})

  const handleSave = async () => {
    await loadPapers()
    setShowModal(false)
    setEditingPaper(null)
  }

  const handleDelete = async (id: string) => {
    await paperStore.delete(id)
    await loadPapers()
    setDetailPaper(null)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚛</span>
          <h1 className="text-2xl font-bold text-gray-900">학술논문 아카이브</h1>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center justify-between mb-6 border-b border-gray-200">
        <div className="flex gap-0">
          {[
            { mode: 'table' as ViewMode, label: '모든 논문', icon: LayoutList },
            { mode: 'field' as ViewMode, label: '연구 분야별', icon: Columns },
            { mode: 'status' as ViewMode, label: '읽기 상태별', icon: Columns },
          ].map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                view === mode
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="논문 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 w-52"
            />
          </div>
          <button className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <SlidersHorizontal size={15} />
          </button>
          <button className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <ArrowUpDown size={15} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={14} />
            논문 추가
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24">
          <p className="text-gray-400 text-sm">불러오는 중...</p>
        </div>
      ) : (
        <>
          {/* Table View */}
          {view === 'table' && (
            <div className="overflow-x-auto">
              {filtered.length === 0 ? (
                <EmptyState onAdd={() => setShowModal(true)} />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {[
                        { label: '논문 제목', icon: '📝' },
                        { label: '저자', icon: '👥' },
                        { label: '저널/학회', icon: '📚' },
                        { label: '출판연도', icon: '📅' },
                        { label: '상태', icon: '📖' },
                      ].map(col => (
                        <th key={col.label} className="text-left py-3 px-4 text-gray-500 font-medium">
                          <span className="flex items-center gap-1.5">
                            <span>{col.icon}</span>
                            {col.label}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(paper => (
                      <tr
                        key={paper.id}
                        onClick={() => setDetailPaper(paper)}
                        className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-start gap-2">
                            <span className="text-gray-400 mt-0.5">⚛</span>
                            <span className="text-gray-800 font-medium leading-snug">{paper.title}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-600">{paper.authors}</td>
                        <td className="py-4 px-4 text-gray-600">{paper.journal}</td>
                        <td className="py-4 px-4 text-gray-600">{paper.year}</td>
                        <td className="py-4 px-4">
                          <StatusBadge status={paper.readingStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Field Board View */}
          {view === 'field' && (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {allFields.length === 0 ? (
                <EmptyState onAdd={() => setShowModal(true)} />
              ) : (
                allFields.map(field => (
                  <div key={field} className="min-w-72 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                        {field}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {byField[field].map(paper => (
                        <PaperCard key={paper.id} paper={paper} onClick={() => setDetailPaper(paper)} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Status Board View */}
          {view === 'status' && (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {STATUS_COLUMNS.filter(s => byStatus[s]?.length > 0 || true).slice(0, 3).map(status => (
                <div key={status} className="min-w-72 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <StatusBadge status={status} />
                  </div>
                  <div className="space-y-3">
                    {(byStatus[status] || []).map(paper => (
                      <PaperCard key={paper.id} paper={paper} onClick={() => setDetailPaper(paper)} />
                    ))}
                    {(byStatus[status] || []).length === 0 && (
                      <div className="text-sm text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                        없음
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showModal && (
        <PaperModal
          paper={editingPaper}
          onClose={() => { setShowModal(false); setEditingPaper(null) }}
          onSave={handleSave}
        />
      )}

      {detailPaper && (
        <PaperDetailModal
          paper={detailPaper}
          onClose={() => setDetailPaper(null)}
          onDelete={() => handleDelete(detailPaper.id)}
          onEdit={() => { setEditingPaper(detailPaper); setDetailPaper(null); setShowModal(true) }}
          onUpdate={(updated) => { setDetailPaper(updated); loadPapers() }}
        />
      )}
    </div>
  )
}

function PaperCard({ paper, onClick }: { paper: Paper; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-gray-400 mt-0.5 text-sm">⚛</span>
        <p className="text-sm font-medium text-gray-800 leading-snug">{paper.title}</p>
      </div>
      <p className="text-xs text-gray-500 mb-1">{paper.authors}</p>
      <p className="text-xs text-gray-400">{paper.year}</p>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="text-4xl mb-4">📄</span>
      <p className="text-gray-500 font-medium mb-2">등록된 논문이 없습니다</p>
      <p className="text-sm text-gray-400 mb-6">PDF를 업로드해서 논문을 등록해보세요</p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
      >
        <Plus size={14} />
        첫 번째 논문 추가하기
      </button>
    </div>
  )
}
