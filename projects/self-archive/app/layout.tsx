import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import MigrationRunner from '@/components/MigrationRunner'
import UserGuard from '@/components/UserGuard'

export const metadata: Metadata = {
  title: '나를 모으는 곳',
  description: '생각·감정·독서·논문·행복을 자기화해서 쌓는 성장 아카이브',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-white text-gray-900 antialiased">
        <UserGuard>
          <div className="flex min-h-screen">
            <MigrationRunner />
            <Sidebar />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </UserGuard>
      </body>
    </html>
  )
}
