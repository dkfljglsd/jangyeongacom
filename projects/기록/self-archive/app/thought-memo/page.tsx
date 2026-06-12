'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Tag } from 'lucide-react'
import { ThoughtMemo } from '@/lib/types'
import { thoughtStore } from '@/lib/store'

const empty = { thought: '', summary: '', why: '', howToApply: '', oneSentence: '', tags: '' }

export default function ThoughtMemoPage() {
  const [memos, setMemos] = useState<ThoughtMemo[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await thoughtStore.getAll()
    setMemos(data.slice().reverse())
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await thoughtStore.save({
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    })
    setForm(empty)
    setShowForm(false)
    await load()
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">생각 메모</h1>
          <p className="text-sm text-gray-400 mt-0.5">내가 이해한 것, 떠오른 생각을 자기화해서 기록</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-700 transition-colors"
        >
          <Plus size={14} />
          새 생각 기록
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800">새로운 생각 메모</h2>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100">
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          <div>
            <label className={labelClass}>오늘 떠오른 생각</label>
            <textarea required value={form.thought} onChange={set('thought')} rows={2}
              placeholder="어떤 생각이 떠올랐나요?" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>내가 이해한 방식으로 한 줄 요약</label>
            <textarea required value={form.summary} onChange={set('summary')} rows={2}
              placeholder="내 언어로 다시 써보세요" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>왜 이런 생각을 했나?</label>
            <textarea value={form.why} onChange={set('why')} rows={2}
              placeholder="질문의 크기가 생각의 크기를 결정합니다" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>앞으로 어떻게 적용할까?</label>
            <textarea value={form.howToApply} onChange={set('howToApply')} rows={2}
              placeholder="구체적인 행동으로 연결해보세요" className={inputClass} />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <label className="block text-xs font-semibold text-amber-700 mb-2">
              이걸 통해 내가 얻은 한 문장은?
            </label>
            <textarea required value={form.oneSentence} onChange={set('oneSentence')} rows={2}
              placeholder="극단적으로 압축해보세요" className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none bg-white font-medium resize-none" />
          </div>
          <div>
            <label className={labelClass}>태그 (쉼표로 구분)</label>
            <input value={form.tags} onChange={set('tags')} placeholder="연구, 아이디어, 메모" className={inputClass} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              취소
            </button>
            <button type="submit"
              className="flex-1 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700">
              저장
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-24">
          <p className="text-gray-400 text-sm">불러오는 중...</p>
        </div>
      ) : memos.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-4xl mb-4">💡</p>
          <p className="text-gray-500 font-medium">아직 기록한 생각이 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">떠오른 생각을 자기화해서 남겨보세요</p>
        </div>
      ) : (
        <div className="space-y-4">
          {memos.map(memo => (
            <div key={memo.id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between gap-4 mb-3">
                <p className="text-sm text-gray-800 font-medium leading-relaxed">{memo.thought}</p>
                <button onClick={async () => { await thoughtStore.delete(memo.id); await load() }}
                  className="p-1 rounded hover:bg-red-50 transition-colors flex-shrink-0">
                  <X size={14} className="text-gray-400 hover:text-red-400" />
                </button>
              </div>

              {memo.summary && (
                <div className="mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase">요약</span>
                  <p className="text-sm text-gray-700 mt-0.5">{memo.summary}</p>
                </div>
              )}
              {memo.why && (
                <div className="mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase">왜?</span>
                  <p className="text-sm text-gray-600 mt-0.5">{memo.why}</p>
                </div>
              )}

              {memo.oneSentence && (
                <div className="mt-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-xs font-semibold text-amber-600 mb-1">한 문장</p>
                  <p className="text-sm font-medium text-gray-800">{memo.oneSentence}</p>
                </div>
              )}

              {memo.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {memo.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400 mt-3">
                {new Date(memo.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const labelClass = 'block text-xs font-medium text-gray-600 mb-1'
const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 bg-gray-50 transition-colors'
