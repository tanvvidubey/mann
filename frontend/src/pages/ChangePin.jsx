import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { requestPinChange, confirmPinChange } from '../api/client'

export default function ChangePin() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [step, setStep] = useState(token ? 'set-pin' : 'request') // request | set-pin | done | error
  const [email, setEmail] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleRequest = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await requestPinChange(email.trim())
      setMessage('If that email is registered, you’ll receive a link to change your PIN. Check your inbox.')
      setStep('done')
    } catch (err) {
      setError(err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (e) => {
    e.preventDefault()
    if (newPin !== confirmPin) {
      setError('PINs do not match')
      return
    }
    if (newPin.length < 4) {
      setError('PIN should be at least 4 characters')
      return
    }
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await confirmPinChange(token, newPin)
      setMessage('PIN updated. You can log in with your new PIN.')
      setStep('done')
    } catch (err) {
      setError(err.message || 'Failed to update PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-serif font-semibold text-ink mb-2 text-center">Change your PIN</h1>

        {step === 'request' && (
          <>
            <p className="text-muted text-center mb-6">Enter your email. We’ll send a secure link to set a new PIN.</p>
            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
            <form onSubmit={handleRequest} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="w-full px-4 py-3 rounded-xl border border-warm bg-white text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-terracotta/40"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-terracotta text-white font-medium hover:bg-terracottaDark disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send link'}
              </button>
            </form>
          </>
        )}

        {step === 'set-pin' && token && (
          <>
            <p className="text-muted text-center mb-6">Set a new PIN. It will be used to encrypt and decrypt your entries.</p>
            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
            <form onSubmit={handleConfirm} className="space-y-4">
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="New PIN"
                className="w-full px-4 py-3 rounded-xl border border-warm bg-white text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-terracotta/40"
                minLength={4}
                autoComplete="new-password"
              />
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirm new PIN"
                className="w-full px-4 py-3 rounded-xl border border-warm bg-white text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-terracotta/40"
                minLength={4}
                autoComplete="new-password"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-terracotta text-white font-medium hover:bg-terracottaDark disabled:opacity-60"
              >
                {loading ? 'Updating…' : 'Set new PIN'}
              </button>
            </form>
          </>
        )}

        {step === 'done' && (
          <div className="text-center">
            <p className="text-muted mb-6 p-4 rounded-xl bg-sage/20 text-sageDark">{message}</p>
            <Link to="/login" className="inline-block px-6 py-2.5 rounded-xl bg-terracotta text-white font-medium hover:bg-terracottaDark">
              Log in
            </Link>
          </div>
        )}

        <p className="text-center mt-6 text-sm text-muted">
          <Link to="/login" className="text-terracotta hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  )
}
