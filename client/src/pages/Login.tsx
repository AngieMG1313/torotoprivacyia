import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function Login() {
  const params = new URLSearchParams(window.location.search)
  const denied = params.get('error') === 'access_denied'
  const [devLoginEnabled, setDevLoginEnabled] = useState(false)
  const [devLoggingIn, setDevLoggingIn] = useState(false)

  useEffect(() => {
    api
      .authConfig()
      .then((c) => setDevLoginEnabled(c.devLoginEnabled))
      .catch(() => {})
  }, [])

  async function loginAsDevUser() {
    setDevLoggingIn(true)
    try {
      await api.devLogin()
      window.location.href = '/'
    } finally {
      setDevLoggingIn(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/40 shadow-sm max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-bold text-xl">
          T
        </div>
        <h1 className="text-headline-md text-on-surface font-bold">Toroto Privacy IA</h1>
        <p className="text-body-sm text-on-surface-variant">
          Sanitización de documentos con revisión humana obligatoria.
        </p>
        {denied && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg p-2">
            Acceso restringido a cuentas corporativas de Toroto.
          </p>
        )}
        <a
          href="/api/auth/google"
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-on-primary rounded-lg font-semibold text-body-md hover:bg-primary-container transition-all"
        >
          Iniciar sesión con Google
        </a>
        {devLoginEnabled && (
          <>
            <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
              <div className="h-px bg-outline-variant/40 flex-1" />
              modo desarrollo
              <div className="h-px bg-outline-variant/40 flex-1" />
            </div>
            <button
              disabled={devLoggingIn}
              onClick={loginAsDevUser}
              className="w-full py-2 px-4 border border-outline-variant/50 rounded-lg font-medium text-body-sm text-on-surface-variant hover:bg-surface-container-low transition-all disabled:opacity-50"
            >
              {devLoggingIn ? 'Entrando…' : 'Entrar como usuario de prueba (sin Google)'}
            </button>
            <p className="text-[11px] text-amber-700">
              Solo visible porque Google OAuth no está configurado todavía — nunca aparece en
              producción una vez configurado (ver docs/SETUP-CREDENTIALS.md).
            </p>
          </>
        )}
      </div>
    </div>
  )
}
