import { upload } from '@vercel/blob/client'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stepper } from '../components/Stepper'
import { api } from '../lib/api'

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [requesterArea, setRequesterArea] = useState('sbn')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  async function startProcessing() {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const { documentId } = await api.createDocument(file.name, requesterArea)
      const sha256 = await sha256Hex(file)

      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: `/api/documents/${documentId}/upload-url`,
      })

      await api.completeUpload(documentId, {
        blobUrl: blob.url,
        sha256,
        sizeBytes: file.size,
      })

      await api.analyzeDocument(documentId)
      navigate(`/documents/${documentId}/analyzing`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="p-6 max-w-[1600px] w-full mx-auto space-y-6">
      <div className="pb-2 border-b border-outline-variant/30">
        <h1 className="text-headline-xl text-on-surface font-bold tracking-tight">
          Cargar Documento para Sanitización
        </h1>
      </div>

      <Stepper currentStep={1} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div
            className="bg-surface-container-lowest rounded-xl border-2 border-dashed border-outline-variant hover:border-primary transition-all p-8 flex flex-col items-center justify-center text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const dropped = e.dataTransfer.files[0]
              if (dropped) setFile(dropped)
            }}
          >
            <div className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-primary mb-4">
              <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
            </div>
            <h2 className="text-headline-md text-on-surface font-semibold mb-1">
              Arrastra y suelta tu archivo PDF aquí, o haz clic para explorar
            </h2>
            <p className="text-body-sm text-secondary max-w-md mb-5">
              Formatos aceptados: PDF. Tamaño máximo: 50 MB por archivo.
            </p>
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-on-primary font-label-md hover:bg-primary-container transition-colors shadow-sm">
                <span className="material-symbols-outlined text-[18px]">folder_open</span>
                Seleccionar archivo PDF
              </span>
              <input
                ref={inputRef}
                accept=".pdf"
                className="hidden"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {file && (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-4 bg-surface-container-low/60 p-3.5 rounded-lg border border-outline-variant/20">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded bg-error-container text-error flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                  </div>
                  <div>
                    <h3 className="text-body-md font-semibold text-on-surface break-all">
                      {file.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-label-sm text-secondary">
                      <span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                  </div>
                </div>
                <button
                  className="h-8 w-8 rounded text-error hover:bg-error-container/40 flex items-center justify-center transition-colors"
                  onClick={() => setFile(null)}
                  title="Eliminar archivo"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-body-sm text-error bg-error-container/40 rounded-lg p-3">{error}</p>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/20">
              <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
              <span className="text-title-sm text-on-surface">Parámetros de Detección</span>
            </div>
            <div className="space-y-1.5">
              <label className="block text-label-md text-on-surface font-semibold">
                Área solicitante / Proyecto Toroto
              </label>
              <select
                className="w-full h-9 rounded bg-surface-container-low border border-outline-variant text-body-sm text-on-surface px-3"
                value={requesterArea}
                onChange={(e) => setRequesterArea(e.target.value)}
              >
                <option value="campo">Operaciones de Campo &amp; Silvicultura</option>
                <option value="sbn">Soluciones Basadas en la Naturaleza (SBN)</option>
                <option value="legal">Legal, Compliance &amp; Asuntos Regulatorios</option>
                <option value="finanzas">Finanzas Corporativas &amp; Carbon Credits</option>
                <option value="alianzas">Comercial &amp; Alianzas Estratégicas</option>
              </select>
            </div>
            <button
              disabled={!file || uploading}
              onClick={startProcessing}
              className="w-full h-11 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-semibold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              {uploading ? 'Subiendo…' : 'Iniciar análisis con IA'}
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
