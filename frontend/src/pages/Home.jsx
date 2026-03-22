import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import EntryCard from '../components/EntryCard'
import { EntryListSkeleton } from '../components/Loader'

export default function Home() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/journal/entries')
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-enter-active min-w-0 w-full">
      <h1 className="text-xl sm:text-2xl font-serif font-semibold text-ink mb-1">Today’s moment</h1>
      <p className="text-muted mb-6 sm:mb-8 text-sm sm:text-base">One entry at a time. Record or write, then submit when you’re ready.</p>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 sm:mb-10">
        <Link
          to="/record"
          className="flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px] py-8 px-4 rounded-2xl bg-gradient-to-b from-terracotta/15 to-sage/15 border border-terracotta/30 hover:border-terracotta/50 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <span className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-terracotta text-white mb-3 shadow-sm">
            <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
            </svg>
          </span>
          <span className="font-medium text-ink text-center">Record</span>
          <span className="text-xs text-muted mt-0.5">Voice · submit when ready</span>
        </Link>
        <Link
          to="/write"
          className="flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px] py-8 px-4 rounded-2xl bg-gradient-to-b from-sage/15 to-terracotta/15 border border-sage/40 hover:border-sage/60 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <span className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-sage text-white mb-3 shadow-sm">
            <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </span>
          <span className="font-medium text-ink text-center">Write</span>
          <span className="text-xs text-muted mt-0.5">Type · submit when ready</span>
        </Link>
      </section>

      <h2 className="text-base sm:text-lg font-semibold text-ink mb-3">Recent entries</h2>
      {loading ? (
        <EntryListSkeleton count={4} />
      ) : entries.length === 0 ? (
        <p className="text-muted">No entries yet. Record your first one above.</p>
      ) : (
        <ul className="space-y-3 list-none p-0 m-0">
          {entries.slice(0, 5).map((entry) => (
            <li key={entry.id}>
              <EntryCard entry={entry} />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8 pt-6 border-t border-warm/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-muted">
          This week’s ideas (from your journal only; refresh when you save an entry):{' '}
          <Link to="/suggestions" className="text-terracotta font-medium hover:underline">
            Suggestions
          </Link>
        </p>
        {entries.length > 5 && (
          <Link to="/insights" className="text-terracotta text-sm font-medium hover:underline shrink-0">
            View all & insights →
          </Link>
        )}
      </div>
    </div>
  )
}
