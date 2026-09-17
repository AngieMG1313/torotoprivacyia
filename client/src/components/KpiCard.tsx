export function KpiCard({
  label,
  value,
  suffix,
  icon,
  tone = 'primary',
  footnote,
}: {
  label: string
  value: string | number
  suffix?: string
  icon: string
  tone?: 'primary' | 'amber' | 'tertiary'
  footnote?: string
}) {
  const iconColor =
    tone === 'amber' ? 'text-amber-600' : tone === 'tertiary' ? 'text-tertiary-container' : 'text-primary'

  return (
    <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between text-secondary mb-2">
        <span className="font-label-sm text-label-sm font-semibold tracking-wider uppercase text-secondary">
          {label}
        </span>
        <span className={`material-symbols-outlined text-[20px] ${iconColor}`}>{icon}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">
          {value}
        </span>
        {suffix && <span className="font-title-sm text-title-sm text-secondary">{suffix}</span>}
      </div>
      {footnote && (
        <div className="mt-2.5 text-body-sm text-on-surface-variant truncate">{footnote}</div>
      )}
    </div>
  )
}
