import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getWeeklySuggestions, refreshWeeklySuggestions } from '../api/client'
import { Spinner } from '../components/Loader'

/** Visual variety per card — keeps the list from feeling like a form. */
const CARD_STYLES = [
  {
    ring: 'ring-sage/25',
    accent: 'from-sage/15 via-white to-terracotta/10',
    bar: 'bg-gradient-to-b from-sage to-sageDark',
    iconWrap: 'bg-sage/25 text-sageDark',
  },
  {
    ring: 'ring-terracotta/20',
    accent: 'from-terracotta/10 via-white to-warm',
    bar: 'bg-gradient-to-b from-terracotta to-terracottaDark',
    iconWrap: 'bg-terracotta/15 text-terracottaDark',
  },
  {
    ring: 'ring-amber-900/10',
    accent: 'from-warm via-white to-sage/10',
    bar: 'bg-gradient-to-b from-muted/40 to-sage/60',
    iconWrap: 'bg-warm text-ink/80',
  },
  {
    ring: 'ring-sage/20',
    accent: 'from-white via-sage/8 to-terracotta/8',
    bar: 'bg-gradient-to-b from-sageDark/70 to-terracotta/80',
    iconWrap: 'bg-sage/20 text-sageDark',
  },
]

function IconSparkle({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" d="M12 3v2M12 19v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M3 12h2M19 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconLeaf({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4-4-6-8-6-12a6 6 0 0112 0c0 4-2 8-6 12z" />
      <path strokeLinecap="round" d="M12 21V9" />
    </svg>
  )
}

function IconSun({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function IconFeather({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20c8-2 14-8 16-16-4 2-8 2-12 0 2 4 2 8 0 12-4 2-8 2-12 0 4-2 8-2 12 0-2-4-2-8 0-12z" />
    </svg>
  )
}

const CARD_ICONS = [IconSparkle, IconLeaf, IconSun, IconFeather]

const PICK_LINES = [
  'Pick any one — or let them all marinate.',
  'No pressure to do them all; one small try counts.',
  'Treat these as invitations, not homework.',
]

export default function Suggestions() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [pickLine] = useState(() => PICK_LINES[Math.floor(Math.random() * PICK_LINES.length)])

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const res = isRefresh ? await refreshWeeklySuggestions() : await getWeeklySuggestions()
      setData(res)
    } catch (e) {
      setError(e.message || 'Could not load suggestions')
      setData(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load(false)
  }, [load])

  if (loading) {
    return (
      <div className="page-enter-active max-w-5xl w-full min-w-0">
        <header className="relative mb-10 overflow-hidden rounded-3xl border border-warm/80 bg-gradient-to-br from-white via-cream to-warm/60 px-6 py-8 sm:px-8">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-terracotta/10 blur-3xl animate-shimmer-slow"
            aria-hidden
          />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracottaDark/80 mb-2">This week</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-ink leading-tight mb-2">
            Gathering little ideas…
          </h1>
          <p className="text-muted text-sm sm:text-base max-w-2xl">
            We’re reading what you’ve already shared—no new spins, just gentle possibilities.
          </p>
        </header>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Spinner size="lg" />
          <p className="text-sm text-muted text-center max-w-xs">Almost there — your journal is whispering back.</p>
        </div>
      </div>
    )
  }

  const suggestions = data?.suggestions || []
  const note = data?.note
  const updatedAt = data?.updated_at
    ? new Date(data.updated_at).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null

  return (
    <div className="page-enter-active max-w-5xl w-full min-w-0">
      {/* Hero */}
      <header className="relative mb-8 overflow-hidden rounded-3xl border border-warm/80 bg-gradient-to-br from-white via-cream to-warm/50 px-5 py-7 sm:px-8 sm:py-8 shadow-sm">
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-sage/15 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-terracotta/10" aria-hidden />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-terracottaDark/90 mb-2">
              From your own words
            </p>
            <h1 className="font-serif text-2xl sm:text-[1.75rem] font-semibold text-ink leading-[1.2] mb-3">
              Your week,{' '}
              <span className="italic text-terracottaDark">gently</span> reimagined
            </h1>
            <p className="text-muted text-sm sm:text-base leading-relaxed max-w-2xl">
              Tiny experiments inspired only by moods, snippets, and reflections you’ve already saved here—not a
              to-do list, just soft invitations. Not medical advice.
            </p>
            {updatedAt && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs text-muted border border-warm/90">
                <span className="h-1.5 w-1.5 rounded-full bg-sage" aria-hidden />
                Last blended: {updatedAt}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="group shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-terracotta to-terracottaDark px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-terracotta/25 transition hover:brightness-105 hover:shadow-lg disabled:opacity-55 disabled:shadow-none min-h-[48px] w-full sm:w-auto"
          >
            {refreshing ? (
              <>
                <Spinner size="sm" className="!border-t-white !border-r-white/30 !border-warm/40" />
                Brewing fresh ideas…
              </>
            ) : (
              <>
                <IconSparkle className="h-4 w-4 opacity-90 group-hover:rotate-12 transition-transform" />
                Refresh from journal
              </>
            )}
          </button>
        </div>
        <p className="relative mt-5 text-xs text-muted/90 border-t border-warm/80 pt-4">
          Quick load uses your saved journal; the button above asks the AI for a fuller pass (it can take a minute).
        </p>
      </header>

      {error && (
        <div
          className="mb-6 flex gap-3 rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-red-800 text-sm"
          role="alert"
        >
          <span className="text-lg leading-none" aria-hidden>
            ✦
          </span>
          <div>{error}</div>
        </div>
      )}

      {note && (
        <div className="mb-8 flex gap-3 rounded-2xl border border-terracotta/20 bg-gradient-to-r from-terracotta/5 to-warm/40 px-4 py-3.5 sm:px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-terracotta/15 text-terracottaDark" aria-hidden>
            <IconFeather className="h-4 w-4" />
          </div>
          <p className="text-sm text-muted leading-relaxed pt-0.5">{note}</p>
        </div>
      )}

      {!error && suggestions.length === 0 && (
        <div className="mb-8 rounded-3xl border-2 border-dashed border-warm bg-white/60 px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sage/15 text-sageDark">
            <IconLeaf className="h-7 w-7" />
          </div>
          <p className="font-serif text-lg text-ink mb-2">Room for your first echoes</p>
          <p className="text-sm text-muted max-w-md mx-auto mb-6">
            Once you add a voice or written entry, we can mirror themes back here. Still stuck? Make sure the API is
            running on port <code className="text-xs bg-warm px-1.5 py-0.5 rounded">8000</code>.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/record"
              className="inline-flex items-center rounded-xl bg-sage px-4 py-2.5 text-sm font-medium text-white hover:bg-sageDark transition-colors"
            >
              Record a thought
            </Link>
            <Link
              to="/write"
              className="inline-flex items-center rounded-xl border border-warm bg-white px-4 py-2.5 text-sm font-medium text-ink hover:bg-warm/80 transition-colors"
            >
              Write instead
            </Link>
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <p className="mb-5 text-sm text-muted italic font-serif">{pickLine}</p>
      )}

      <ul className="space-y-5 list-none p-0 m-0">
        {suggestions.map((s, i) => {
          const style = CARD_STYLES[i % CARD_STYLES.length]
          const Icon = CARD_ICONS[i % CARD_ICONS.length]
          const delayMs = Math.min(i * 70, 400)
          return (
            <li
              key={i}
              className={`group relative overflow-hidden rounded-2xl border border-warm/70 bg-gradient-to-br ${style.accent} p-0 shadow-sm ring-1 ${style.ring} opacity-0 animate-suggest-in motion-reduce:animate-none motion-reduce:opacity-100 hover:shadow-md transition-shadow`}
              style={{ animationDelay: `${delayMs}ms` }}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar} rounded-l-2xl`} aria-hidden />
              <div className="relative pl-5 pr-4 py-5 sm:pl-6 sm:pr-6 sm:py-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${style.iconWrap} shadow-sm`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-lg bg-white/90 border border-warm/90 text-xs font-bold text-sageDark tabular-nums">
                        {i + 1}
                      </span>
                      <span className="text-[0.65rem] uppercase tracking-wider text-muted font-semibold">
                        Little experiment
                      </span>
                    </div>
                    <h2 className="font-serif text-lg sm:text-xl font-semibold text-ink leading-snug mb-2 group-hover:text-terracottaDark transition-colors">
                      {s.title}
                    </h2>
                    <p className="text-muted text-sm sm:text-[0.95rem] leading-relaxed">{s.detail}</p>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <footer className="mt-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-warm/80 bg-white/50 px-5 py-4 text-sm text-muted">
        <p className="min-w-0">
          New entries nudge this list over time — your journal stays the only source.
        </p>
        <Link
          to="/home"
          className="inline-flex items-center justify-center gap-1.5 shrink-0 font-semibold text-terracotta hover:text-terracottaDark transition-colors"
        >
          ← Back to Home
        </Link>
      </footer>
    </div>
  )
}
