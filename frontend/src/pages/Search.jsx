import { useState } from 'react'
import { api } from '../api/client'
import EntryCard from '../components/EntryCard'
import { EntryListSkeleton, Spinner } from '../components/Loader'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const data = await api('/api/journal/search', {
        method: 'POST',
        body: JSON.stringify({ q: query.trim() }),
      })
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-enter-active">
      <h1 className="text-2xl font-serif font-semibold text-ink mb-2">Search your journal</h1>
      <p className="text-muted mb-6">Find past entries by meaning — e.g. “when was I feeling anxious about work?”</p>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by meaning…"
            className="flex-1 px-4 py-3 rounded-xl border border-warm bg-white text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-terracotta/40"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-terracotta text-white font-medium hover:bg-terracottaDark disabled:opacity-60"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {searched && (
        <>
          {loading ? (
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="flex items-center gap-3 text-muted text-sm font-medium">
                <Spinner size="sm" />
                <span>Searching your journal…</span>
              </div>
              <EntryListSkeleton count={2} />
            </div>
          ) : results.length === 0 ? (
            <p className="text-muted">No matching entries. Try a different phrase.</p>
          ) : (
            <ul className="space-y-3">
              {results.map((entry) => (
                <li key={entry.id}>
                  <EntryCard entry={entry} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
