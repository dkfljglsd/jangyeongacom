import { ReadingStatus } from '@/lib/types'

const statusConfig: Record<ReadingStatus, { label: string; className: string; dot: string }> = {
  '읽지않음': { label: '읽지않음', className: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-400' },
  '읽는중': { label: '읽는중', className: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400' },
  '다읽음': { label: '다읽음', className: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-400' },
  '요약완료': { label: '요약완료', className: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
  '아이디어화': { label: '아이디어화', className: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-400' },
}

export default function StatusBadge({ status }: { status: ReadingStatus }) {
  const config = statusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}
