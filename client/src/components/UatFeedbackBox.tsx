import { useState } from 'react'
import { api } from '../lib/api'

export function UatFeedbackBox({ documentId }: { documentId?: string }) {
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function submit(sentiment?: 'MUY_PRECISA' | 'FALSOS_POSITIVOS') {
    if (sentiment === undefined && !message.trim()) return
    setSending(true)
    try {
      await api.submitFeedback({
        documentId,
        sentiment,
        message: message.trim() || `Feedback rápido: ${sentiment}`,
      })
      setMessage('')
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/40 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
          <span className="material-symbols-outlined text-2xl">rate_review</span>
        </div>
        <div>
          <h4 className="text-title-sm text-on-surface font-semibold">
            Ayúdanos a calibrar Toroto Privacy IA
          </h4>
          <p className="text-xs text-on-surface-variant">
            {sent ? '¡Gracias! Tu reporte quedó registrado.' : '¿La detección fue precisa en este documento?'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          className="px-3 py-1.5 text-xs bg-surface-container-low border border-outline-variant/40 rounded-lg w-64"
          placeholder="Describe un caso, falso positivo o sugerencia..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          disabled={sending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg text-xs font-medium border border-outline-variant/40 transition-colors"
          onClick={() => submit('MUY_PRECISA')}
        >
          <span className="material-symbols-outlined text-base text-tertiary">thumb_up</span>
          Muy precisa
        </button>
        <button
          disabled={sending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg text-xs font-medium border border-outline-variant/40 transition-colors"
          onClick={() => submit('FALSOS_POSITIVOS')}
        >
          <span className="material-symbols-outlined text-base text-secondary">thumb_down</span>
          Hubo falsos positivos
        </button>
        <button
          disabled={sending || !message.trim()}
          className="px-3 py-1.5 bg-surface-container-lowest hover:bg-surface-container-low text-primary rounded-lg text-xs font-medium border border-primary/30 transition-colors disabled:opacity-40"
          onClick={() => submit()}
        >
          Enviar reporte
        </button>
      </div>
    </section>
  )
}
