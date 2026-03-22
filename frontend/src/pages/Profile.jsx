import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProfile, updateProfile } from '../api/client'
import { PageLoader } from '../components/Loader'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [edit, setEdit] = useState({
    name: '',
    bio: '',
    hobbies: '',
    likes: '',
    dislikes: '',
    other_details: '',
  })

  useEffect(() => {
    getProfile()
      .then((p) => {
        setProfile(p)
        setEdit({
          name: p.name || '',
          bio: p.bio || '',
          hobbies: Array.isArray(p.hobbies) ? p.hobbies.join(', ') : (p.hobbies || ''),
          likes: p.likes || '',
          dislikes: p.dislikes || '',
          other_details: p.other_details || '',
        })
      })
      .catch(() => setError('Could not load profile'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)
    try {
      const body = {
        name: edit.name || undefined,
        bio: edit.bio || undefined,
        hobbies: edit.hobbies ? edit.hobbies.split(',').map((s) => s.trim()).filter(Boolean) : [],
        likes: edit.likes || undefined,
        dislikes: edit.dislikes || undefined,
        other_details: edit.other_details || undefined,
      }
      const updated = await updateProfile(body)
      setProfile(updated)
      setMessage('Profile saved. Your journal reflections will use this context.')
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <PageLoader label="Loading your profile…" className="page-enter-active" />
  }

  if (error && !profile) {
    return (
      <div className="page-enter-active">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="page-enter-active max-w-2xl w-full min-w-0">
      <h1 className="text-xl sm:text-2xl font-serif font-semibold text-ink mb-1">Profile</h1>
      <p className="text-muted text-sm sm:text-base mb-6">Your details can be used in reflections when you ask. All data is stored securely.</p>

      {profile && !profile.email_verified && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Verify your email to enable PIN change by email. Check your inbox for the verification link.
        </div>
      )}

      {message && <div className="mb-4 p-3 rounded-xl bg-sage/20 text-sageDark text-sm">{message}</div>}
      {error && <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Name</label>
          <input
            value={edit.name}
            onChange={(e) => setEdit((x) => ({ ...x, name: e.target.value }))}
            className="w-full px-4 py-3 min-h-[44px] rounded-xl border border-warm bg-white text-ink text-base focus:outline-none focus:ring-2 focus:ring-terracotta/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
          <p className="text-muted text-sm">{profile?.email}</p>
          <span className="text-xs text-muted">{profile?.email_verified ? 'Verified' : 'Not verified'}</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Bio</label>
          <textarea
            value={edit.bio}
            onChange={(e) => setEdit((x) => ({ ...x, bio: e.target.value }))}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-warm bg-white text-ink text-base placeholder-muted focus:outline-none focus:ring-2 focus:ring-terracotta/40 resize-y"
            placeholder="A short intro"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Hobbies</label>
          <input
            value={edit.hobbies}
            onChange={(e) => setEdit((x) => ({ ...x, hobbies: e.target.value }))}
            className="w-full px-4 py-3 min-h-[44px] rounded-xl border border-warm bg-white text-ink text-base placeholder-muted focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            placeholder="e.g. reading, hiking, music"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Likes</label>
          <textarea
            value={edit.likes}
            onChange={(e) => setEdit((x) => ({ ...x, likes: e.target.value }))}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-warm bg-white text-ink text-base placeholder-muted focus:outline-none focus:ring-2 focus:ring-terracotta/40 resize-y"
            placeholder="Things you like"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Dislikes</label>
          <textarea
            value={edit.dislikes}
            onChange={(e) => setEdit((x) => ({ ...x, dislikes: e.target.value }))}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-warm bg-white text-ink text-base placeholder-muted focus:outline-none focus:ring-2 focus:ring-terracotta/40 resize-y"
            placeholder="Things you dislike"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Other details</label>
          <textarea
            value={edit.other_details}
            onChange={(e) => setEdit((x) => ({ ...x, other_details: e.target.value }))}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-warm bg-white text-ink text-base placeholder-muted focus:outline-none focus:ring-2 focus:ring-terracotta/40 resize-y"
            placeholder="Anything else that matters to you"
          />
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="min-w-[140px] px-6 py-3 min-h-[44px] rounded-xl bg-terracotta text-white font-medium hover:bg-terracottaDark disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      <div className="mt-10 pt-6 border-t border-warm/80">
        <h2 className="text-base font-semibold text-ink mb-2">Security</h2>
        <p className="text-muted text-sm mb-3">Change your PIN via email. We’ll send you a secure link.</p>
        <Link
          to="/change-pin"
          className="inline-block px-4 py-2.5 min-h-[44px] rounded-xl border border-warm text-ink hover:bg-warm text-sm font-medium flex items-center"
        >
          Change PIN
        </Link>
      </div>
    </div>
  )
}
