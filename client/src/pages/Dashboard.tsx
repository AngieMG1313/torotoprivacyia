import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { KpiCard } from '../components/KpiCard'
import { UatFeedbackBox } from '../components/UatFeedbackBox'
import { api } from '../lib/api'
import type { DocumentRecord } from '../types'

const STATUS_LABEL: Record<string, string> = {
  UPLOADED: 'Cargado',
  ANALYZING: 'Analizando',
  READY_FOR_REVIEW: 'Listo para revisión',
  REVIEW_IN_PROGRESS: 'En revisión',
  EXPORTED: 'Aprobado',
  ANALYSIS_FAILED: 'Falló el análisis',
  DUPLICATE_REJECTED: 'Duplicado rechazado',
}

export function Dashboard() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])

  useEffect(() => {
    api.listDocuments().then(setDocuments).catch(console.error)
  }, [])

  const exported = documents.filter((d) => d.status === 'EXPORTED').length
  const readyForReview = documents.filter((d) => d.status === 'READY_FOR_REVIEW').length
  const analyzing = documents.filter((d) => d.status === 'ANALYZING').length

  return (
    <main className="p-6 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg text-on-surface font-bold tracking-tight">
          Toroto Privacy IA
        </h1>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-semibold text-body-sm shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Censurar nuevo documento
        </Link>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Documentos procesados" value={documents.length} icon="assignment_turned_in" />
        <KpiCard label="Listos para revisión" value={readyForReview} icon="visibility_off" tone="amber" />
        <KpiCard label="Analizando" value={analyzing} icon="sync" />
        <KpiCard label="Aprobados" value={exported} icon="verified" tone="tertiary" />
      </section>

      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-outline-variant/20">
          <h3 className="text-headline-md text-on-surface font-bold">
            Documentos procesados recientemente
          </h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {documents.length === 0 && (
            <p className="text-body-sm text-on-surface-variant col-span-full">
              Todavía no hay documentos. Empieza con "Censurar nuevo documento".
            </p>
          )}
          {documents.map((doc) => {
            const cardBody = (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/30 text-on-surface-variant font-label-sm text-[11px] font-semibold">
                    {STATUS_LABEL[doc.status] ?? doc.status}
                  </span>
                </div>
                <h4 className="text-title-sm font-semibold text-on-surface leading-snug line-clamp-1">
                  {doc.filename}
                </h4>
                <div className="font-mono text-[11px] text-secondary flex items-center gap-1.5 mt-1">
                  <span>{(doc.size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                  {doc.pages && (
                    <>
                      <span>•</span>
                      <span>{doc.pages} págs</span>
                    </>
                  )}
                </div>
              </div>
            )

            // A duplicate-rejected document never got a usable blob/analysis,
            // so there's nowhere useful to send the user - render it inert.
            if (doc.status === 'DUPLICATE_REJECTED') {
              return (
                <div
                  key={doc.id}
                  className="bg-surface rounded-xl border border-outline-variant/30 p-4 opacity-60 cursor-not-allowed"
                  title="Este documento ya había sido cargado (mismo contenido detectado por hash)."
                >
                  {cardBody}
                </div>
              )
            }

            return (
              <Link
                key={doc.id}
                to={
                  doc.status === 'READY_FOR_REVIEW' ||
                  doc.status === 'REVIEW_IN_PROGRESS' ||
                  doc.status === 'EXPORTED'
                    ? `/documents/${doc.id}/review`
                    : `/documents/${doc.id}/analyzing`
                }
                className="bg-surface rounded-xl border border-outline-variant/30 p-4 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs"
              >
                {cardBody}
              </Link>
            )
          })}
        </div>
      </section>

      <UatFeedbackBox />
    </main>
  )
}
