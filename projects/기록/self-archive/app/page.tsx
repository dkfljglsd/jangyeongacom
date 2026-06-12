'use client'

import Link from 'next/link'
import { Brain, Heart, Smile, BookOpen, FileText } from 'lucide-react'

const cards = [
  {
    href: '/thought-memo',
    icon: Brain,
    title: '생각 메모',
    desc: '내가 이해한 것, 떠오른 생각 기록',
    color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    iconColor: 'text-blue-500',
  },
  {
    href: '/emotion-note',
    icon: Heart,
    title: '감정 분리 노트',
    desc: '감정을 사실과 분리해서 기록',
    color: 'bg-pink-50 hover:bg-pink-100 border-pink-200',
    iconColor: 'text-pink-500',
  },
  {
    href: '/research-notes',
    icon: FileText,
    title: '연구 노트',
    desc: '연구 프로젝트와 미팅 노트 관리',
    color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    iconColor: 'text-purple-500',
  },
  {
    href: '/paper-archive',
    icon: BookOpen,
    title: '문헌 아카이브',
    desc: '읽은 논문과 책을 자기화해서 정리',
    color: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    iconColor: 'text-amber-500',
  },
  {
    href: '/happiness',
    icon: Smile,
    title: '행복 기록',
    desc: '오늘 좋았던 순간, 음식, 문장 저장',
    color: 'bg-green-50 hover:bg-green-100 border-green-200',
    iconColor: 'text-green-500',
  },
]

export default function Home() {
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <div className="p-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <p className="text-sm text-gray-400 mb-1">{today}</p>
          <h1 className="text-3xl font-bold text-gray-900">안녕하세요</h1>
          <p className="text-gray-500 mt-2">오늘 무엇을 기록할까요?</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.href}
                href={card.href}
                className={`flex flex-col gap-3 p-6 rounded-2xl border transition-all cursor-pointer ${card.color}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm`}>
                  <Icon size={20} className={card.iconColor} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800">{card.title}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{card.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-12 p-6 bg-gray-50 rounded-2xl border border-gray-200">
          <p className="text-sm font-medium text-gray-500 mb-1">기록의 핵심 질문</p>
          <p className="text-lg font-semibold text-gray-800">
            이걸 통해 내가 얻은 한 문장은?
          </p>
        </div>
      </div>
    </div>
  )
}
