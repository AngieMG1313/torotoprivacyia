import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { Detection, DetectionLocation } from '../types'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const RULE_COLORS: Record<string, string> = {
  'TOR-PRIV-008': 'border-red-500 bg-red-500/20',
  'TOR-PRIV-007': 'border-purple-600 bg-purple-600/20',
  'TOR-PRIV-009': 'border-amber-600 bg-amber-600/20',
}
const DEFAULT_COLOR = 'border-primary bg-primary/20'

export function PdfViewer({
  pdfUrl,
  pageNumber,
  pageCount,
  onPageCount,
  detections,
  drawingEnabled,
  onManualBox,
  onSelectDetection,
}: {
  pdfUrl: string
  pageNumber: number
  pageCount: number | null
  onPageCount: (count: number) => void
  detections: Detection[]
  drawingEnabled: boolean
  onManualBox: (loc: DetectionLocation) => void
  onSelectDetection?: (detection: Detection) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 })
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function render() {
      const doc = await pdfjsLib.getDocument(pdfUrl).promise
      if (cancelled) return
      onPageCount(doc.numPages)
      const page = await doc.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = viewport.width
      canvas.height = viewport.height
      setPageSize({ width: viewport.width, height: viewport.height })
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      await page.render({ canvasContext: ctx, viewport }).promise
    }
    render().catch((err) => console.error('Failed to render PDF page', err))
    return () => {
      cancelled = true
    }
  }, [pdfUrl, pageNumber])

  function relativePos(e: React.MouseEvent): { x: number; y: number } {
    const rect = containerRef.current!.getBoundingClientRect()
    return {
      x: Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1),
      y: Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1),
    }
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!drawingEnabled) return
    setDrawStart(relativePos(e))
    setDrawCurrent(relativePos(e))
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!drawingEnabled || !drawStart) return
    setDrawCurrent(relativePos(e))
  }
  function handleMouseUp() {
    if (!drawingEnabled || !drawStart || !drawCurrent) return
    const x = Math.min(drawStart.x, drawCurrent.x)
    const y = Math.min(drawStart.y, drawCurrent.y)
    const width = Math.abs(drawCurrent.x - drawStart.x)
    const height = Math.abs(drawCurrent.y - drawStart.y)
    setDrawStart(null)
    setDrawCurrent(null)
    if (width < 0.005 || height < 0.005) return
    onManualBox({ coordinate_system: 'NORMALIZED_0_1', x, y, width, height, location_confidence: 1 })
  }

  const pageDetections = detections.filter((d) => d.page === pageNumber)

  return (
    <div className="p-4 bg-surface-container-low/40 overflow-auto max-h-[820px] flex justify-center">
      <div
        ref={containerRef}
        className="relative shadow-md border border-outline-variant/30 select-none"
        style={{ width: pageSize.width || undefined, cursor: drawingEnabled ? 'crosshair' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <canvas ref={canvasRef} />
        {pageDetections.map((d) => {
          const loc = d.manual_location ?? d.location
          if (loc.x === null || loc.y === null || loc.width === null || loc.height === null) return null
          const color = RULE_COLORS[d.rule_id] ?? DEFAULT_COLOR
          const dimmed = d.review_status === 'REJECTED'
          return (
            <button
              key={d.id}
              onClick={() => onSelectDetection?.(d)}
              className={`absolute border-2 rounded-sm ${color} ${dimmed ? 'opacity-20' : 'opacity-70 hover:opacity-100'}`}
              style={{
                left: `${loc.x * 100}%`,
                top: `${loc.y * 100}%`,
                width: `${loc.width * 100}%`,
                height: `${loc.height * 100}%`,
              }}
              title={`${d.rule_id} · ${d.category} · ${Math.round(d.confidence * 100)}%`}
            />
          )
        })}
        {drawStart && drawCurrent && (
          <div
            className="absolute border-2 border-dashed border-primary bg-primary/10 pointer-events-none"
            style={{
              left: `${Math.min(drawStart.x, drawCurrent.x) * 100}%`,
              top: `${Math.min(drawStart.y, drawCurrent.y) * 100}%`,
              width: `${Math.abs(drawCurrent.x - drawStart.x) * 100}%`,
              height: `${Math.abs(drawCurrent.y - drawStart.y) * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  )
}
