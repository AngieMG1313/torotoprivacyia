export function TopNavBar({
  searchPlaceholder = 'Buscar expedientes, contratos o hashes...',
  primaryAction,
}: {
  searchPlaceholder?: string
  primaryAction?: { label: string; to: string }
}) {
  return (
    <header className="sticky top-0 z-30 flex justify-between items-center h-16 px-6 bg-surface-container-lowest border-b border-outline-variant/30 shadow-sm">
      <div className="flex items-center gap-4 max-w-lg w-full">
        <div className="relative w-full max-w-xs">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-lg">
            search
          </span>
          <input
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-container-low border border-outline-variant/50 rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:bg-surface-container-lowest transition-colors"
            placeholder={searchPlaceholder}
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 border-r border-outline-variant/30 pr-3">
          <button
            className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors relative"
            title="Notificaciones"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
          <button
            className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
            title="Ayuda"
          >
            <span className="material-symbols-outlined text-xl">help</span>
          </button>
        </div>
        {primaryAction && (
          <a
            href={primaryAction.to}
            className="px-3.5 py-1.5 bg-primary text-on-primary rounded-lg text-body-sm font-semibold hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            {primaryAction.label}
          </a>
        )}
      </div>
    </header>
  )
}
