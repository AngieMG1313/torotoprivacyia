import type { Detection } from '../types'

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50/60 border-amber-200/80',
  APPROVED: 'bg-surface-container-low/50 border-outline-variant/40',
  REJECTED: 'bg-surface-container-low/30 border-outline-variant/20 opacity-60',
  PSEUDONYMIZED: 'bg-surface-container-low/50 border-outline-variant/40',
  HUMAN_EDITED: 'bg-surface-container-low/50 border-outline-variant/40',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente de revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Falso positivo',
  PSEUDONYMIZED: 'Pseudonimizado',
  HUMAN_EDITED: 'Editado manualmente',
}

export function FindingCard({
  detection,
  onDecide,
  onRequireManualBox,
}: {
  detection: Detection
  onDecide: (status: Detection['review_status']) => void
  onRequireManualBox: () => void
}) {
  const needsManualBox =
    detection.location.x === null ||
    detection.location.y === null ||
    detection.location.width === null ||
    detection.location.height === null

  const canAutoApprove = !needsManualBox || detection.manual_location !== null

  return (
    <div className={`p-3 rounded-lg border space-y-2 ${STATUS_STYLES[detection.review_status]}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              detection.review_status === 'PENDING' ? 'bg-amber-500 animate-pulse' : 'bg-tertiary'
            }`}
          />
          <span className="text-xs font-bold text-on-surface font-mono truncate">
            {detection.exact_text ?? `${detection.category} (sin texto extraído)`}
          </span>
        </div>
        <span className="text-label-sm bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full whitespace-nowrap">
          {STATUS_LABELS[detection.review_status]}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-on-surface-variant">
        <span>
          Pág. {detection.page} · {detection.rule_id} · {detection.category}
        </span>
        <span className="font-mono text-[11px]">
          Confianza: {Math.round(detection.confidence * 100)}%
        </span>
      </div>
      <p className="text-[11px] text-on-surface-variant">{detection.reason}</p>
      {needsManualBox && !detection.manual_location && (
        <p className="text-[11px] text-amber-700 font-medium">
          Sin ubicación confiable — requiere marcar un área manual antes de aprobar.
        </p>
      )}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-outline-variant/20">
        <button
          className="px-2.5 py-1 text-xs bg-white text-error border border-error/30 rounded hover:bg-error-container/30 transition-colors"
          onClick={() => onDecide('REJECTED')}
        >
          Falso Positivo
        </button>
        <button
          className="px-2.5 py-1 text-xs bg-surface-container hover:bg-surface-container-high text-on-surface rounded transition-colors"
          onClick={() => onDecide('PSEUDONYMIZED')}
        >
          Pseudonimizar
        </button>
        <button
          className="px-2.5 py-1 text-xs bg-primary text-on-primary rounded hover:bg-primary-container transition-colors flex items-center gap-1 disabled:opacity-40"
          disabled={!canAutoApprove}
          onClick={() => (canAutoApprove ? onDecide('APPROVED') : onRequireManualBox())}
        >
          <span className="material-symbols-outlined text-xs">check</span>
          Aprobar Máscara
        </button>
      </div>
    </div>
  )
}
