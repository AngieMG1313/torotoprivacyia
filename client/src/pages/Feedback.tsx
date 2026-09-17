import { useState } from 'react'
import { api } from '../lib/api'

export function Feedback() {
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  async function submit() {
    if (!message.trim()) return
    await api.submitFeedback({ message: message.trim() })
    setMessage('')
    setSent(true)
  }

  return (
    <main className="p-6 max-w-3xl w-full mx-auto space-y-6">
      <h1 className="text-headline-lg text-on-surface font-bold tracking-tight">Feedback UAT</h1>
      <p className="text-body-sm text-on-surface-variant">
        Reporta falsos positivos, información omitida o cualquier caso especial que encuentres
        durante las pruebas. Esto reemplaza el Sheet/Coda propuesto en la reunión: queda registrado
        junto al documento correspondiente.
      </p>
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 shadow-sm space-y-3">
        <textarea
          className="w-full h-32 p-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm"
          placeholder="Describe el caso..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          className="px-5 py-2 bg-primary text-on-primary rounded-lg font-semibold text-body-sm hover:bg-primary-container transition-all"
          onClick={submit}
        >
          Enviar
        </button>
        {sent && <p className="text-body-sm text-tertiary">¡Gracias! Tu feedback quedó registrado.</p>}
      </div>
    </main>
  )
}
