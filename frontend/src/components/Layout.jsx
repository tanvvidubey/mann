import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AnimatedLogo from './AnimatedLogo'

const navClass = ({ isActive }) =>
  `block px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center ${
    isActive ? 'bg-terracotta/15 text-terracottaDark' : 'text-muted hover:bg-warm hover:text-ink'
  }`

export default function Layout() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const raw = (user?.name || user?.email || '').toString().trim()
  const initial = raw ? raw.charAt(0).toUpperCase() : '?'
  return (
    <div className="min-h-screen bg-cream flex flex-col min-w-0">
      <header className="border-b border-warm/80 bg-cream/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between min-h-[56px]">
          <NavLink to="/home" className="flex items-center gap-2 text-xl font-serif font-semibold text-ink shrink-0" onClick={() => setMenuOpen(false)}>
            <span className="rounded-full overflow-hidden shrink-0">
              <AnimatedLogo className="h-8 w-8" />
            </span>
            Mann
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-wrap justify-end">
            <NavLink to="/home" className={navClass} onClick={() => setMenuOpen(false)}>Home</NavLink>
            <NavLink to="/record" className={navClass} onClick={() => setMenuOpen(false)}>Record</NavLink>
            <NavLink to="/write" className={navClass} onClick={() => setMenuOpen(false)}>Write</NavLink>
            <NavLink to="/insights" className={navClass} onClick={() => setMenuOpen(false)}>Insights</NavLink>
            <NavLink to="/suggestions" className={navClass} onClick={() => setMenuOpen(false)}>Suggestions</NavLink>
            <NavLink to="/search" className={navClass} onClick={() => setMenuOpen(false)}>Search</NavLink>
            <NavLink
              to="/profile"
              className="ml-2 flex items-center justify-center w-9 h-9 rounded-full bg-terracotta/20 text-terracotta font-semibold text-sm hover:bg-terracotta/30 transition-colors shrink-0"
              title="Profile"
              onClick={() => setMenuOpen(false)}
            >
              {initial}
            </NavLink>
            <button
              type="button"
              onClick={() => { logout(); setMenuOpen(false); }}
              className="ml-1 px-3 py-2 text-sm text-muted hover:text-terracotta rounded-lg"
            >
              Log out
            </button>
          </nav>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-ink hover:bg-warm shrink-0"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile nav (full-width, stacked) */}
        {menuOpen && (
          <nav className="md:hidden border-t border-warm/80 bg-cream px-4 py-3 space-y-1">
            <NavLink to="/home" className={navClass} onClick={() => setMenuOpen(false)}>Home</NavLink>
            <NavLink to="/record" className={navClass} onClick={() => setMenuOpen(false)}>Record</NavLink>
            <NavLink to="/write" className={navClass} onClick={() => setMenuOpen(false)}>Write</NavLink>
            <NavLink to="/insights" className={navClass} onClick={() => setMenuOpen(false)}>Insights</NavLink>
            <NavLink to="/suggestions" className={navClass} onClick={() => setMenuOpen(false)}>Suggestions</NavLink>
            <NavLink to="/search" className={navClass} onClick={() => setMenuOpen(false)}>Search</NavLink>
            <div className="flex items-center gap-3 pt-3 mt-3 border-t border-warm/60">
              <NavLink to="/profile" className="flex items-center gap-2 py-2 text-muted hover:text-ink" onClick={() => setMenuOpen(false)}>
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-terracotta/20 text-terracotta font-semibold text-sm">{initial}</span>
                Profile
              </NavLink>
              <button type="button" onClick={() => { logout(); setMenuOpen(false); }} className="text-sm text-muted hover:text-terracotta py-2">
                Log out
              </button>
            </div>
          </nav>
        )}
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 min-w-0 box-border">
        <Outlet />
      </main>
    </div>
  )
}
