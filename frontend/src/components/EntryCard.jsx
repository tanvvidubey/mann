import { Link } from 'react-router-dom'

const moodColors = {
  happy: 'bg-amber-100 text-amber-800',
  sad: 'bg-slate-200 text-slate-700',
  anxious: 'bg-rose-100 text-rose-800',
  calm: 'bg-sky-100 text-sky-800',
  angry: 'bg-red-100 text-red-800',
  confused: 'bg-violet-100 text-violet-800',
  grateful: 'bg-emerald-100 text-emerald-800',
  excited: 'bg-orange-100 text-orange-800',
}

export default function EntryCard({ entry }) {
  const moodClass = moodColors[entry.mood] || 'bg-warm text-muted'
  const date = entry.created_at ? new Date(entry.created_at).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: entry.created_at.slice(0, 4) !== new Date().getFullYear().toString() ? 'numeric' : undefined,
  }) : ''

  return (
    <Link
      to={`/entry/${entry.id}`}
      className="block p-4 rounded-xl bg-white border border-warm/60 hover:border-terracotta/40 hover:shadow-sm transition-all active:scale-[0.99] min-w-0"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${moodClass}`}>
            {entry.mood}
          </span>
          {entry.entry_type === 'text' && (
            <span className="shrink-0 text-xs text-muted border border-warm rounded-md px-1.5 py-0.5">Written</span>
          )}
        </div>
        <span className="shrink-0 text-muted text-xs">{date}</span>
      </div>
      <p className="text-ink font-medium text-sm sm:text-base line-clamp-1 break-words">{entry.transcript_preview}</p>
      {entry.one_line_summary && (
        <p className="text-muted text-sm mt-1.5 line-clamp-2 break-words">{entry.one_line_summary}</p>
      )}
      <p className="text-xs text-muted mt-2">Mood {entry.mood_score}/10</p>
    </Link>
  )
}
