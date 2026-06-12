'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Tag } from 'lucide-react'
import { HappinessLog } from '@/lib/types'
import { happinessStore } from '@/lib/store'

const empty = { happyMoment: '', food: '', spending: '', memorableSentence: '', achievement: '', messageToSelf: '', tags: '' }

export default function HappinessPage() {
  const [logs, setLogs] = useState<HappinessLog[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await happinessStore.getAll()
    setLogs(data.slice().reverse())
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await happinessStore.save({
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    })
    setForm(empty)
    setShowForm(false)
    await load()
  }

  const thisWeekLogs = logs.filter(log => {
    const logDate = new Date(log.createdAt)
    const now = new Date()
    const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= 7
  })

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">행복 기록</h1>
          <p className="text-sm text-gray-400 mt-0.5">좋았던 순간을 그냥 지나치지 않고 기록하기</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm rounded-xl hover:bg-green-600 transition-colors"
        >
          <Plus size={14} />
          행복 기록하기
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 bg-white border border-green-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800">오늘의 행복한 순간</h2>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100">
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          <div>
            <label className={labelClass}>행복했던 순간 *</label>
            <textarea required value={form.happyMoment} onChange={set('happyMoment')} rows={2}
              placeholder="오늘 어떤 순간이 좋았나요?" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>기억에 남는 음식</label>
              <input value={form.food} onChange={set('food')} placeholder="예: 연어덮밥" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>좋은 소비</label>
              <input value={form.spending} onChange={set('spending')} placeholder="예: 노트 구매" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>기억하고 싶은 문장</label>
            <input value={form.memorableSentence} onChange={set('memorableSentence')}
              placeholder="오늘 만난 좋은 문장이 있나요?" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>이번의 성취</label>
            <input value={form.achievement} onChange={set('achievement')}
              placeholder="작은 성취도 좋아요" className={inputClass} />
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <label className="block text-xs font-semibold text-green-700 mb-2">나에게 해주고 싶은 말</label>
            <textarea value={form.messageToSelf} onChange={set('messageToSelf')} rows={2}
              placeholder="오늘 하루 수고한 나에게..." className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:outline-none bg-white resize-none" />
          </div>
          <div>
            <label className={labelClass}>태그</label>
            <input value={form.tags} onChange={set('tags')} placeholder="여행, 음식, 성취" className={inputClass} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              취소
            </button>
            <button type="submit"
              className="flex-1 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600">
              저장
            </button>
          </div>
        </form>
      )}

      {thisWeekLogs.length > 0 && (
        <div className="mb-6 p-5 bg-green-50 border border-green-200 rounded-2xl">
          <p className="text-sm font-semibold text-green-700 mb-3">이번 주 행복 리포트</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '행복했던 순간', values: thisWeekLogs.map(l => l.happyMoment).filter(Boolean) },
              { label: '기억나는 음식', values: thisWeekLogs.map(l => l.food).filter(Boolean) as string[] },
              { label: '좋은 소비', values: thisWeekLogs.map(l => l.spending).filter(Boolean) as string[] },
              { label: '이번 주 성취', values: thisWeekLogs.map(l => l.achievement).filter(Boolean) as string[] },
            ].map(item => item.values.length > 0 && (
              <div key={item.label}>
                <p className="text-xs font-medium text-green-600 mb-1">{item.label}</p>
                <ul className="space-y-0.5">
                  {item.values.map((v, i) => (
                    <li key={i} className="text-xs text-gray-700 truncate">{v}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-24">
          <p className="text-gray-400 text-sm">불러오는 중...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-4xl mb-4">🌟</p>
          <p className="text-gray-500 font-medium">행복했던 순간을 기록해보세요</p>
          <p className="text-sm text-gray-400 mt-1">작은 순간도 기록하면 쌓입니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map(log => (
            <div key={log.id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between gap-4 mb-3">
                <p className="text-sm font-medium text-gray-800 leading-relaxed">{log.happyMoment}</p>
                <button onClick={async () => { await happinessStore.delete(log.id); await load() }}
                  className="p-1 rounded hover:bg-red-50 flex-shrink-0">
                  <X size={14} className="text-gray-400 hover:text-red-400" />
                </button>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                {log.food && <span>🍽 {log.food}</span>}
                {log.spending && <span>💰 {log.spending}</span>}
                {log.achievement && <span>⭐ {log.achievement}</span>}
              </div>

              {log.memorableSentence && (
                <div className="mt-3 px-4 py-2 bg-green-50 border border-green-100 rounded-xl">
                  <p className="text-xs text-green-600 font-medium">&ldquo;{log.memorableSentence}&rdquo;</p>
                </div>
              )}

              {log.messageToSelf && (
                <p className="mt-3 text-sm text-gray-600 italic">— {log.messageToSelf}</p>
              )}

              {log.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {log.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400 mt-3">
                {new Date(log.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const labelClass = 'block text-xs font-medium text-gray-600 mb-1'
const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-300 bg-gray-50 transition-colors'
