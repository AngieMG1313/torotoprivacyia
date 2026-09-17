import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FindingCard } from '../components/FindingCard'
import { PdfViewer } from '../components/PdfViewer'
import { Stepper } from '../components/Stepper'
import { UatFeedbackBox } from '../components/UatFeedbackBox'
import { api } from '../lib/api'
import type { Detection, DetectionLocation, DocumentRecord } from '../types'

export function Review() {
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<DocumentRecord | null>(null)
  const [detections, setDetections] = useState<Detection[]>([])
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [drawingForDetectionId, setDrawingForDetectionId] = useState<string | null>(null)
  const [confirmedAudit, setConfirmedAudit] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)

  async function refresh() {
    if (!id) return
    const [fetchedDoc, dets] = await Promise.all([api.getDocument(id), api.listDetections(id)])
    setDoc(fetchedDoc)
    setDetections(dets)
  }

  useEffect(() => {
    refresh().catch((err) => console.error(err))
  }, [id])

  async function decide(detection: Detection, reviewStatus: Detection['review_status']) {
    await api.patchDetection(detection.id, { reviewStatus })
    await refresh()
  }

  async function saveManualBox(loc: DetectionLocation) {
    if (!drawingForDetectionId) return
    await api.patchDetection(drawingForDetectionId, { reviewStatus: 'APPROVED', manualLocation: loc })
    setDrawingForDetectionId(null)
    await refresh()
  }

  const pending = detections.filter((d) => d.review_status === 'PENDING')
  const allResolved = detections.length > 0 && pending.length === 0

  async function doExport() {
    if (!id) return
    setExporting(true)
    setExportError(null)
    try {
      const result = await api.exportDocument(id, confirmedAudit)
      setPublicUrl(result.publicUrl)
    } catch (err) {
      setExportError((err as Error).message)
    } finally {
      setExporting(false)
    }
  }

  if (!doc) return <main className="p-6">Cargando…</main>

  return (
    <main className="p-6 max-w-[1600px] w-full mx-auto space-y-6">
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/40 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-headline-xl text-on-surface font-bold tracking-tight">
            Revisión Humana y Firma de Sanitización
          </h1>
          <p className="text-body-sm text-on-surface-variant">{doc.filename}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-body-sm font-semibold hover:bg-primary-container transition-all flex items-center gap-2 shadow-sm disabled:opacity-40"
            disabled={!allResolved || !confirmedAudit || exporting}
            onClick={doExport}
          >
            <span className="material-symbols-outlined text-base">verified</span>
            {exporting ? 'Exportando…' : 'Aprobar y Generar PDF Seguro'}
          </button>
        </div>
      </div>

      <Stepper currentStep={4} />

      {publicUrl && (
        <div className="bg-tertiary-fixed/30 border border-tertiary-fixed-dim rounded-xl p-4 text-body-sm text-on-surface">
          Documento público generado.{' '}
          <a className="text-primary font-semibold underline" href={publicUrl} target="_blank" rel="noreferrer">
            Descargar PDF sanitizado
          </a>
        </div>
      )}
      {exportError && (
        <div className="bg-error-container/40 border border-error/30 rounded-xl p-4 text-body-sm text-error">
          {exportError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 bg-surface-container-low border-b border-outline-variant/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                className="p-1 rounded hover:bg-surface-container text-on-surface-variant"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>
              <span className="text-label-md px-2 py-0.5 bg-surface-container-lowest border border-outline-variant/40 rounded font-mono">
                Pág {page} de {pageCount ?? doc.pages ?? '—'}
              </span>
              <button
                className="p-1 rounded hover:bg-surface-container text-on-surface-variant"
                onClick={() => setPage((p) => Math.min(pageCount ?? p, p + 1))}
              >
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>
            <span className="text-xs text-on-surface-variant">
              {drawingForDetectionId
                ? 'Dibuja un rectángulo sobre la zona a censurar…'
                : 'Selecciona "Marcar área manual" en un hallazgo sin ubicación'}
            </span>
          </div>
          <PdfViewer
            pdfUrl={doc.blob_url_original}
            pageNumber={page}
            pageCount={pageCount}
            onPageCount={setPageCount}
            detections={detections}
            drawingEnabled={drawingForDetectionId !== null}
            onManualBox={saveManualBox}
          />
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-sm space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-title-sm text-on-surface font-semibold">
                Hallazgos Detectados ({detections.length})
              </h3>
              <span className="text-xs text-on-surface-variant">
                {pending.length} pendientes
              </span>
            </div>
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {detections.map((d) => (
                <FindingCard
                  key={d.id}
                  detection={d}
                  onDecide={(status) => decide(d, status)}
                  onRequireManualBox={() => {
                    setPage(d.page)
                    setDrawingForDetectionId(d.id)
                  }}
                />
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-xl border-2 border-primary/30 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-outline-variant/30">
              <div className="w-8 h-8 rounded bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-lg">history_edu</span>
              </div>
              <h3 className="text-title-sm text-on-surface font-bold">
                Declaratoria de Responsabilidad HITL
              </h3>
            </div>
            <label className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/40 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4"
                checked={confirmedAudit}
                onChange={(e) => setConfirmedAudit(e.target.checked)}
              />
              <span className="text-xs text-on-surface leading-snug">
                Confirmo que he auditado personalmente cada hallazgo listado y que el documento
                resultante no expondrá información sensible según los lineamientos de Toroto.
              </span>
            </label>
            {!allResolved && (
              <p className="text-[11px] text-amber-700">
                Resuelve todos los hallazgos pendientes antes de exportar.
              </p>
            )}
          </div>
        </div>
      </div>

      <UatFeedbackBox documentId={doc.id} />
    </main>
  )
}
