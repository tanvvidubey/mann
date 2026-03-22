export function getAuthHeaders() {
  const token = localStorage.getItem('mann_token')
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/** FastAPI often returns `detail` as a string or a validation error array */
function formatApiDetail(detail) {
  if (detail == null) return 'Request failed'
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (typeof e === 'string' ? e : e.msg || e.detail || JSON.stringify(e)))
      .join('; ')
  }
  if (typeof detail === 'object') return detail.msg || JSON.stringify(detail)
  return String(detail)
}

export async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(formatApiDetail(err.detail) || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

export async function uploadAudio(blob) {
  const token = localStorage.getItem('mann_token')
  const form = new FormData()
  form.append('file', blob, 'recording.webm')
  const res = await fetch('/api/journal/transcribe', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Transcription failed')
  }
  return res.json()
}

/**
 * Save entry with streaming companion response.
 * Callbacks: onEntry(entry) when entry is created, onChunk(text) for each streamed token.
 * Returns a Promise that resolves with the full entry when streaming is done.
 */
export async function saveEntry(transcript, pin, audioDurationSeconds, entryType = 'voice', callbacks = {}) {
  const token = localStorage.getItem('mann_token')
  const form = new FormData()
  form.append('transcript', transcript)
  form.append('pin', pin)
  if (audioDurationSeconds != null) form.append('audio_duration_seconds', String(audioDurationSeconds))
  form.append('entry_type', entryType)
  const res = await fetch('/api/journal/save', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Save failed')
  }
  const { onEntry, onChunk } = callbacks
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let entryData = null
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const obj = JSON.parse(line)
        if (obj.event === 'entry') {
          const { event: _, ...rest } = obj
          entryData = rest
          if (entryData.created_at) entryData.created_at = new Date(entryData.created_at).toISOString()
          onEntry && onEntry(entryData)
        } else if (obj.event === 'chunk') {
          onChunk && onChunk(obj.text || '')
        } else if (obj.event === 'done') {
          const { event: _, text: __, ...doneData } = obj
          return { ...entryData, ...doneData }
        }
      } catch (_) {}
    }
  }
  return entryData
}

export async function getEntry(entryId, pin) {
  return api(`/api/journal/entry/${entryId}?pin=${encodeURIComponent(pin)}`)
}

/** Cached weekly suggestions (journal interactions only; refreshed when you save an entry) */
export async function getWeeklySuggestions() {
  // No short client timeout: GET uses a fast journal-only path on the server; 60s aborts caused false errors
  // when Postgres/proxy was slow. Optional: VITE_SUGGESTIONS_FETCH_MS (ms) + AbortSignal if you need a cap.
  const ms = import.meta.env.VITE_SUGGESTIONS_FETCH_MS
  if (ms != null && ms !== '' && Number(ms) > 0) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), Number(ms))
    try {
      return await api('/api/journal/suggestions', { signal: ctrl.signal })
    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error('Suggestions request timed out. Check the API on port 8000 and your network.')
      }
      throw e
    } finally {
      clearTimeout(t)
    }
  }
  return api('/api/journal/suggestions')
}

/** Regenerate suggestions from current journal data */
export async function refreshWeeklySuggestions() {
  return api('/api/journal/suggestions/refresh', { method: 'POST' })
}

export async function searchEntries(query) {
  return api('/api/journal/search', {
    method: 'POST',
    body: JSON.stringify({ q: query }),
  })
}

export async function getProfile() {
  return api('/api/profile')
}

export async function updateProfile(body) {
  return api('/api/profile', { method: 'PATCH', body: JSON.stringify(body) })
}

export async function verifyEmail(token) {
  return api('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) })
}

export async function requestPinChange(email) {
  return api('/api/auth/request-pin-change', { method: 'POST', body: JSON.stringify({ email }) })
}

export async function confirmPinChange(token, newPin) {
  return api('/api/auth/confirm-pin-change', { method: 'POST', body: JSON.stringify({ token, new_pin: newPin }) })
}
