import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { DocumentRecord } from '../types'

export function Documents() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])

  useEffect(() => {
    api.listDocuments().then(setDocuments).catch(console.error)
  }, [])

  return (
    <main className="p-6 max-w-7xl w-full mx-auto space-y-6">
      <h1 className="text-headline-lg text-on-surface font-bold tracking-tight">Documentos</h1>
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="bg-surface-container-low text-left text-on-surface-variant uppercase text-label-sm">
              <th className="p-3">Documento</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Área</th>
              <th className="p-3">Páginas</th>
              <th className="p-3">Creado</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-t border-outline-variant/20 hover:bg-surface-container-low/50">
                <td className="p-3">
                  <Link className="text-primary font-medium hover:underline" to={`/documents/${doc.id}/review`}>
                    {doc.filename}
                  </Link>
                </td>
                <td className="p-3">{doc.status}</td>
                <td className="p-3">{doc.requester_area ?? '—'}</td>
                <td className="p-3">{doc.pages ?? '—'}</td>
                <td className="p-3">{new Date(doc.created_at).toLocaleString('es-MX')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
