import { NavLink } from 'react-router-dom'
import { Logo } from './Logo'

// Ported from the Stitch mockup's shared sidebar (identical across all 4
// screens) - see DESIGN.md for the color/spacing tokens this relies on.
export function SideNavBar({ userEmail }: { userEmail?: string }) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-body-md transition-colors ${
      isActive
        ? 'bg-primary text-on-primary font-medium shadow-sm'
        : 'text-secondary-fixed-dim hover:text-inverse-on-surface hover:bg-surface-container/10'
    }`

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 border-r border-outline-variant/20 bg-inverse-surface text-inverse-on-surface flex flex-col justify-between p-4 shrink-0 select-none z-40">
      <div className="space-y-5">
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shadow-sm">
            <Logo className="w-5 h-5" color="white" />
          </div>
          <div>
            <span className="text-title-sm text-inverse-on-surface tracking-tight font-semibold block leading-tight">
              Toroto Privacy IA
            </span>
            <span className="text-body-sm text-secondary-fixed-dim text-xs block">
              Sanitización de Documentos
            </span>
          </div>
        </div>

        <NavLink
          to="/upload"
          className="w-full py-2.5 px-3 bg-primary text-on-primary rounded-lg font-medium text-body-md flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-sm active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Nueva censura
        </NavLink>

        <nav className="space-y-1">
          <NavLink to="/" end className={linkClass}>
            <span className="material-symbols-outlined text-xl">dashboard</span>
            <span className="font-medium">Inicio</span>
          </NavLink>
          <NavLink to="/documents" className={linkClass}>
            <span className="material-symbols-outlined text-xl">description</span>
            <span className="font-medium">Documentos</span>
          </NavLink>
          <NavLink to="/feedback" className={linkClass}>
            <span className="material-symbols-outlined text-xl">rate_review</span>
            <span className="font-medium">Feedback UAT</span>
          </NavLink>
        </nav>
      </div>

      <div className="pt-4 border-t border-outline-variant/10 space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="material-symbols-outlined text-2xl text-secondary-fixed-dim shrink-0">
              account_circle
            </span>
            <div className="overflow-hidden">
              <span className="text-[11px] text-secondary-fixed-dim truncate block">
                {userEmail ?? '—'}
              </span>
            </div>
          </div>
          <a
            href="/api/auth/logout"
            className="text-secondary-fixed-dim hover:text-inverse-on-surface transition-colors p-1"
            title="Cerrar sesión"
            onClick={(e) => {
              e.preventDefault()
              fetch('/api/auth/logout', { method: 'POST' }).then(() => {
                window.location.href = '/login'
              })
            }}
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </a>
        </div>
      </div>
    </aside>
  )
}
