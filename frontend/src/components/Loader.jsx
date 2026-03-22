/**
 * Shared loading UI — spinners, streaming status, skeletons.
 */

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
}

/** Ring spinner — warm track + terracotta/sage sweep */
export function Spinner({ size = 'md', className = '' }) {
  const s = sizeMap[size] || sizeMap.md
  return (
    <div
      className={`relative inline-flex rounded-full ${s} border-[3px] border-warm border-t-terracotta border-r-sage/90 animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

/** Centered block for full page / section load */
export function PageLoader({ label = 'Loading…', size = 'md', className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-5 py-16 px-6 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-terracotta/10 blur-xl scale-150 animate-pulse-soft" />
        <Spinner size={size} />
      </div>
      <p className="text-sm text-muted font-medium tracking-wide">{label}</p>
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-terracotta/50 animate-loader-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

/** Card-style loader (softer, for modals / contained areas) */
export function CardLoader({ label = 'Loading…', className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-warm/80 bg-white/60 backdrop-blur-sm shadow-sm px-8 py-10 flex flex-col items-center gap-4 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Spinner size="md" />
      <p className="text-sm text-muted text-center max-w-[14rem] leading-relaxed">{label}</p>
    </div>
  )
}

/** Header row + area for streaming companion text */
export function StreamingLoader({ title = 'Companion is responding…', children, showCursor }) {
  return (
    <div className="page-enter-active max-w-2xl min-w-0 w-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-sage animate-loader-bounce"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
        <p className="text-muted text-sm font-medium">{title}</p>
      </div>
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sage/10 to-terracotta/5 border border-sage/20 min-h-[120px] shadow-inner">
        <p className="text-ink text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-serif">
          {children || '\u00a0'}
          {showCursor && (
            <span className="inline-block w-0.5 h-4 sm:h-5 ml-0.5 bg-terracotta align-middle animate-pulse rounded-sm" />
          )}
        </p>
      </div>
    </div>
  )
}

/** Placeholders matching EntryCard layout */
export function EntryListSkeleton({ count = 3 }) {
  return (
    <ul className="space-y-3 list-none p-0 m-0" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="block p-4 rounded-xl bg-white border border-warm/60 min-w-0 animate-pulse"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex gap-2">
              <div className="h-6 w-14 rounded-full bg-warm" />
              <div className="h-6 w-16 rounded-md bg-warm/70 hidden sm:block" />
            </div>
            <div className="h-4 w-20 rounded bg-warm/80" />
          </div>
          <div className="h-4 w-full max-w-[90%] rounded bg-warm mb-2" />
          <div className="h-3 w-2/3 rounded bg-warm/60" />
        </li>
      ))}
    </ul>
  )
}
