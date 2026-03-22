import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/Loader'
import AnimatedLogo from '../components/AnimatedLogo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, pin)
      navigate('/home')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-cream flex items-center justify-center px-3 sm:px-4 py-6 safe-area-pad">
      <div className="w-full max-w-sm min-w-0">
        <div className="flex justify-center mb-4">
          <AnimatedLogo className="h-12 w-12 sm:h-14 sm:w-14 rounded-full" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-ink text-center mb-2">Mann</h1>
        <p className="text-muted text-center mb-6 sm:mb-8 text-sm sm:text-base">Welcome back to your private journal.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-warm bg-white text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-terracotta/40 text-base"
            required
          />
          <input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full px-4 py-3.5 min-h-[48px] rounded-xl border border-warm bg-white text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-terracotta/40 text-base"
            required
            minLength={4}
          />
          <p className="text-right -mt-1">
            <Link to="/change-pin" className="text-sm text-terracotta hover:underline py-2 inline-block">Forgot PIN?</Link>
          </p>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 min-h-[48px] rounded-xl bg-terracotta text-white font-medium hover:bg-terracottaDark transition-colors disabled:opacity-60 text-base inline-flex items-center justify-center gap-2"
          >
            {loading && <Spinner size="sm" className="!w-5 !h-5 border-2 border-white/40 border-t-white border-r-white/70" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-muted text-sm">
          Don't have an account? <Link to="/signup" className="text-terracotta hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
