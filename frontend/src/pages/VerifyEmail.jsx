import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { verifyEmail } from '../api/client'
import { PageLoader } from '../components/Loader'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing verification link.')
      return
    }
    verifyEmail(token)
      .then(() => {
        setStatus('ok')
        setMessage('Email verified. You can log in now.')
        setTimeout(() => navigate('/login'), 2000)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.message || 'Verification failed or link expired.')
      })
  }, [token, navigate])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-serif font-semibold text-ink mb-4">Verify your email</h1>
        {status === 'loading' && (
          <PageLoader label="Verifying your email…" className="py-8" />
        )}
        {status === 'ok' && (
          <p className="mb-6 p-4 rounded-xl bg-sage/20 text-sageDark">{message}</p>
        )}
        {status === 'error' && (
          <p className="text-red-600 mb-6 p-4 rounded-xl bg-red-50">{message}</p>
        )}
        {status !== 'loading' && (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-xl bg-terracotta text-white font-medium hover:bg-terracottaDark"
          >
            Back to login
          </button>
        )}
      </div>
    </div>
  )
}
