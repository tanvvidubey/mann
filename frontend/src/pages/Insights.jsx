import { useState, useEffect } from 'react'
import { api } from '../api/client'
import MoodGraph from '../components/MoodGraph'
import { Link } from 'react-router-dom'

export default function Insights() {
  const [data, setData] = useState(null)
  const [days, setDays] = useState(7)

  useEffect(() => {
    api(`/api/journal/insights?days=${days}`)
      .then(setData)
      .catch(() => setData({ entries: [], total_entries: 0 }))
  }, [days])

  const entries = data?.entries || []
  const total = data?.total_entries ?? 0
  const mostCommon = data?.most_common_mood
  const bestDay = data?.best_day

  return (
    <div className="page-enter-active">
      <h1 className="text-2xl font-serif font-semibold text-ink mb-2">Your week at a glance</h1>
      <p className="text-muted mb-6">Mood over time and patterns.</p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setDays(7)}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${days === 7 ? 'bg-terracotta text-white' : 'bg-warm/60 text-muted hover:bg-warm'}`}
        >
          7 days
        </button>
        <button
          onClick={() => setDays(30)}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${days === 30 ? 'bg-terracotta text-white' : 'bg-warm/60 text-muted hover:bg-warm'}`}
        >
          30 days
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-warm/60 p-6 mb-8">
        <MoodGraph data={data} days={days} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="p-5 rounded-2xl bg-white border border-warm/60">
          <p className="text-muted text-sm mb-1">Total entries</p>
          <p className="text-2xl font-semibold text-ink">{total}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-warm/60">
          <p className="text-muted text-sm mb-1">Most common mood</p>
          <p className="text-2xl font-semibold text-ink capitalize">{mostCommon || '—'}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-warm/60">
          <p className="text-muted text-sm mb-1">Best day</p>
          <p className="text-lg font-semibold text-ink">
            {bestDay ? `${bestDay.date} (${bestDay.mood_score}/10)` : '—'}
          </p>
        </div>
      </div>

      <Link to="/record" className="text-terracotta font-medium hover:underline">
        Record a new entry →
      </Link>
    </div>
  )
}
