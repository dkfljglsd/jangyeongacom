'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { EmotionNote } from '@/lib/types'
import { emotionStore } from '@/lib/store'

const EMOTIONS = ['불안', '두려움', '슬픔', '외로움', '화남', '좌절', '기쁨', '설렘', '감사', '평온']
const empty = { emotion: '', actualEvent: '', myInterpretation: '', alternativeView: '', messageToSelf: '' }

export default function EmotionNotePage() {
  const [notes, setNotes] = useState<EmotionNote[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await emotionStore.getAll()
    setNotes(data.slice().reverse())
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await emotionStore.save(form)
    setForm(empty)
    setShowForm(false)
    await load()
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">감정 분리 노트</h1>
          <p className="text-sm text-gray-400 mt-0.5">감정을 사실과 분리해서 나를 객관적으로 보기</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white text-sm rounded-xl hover:bg-pink-600 transition-colors"
        >
          <Plus size={14} />
          감정 기록
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 bg-white border border-pink-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800">지금 느끼는 감정을 분리해봐요</h2>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100">
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          <div>
            <label className={labelClass}>오늘 감정</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {EMOTIONS.map(e => (
                <button
                  type="button"
                  key={e}
                  onClick={() => setForm(f => ({ ...f, emotion: e }))}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    form.emotion === e
                      ? 'bg-pink-500 text-white border-pink-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-pink-200'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              value={form.emotion}
              onChange={set('emotion')}
              placeholder="직접 입력하거나 위에서 선택"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>실제로 일어난 일 (사실만)</label>
            <textarea required value={form.actualEvent} onChange={set('actualEvent')} rows={2}
              placeholder="감정 없이 사실만 적어보세요" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>내가 해석한 것</label>
            <textarea value={form.myInterpretation} onChange={set('myInterpretation')} rows={2}
              placeholder="나는 이 상황을 어떻게 해석했나요?" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>다른 해석 (다른 관점으로 보면?)</label>
            <textarea value={form.alternativeView} onChange={set('alternativeView')} rows={2}
              placeholder="만약 다른 방식으로 본다면?" className={inputClass} />
          </div>
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
            <label className="block text-xs font-semibold text-pink-600 mb-2">나에게 해줄 말</label>
            <textarea value={form.messageToSelf} onChange={set('messageToSelf')} rows={2}
              placeholder="지금 나에게 어떤 말을 해주고 싶나요?" className="w-full px-3 py-2 text-sm border border-pink-200 rounded-lg focus:outline-none bg-white resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              취소
            </button>
            <button type="submit"
              className="flex-1 py-2 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600">
              저장
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-24">
          <p className="text-gray-400 text-sm">불러오는 중...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-4xl mb-4">💭</p>
          <p className="text-gray-500 font-medium">감정을 분리해서 기록해보세요</p>
          <p className="text-sm text-gray-400 mt-1">감정을 사실과 분리하면 나를 더 객관적으로 볼 수 있어요</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map(note => (
            <div key={note.id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                    {note.emotion}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(note.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <button onClick={async () => { await emotionStore.delete(note.id); await load() }}
                  className="p-1 rounded hover:bg-red-50">
                  <X size={14} className="text-gray-400 hover:text-red-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1">실제로 일어난 일</p>
                  <p className="text-gray-700">{note.actualEvent}</p>
                </div>
                {note.myInterpretation && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-1">내가 해석한 것</p>
                    <p className="text-gray-600">{note.myInterpretation}</p>
                  </div>
                )}
                {note.alternativeView && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-1">다른 해석</p>
                    <p className="text-gray-600">{note.alternativeView}</p>
                  </div>
                )}
                {note.messageToSelf && (
                  <div>
                    <p className="text-xs font-semibold text-pink-500 mb-1">나에게 해줄 말</p>
                    <p className="text-gray-700 font-medium">{note.messageToSelf}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const labelClass = 'block text-xs font-medium text-gray-600 mb-1'
const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-300 bg-gray-50 transition-colors'
