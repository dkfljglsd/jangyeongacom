'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import Sidebar from './Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn, signUp, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-400 text-sm">로딩 중...</p>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen signIn={signIn} signUp={signUp} />
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onSignOut={signOut} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

function LoginScreen({
  signIn,
  signUp,
}: {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [signupDone, setSignupDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(error)
    } else {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error)
      } else {
        setSignupDone(true)
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold text-gray-900">나를 모으는 곳</h1>
          <p className="text-sm text-gray-400 mt-1">Self Archive</p>
        </div>

        {signupDone ? (
          <div className="text-center space-y-3">
            <p className="text-sm font-medium text-gray-800">이메일을 확인해주세요</p>
            <p className="text-xs text-gray-500">
              {email}로 인증 메일을 보냈어요. 링크를 클릭하면 로그인할 수 있어요.
            </p>
            <button
              onClick={() => { setSignupDone(false); setMode('login') }}
              className="mt-4 text-sm text-blue-600 underline"
            >
              로그인으로 돌아가기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">이메일</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="이메일 주소"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">비밀번호</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 bg-gray-50"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '...' : mode === 'login' ? '로그인' : '회원가입'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError('') }}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                {mode === 'login' ? '계정이 없어요 → 회원가입' : '이미 계정이 있어요 → 로그인'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
