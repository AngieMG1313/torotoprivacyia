import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SideNavBar } from './components/SideNavBar'
import { TopNavBar } from './components/TopNavBar'
import { api } from './lib/api'
import { Login } from './pages/Login'
import type { SessionUser } from './types'

// Route-level code splitting: each page becomes its own chunk, loaded only
// when visited. This matters most for Review, which pulls in pdfjs-dist
// (the single heaviest dependency) - nobody pays for that download just to
// see the Dashboard or submit Feedback.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Upload = lazy(() => import('./pages/Upload').then((m) => ({ default: m.Upload })))
const Documents = lazy(() => import('./pages/Documents').then((m) => ({ default: m.Documents })))
const Analyzing = lazy(() => import('./pages/Analyzing').then((m) => ({ default: m.Analyzing })))
const Review = lazy(() => import('./pages/Review').then((m) => ({ default: m.Review })))
const Feedback = lazy(() => import('./pages/Feedback').then((m) => ({ default: m.Feedback })))

function RouteFallback() {
  return <div className="p-6 text-body-sm text-on-surface-variant">Cargando…</div>
}

function AuthenticatedShell({ user }: { user: SessionUser }) {
  return (
    <div className="flex min-h-screen">
      <SideNavBar userEmail={user.email} />
      <div className="ml-64 flex-1 flex flex-col min-w-0 bg-surface">
        <TopNavBar primaryAction={{ label: 'Censurar nuevo documento', to: '/upload' }} />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/documents/:id/analyzing" element={<Analyzing />} />
            <Route path="/documents/:id/review" element={<Review />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
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
