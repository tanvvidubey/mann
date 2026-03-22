import { useNavigate } from 'react-router-dom'

export default function Onboarding() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage/20 text-sage mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-serif font-semibold text-ink mb-3">
          Your journal is private and encrypted
        </h1>
        <p className="text-muted leading-relaxed mb-8">
          Everything you record is encrypted with your PIN before it’s saved. Only you can read your entries. We never store your thoughts in plain text.
        </p>
        <button
          onClick={() => navigate('/home')}
          className="px-8 py-3 rounded-xl bg-terracotta text-white font-medium hover:bg-terracottaDark transition-colors"
        >
          Continue to Mann
        </button>
      </div>
    </div>
  )
}
