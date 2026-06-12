'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Paper, ReadingStatus } from '@/lib/types'
import { paperStore } from '@/lib/store'

const READING_STATUSES: ReadingStatus[] = ['읽지않음', '읽는중', '다읽음', '요약완료', '아이디어화']

interface Props {
  paper: Paper | null
  onClose: () => void
  onSave: () => void
}

export default function PaperModal({ paper, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    title: paper?.title ?? '',
    authors: paper?.authors ?? '',
    journal: paper?.journal ?? '',
    year: paper?.year ?? '',
    doi: paper?.doi ?? '',
    abstract: paper?.abstract ?? '',
    keywords: paper?.keywords.join(', ') ?? '',
    researchField: paper?.researchField ?? '',
    readingStatus: paper?.readingStatus ?? '읽지않음' as ReadingStatus,
    purpose: paper?.purpose ?? '',
    method: paper?.method ?? '',
    result: paper?.result ?? '',
    limitation: paper?.limitation ?? '',
    myThought: paper?.myThought ?? '',
    researchIdea: paper?.researchIdea ?? '',
    oneSentence: paper?.oneSentence ?? '',
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      ...form,
      keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
      pdfUrl: paper?.pdfUrl,
      originalFileName: paper?.originalFileName,
    }
    if (paper) {
      await paperStore.update(paper.id, data)
    } else {
      await paperStore.save(data)
    }
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">
            {paper ? '논문 수정' : '논문 추가'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <Section title="논문 기본 정보">
            <Field label="논문 제목 *">
              <input required value={form.title} onChange={set('title')} placeholder="논문 제목을 입력하세요" className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="저자">
                <input value={form.authors} onChange={set('authors')} placeholder="저자명" className={inputClass} />
              </Field>
              <Field label="출판연도">
                <input value={form.year} onChange={set('year')} placeholder="2024" className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="저널/학회">
                <input value={form.journal} onChange={set('journal')} placeholder="Journal name" className={inputClass} />
              </Field>
              <Field label="DOI">
                <input value={form.doi} onChange={set('doi')} placeholder="10.xxxx/xxxxx" className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="연구 분야">
                <input value={form.researchField} onChange={set('researchField')} placeholder="예: CVAP, 딥러닝, 원자력" className={inputClass} />
              </Field>
              <Field label="읽기 상태">
                <select value={form.readingStatus} onChange={set('readingStatus')} className={inputClass}>
                  {READING_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="키워드 (쉼표로 구분)">
              <input value={form.keywords} onChange={set('keywords')} placeholder="CVAP, Pump, Fault Detection" className={inputClass} />
            </Field>
            <Field label="초록">
              <textarea value={form.abstract} onChange={set('abstract')} placeholder="논문 초록" rows={3} className={inputClass} />
            </Field>
          </Section>

          <Section title="내 논문 노트">
            <Field label="1. 이 논문의 연구 목적은?">
              <textarea value={form.purpose} onChange={set('purpose')} rows={2} className={inputClass} />
            </Field>
            <Field label="2. 핵심 방법은?">
              <textarea value={form.method} onChange={set('method')} rows={2} className={inputClass} />
            </Field>
            <Field label="3. 주요 결과는?">
              <textarea value={form.result} onChange={set('result')} rows={2} className={inputClass} />
            </Field>
            <Field label="4. 이 논문의 한계는?">
              <textarea value={form.limitation} onChange={set('limitation')} rows={2} className={inputClass} />
            </Field>
            <Field label="5. 내 연구와 연결되는 부분은?">
              <textarea value={form.myThought} onChange={set('myThought')} rows={2} className={inputClass} />
            </Field>
            <Field label="6. 후속 연구 아이디어는?">
              <textarea value={form.researchIdea} onChange={set('researchIdea')} rows={2} className={inputClass} />
            </Field>
            <Field label="이 논문을 통해 내가 얻은 한 문장은?">
              <textarea
                value={form.oneSentence}
                onChange={set('oneSentence')}
                rows={2}
                placeholder="핵심을 한 문장으로 압축해보세요"
                className={`${inputClass} font-medium`}
              />
            </Field>
          </Section>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              취소
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 bg-gray-50 transition-colors'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
