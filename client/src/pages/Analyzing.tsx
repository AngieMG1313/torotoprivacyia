import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Stepper } from '../components/Stepper'
import { api } from '../lib/api'
import type { AnalysisStatus } from '../types'

export function Analyzing() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<AnalysisStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const cancelledRef = useRef(false)

  function startPolling() {
    let timer: ReturnType<typeof setTimeout>

    async function poll() {
      if (!id || cancelledRef.current) return
      try {
        const s = await api.getAnalysisStatus(id)
        if (cancelledRef.current) return
        setStatus(s)
        if (s.status === 'COMPLETED' || s.status === 'COMPLETED_WITH_WARNINGS') {
          navigate(`/documents/${id}/review`)
          return
        }
        if (s.status === 'FAILED') {
          setError(s.error_message ?? 'El análisis falló.')
          return
        }
      } catch (err) {
        if (!cancelledRef.current) setError((err as Error).message)
        return
      }
      timer = setTimeout(poll, 3000)
    }
    poll()
    return () => clearTimeout(timer)
  }

  useEffect(() => {
    cancelledRef.current = false
    const stop = startPolling()
    return () => {
      cancelledRef.current = true
      stop?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function retry() {
    if (!id) return
    setRetrying(true)
    setError(null)
    try {
      await api.analyzeDocument(id)
      cancelledRef.current = false
      startPolling()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRetrying(false)
    }
  }

  return (
    <main className="p-6 max-w-[1600px] w-full mx-auto space-y-6">
      <div className="pb-2 border-b border-outline-variant/30">
        <h1 className="text-headline-xl text-on-surface font-bold tracking-tight">
          Análisis Automatizado e Inferencia de Sensibilidad
        </h1>
      </div>

      <Stepper currentStep={3} />

      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-8 shadow-sm flex flex-col items-center justify-center gap-4 min-h-[320px]">
        {error ? (
          <>
            <span className="material-symbols-outlined text-error text-[40px]">error</span>
            <p className="text-body-md text-error text-center max-w-md">{error}</p>
            <button
              disabled={retrying}
              onClick={retry}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold text-body-sm hover:bg-primary-container transition-all disabled:opacity-50"
            >
              {retrying ? 'Reintentando…' : 'Reintentar análisis'}
            </button>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-primary text-[40px] animate-spin">
              sync
            </span>
            <p className="text-body-md text-on-surface-variant">
              Analizando documento con Gemini — buscando información sensible según las 11
              categorías de la guía de censura de Toroto…
            </p>
            {status?.warnings && status.warnings.length > 0 && (
              <ul className="text-body-sm text-amber-700 space-y-1">
                {status.warnings.map((w, i) => (
                  <li key={i}>⚠ {w}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  )
}
