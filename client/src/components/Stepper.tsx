const STEPS = [
  { label: 'Carga de archivo PDF' },
  { label: 'Configuración de detección' },
  { label: 'Análisis IA' },
  { label: 'Revisión humana y firma' },
]

export function Stepper({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
  return (
    <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/40 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {STEPS.map((step, idx) => {
          const stepNumber = idx + 1
          const isDone = stepNumber < currentStep
          const isActive = stepNumber === currentStep
          return (
            <div
              key={step.label}
              className={
                isActive
                  ? 'flex items-center gap-3 p-2 rounded-lg bg-primary text-on-primary shadow-sm border border-primary ring-2 ring-primary/20'
                  : 'flex items-center gap-3 p-2 rounded-lg bg-surface-container-low/60 border border-outline-variant/20'
              }
            >
              <div
                className={
                  isDone
                    ? 'w-8 h-8 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center shrink-0'
                    : isActive
                      ? 'w-8 h-8 rounded-full bg-on-primary text-primary flex items-center justify-center font-bold text-sm shrink-0'
                      : 'w-8 h-8 rounded-full bg-surface-container border border-outline text-outline flex items-center justify-center shrink-0 font-label-md'
                }
              >
                {isDone ? (
                  <span className="material-symbols-outlined text-base">check</span>
                ) : (
                  stepNumber
                )}
              </div>
              <div className="min-w-0">
                <span
                  className={
                    isActive
                      ? 'text-[10px] uppercase font-bold tracking-wider text-primary-fixed block'
                      : isDone
                        ? 'text-label-sm text-tertiary block'
                        : 'text-label-sm text-secondary uppercase tracking-wider block'
                  }
                >
                  {isDone ? `Paso ${stepNumber} · Completado` : `Paso ${stepNumber}`}
                </span>
                <span
                  className={
                    isActive
                      ? 'text-body-sm font-semibold truncate block'
                      : 'text-body-sm font-medium text-on-surface truncate block'
                  }
                >
                  {step.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
