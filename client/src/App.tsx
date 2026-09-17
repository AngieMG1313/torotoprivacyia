import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SideNavBar } from './components/SideNavBar'
import { TopNavBar } from './components/TopNavBar'
import { api } from './lib/api'
import { Analyzing } from './pages/Analyzing'
import { Dashboard } from './pages/Dashboard'
import { Documents } from './pages/Documents'
import { Feedback } from './pages/Feedback'
import { Login } from './pages/Login'
import { Review } from './pages/Review'
import { Upload } from './pages/Upload'
import type { SessionUser } from './types'

function AuthenticatedShell({ user }: { user: SessionUser }) {
  return (
    <div className="flex min-h-screen">
      <SideNavBar userEmail={user.email} />
      <div className="ml-64 flex-1 flex flex-col min-w-0 bg-surface">
        <TopNavBar primaryAction={{ label: 'Censurar nuevo documento', to: '/upload' }} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/documents/:id/analyzing" element={<Analyzing />} />
          <Route path="/documents/:id/review" element={<Review />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export function App() {
  const [user, setUser] = useState<SessionUser | null | 'loading'>('loading')
  const location = useLocation()

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  if (location.pathname === '/login') return <Login />

  if (user === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Cargando…</div>
  }
  if (user === null) return <Navigate to="/login" replace />

  return <AuthenticatedShell user={user} />
}
