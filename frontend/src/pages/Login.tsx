import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import logo from '../assets/srm-logo.png'
import campus from '../assets/hospital-campus.jpg'

const HIGHLIGHTS = [
  { icon: 'inventory_2', text: 'Live blood stock and expiry tracking' },
  { icon: 'hub', text: 'Compatibility-aware allocation' },
  { icon: 'query_stats', text: 'Demand forecasts and AI insights' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    const ok = await login(username, password)
    setLoading(false)
    if (ok) navigate('/dashboard')
    else setError('Invalid username or password.')
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-white">
      {/* Left: brand panel over the hospital photo */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0b1b36] p-14 text-white">
        <img src={campus} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1b36]/90 via-[#13294b]/80 to-[#0b1b36]/95" />

        <div className="relative">
          <img src={logo} alt="SRM Global Hospitals" className="h-14 w-auto rounded-lg bg-white px-3 py-2" />
        </div>

        <div className="relative max-w-md">
          <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.3em] text-[#9db7e0]">Blood Bank Management</p>
          <h1 className="font-headline text-5xl font-extrabold leading-[1.08] tracking-tight">
            Every unit counted.<br />Every patient covered.
          </h1>
          <ul className="mt-9 space-y-4">
            {HIGHLIGHTS.map(({ icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[16px] font-medium text-white/90">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                  <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[12px] text-white/70">© SRM Global Hospitals · Authorised staff only</p>
      </div>

      {/* Right: sign-in card */}
      <div
        className="flex flex-col items-center justify-center px-5 py-10 sm:px-10"
        style={{ background: 'linear-gradient(160deg, #e8f1fe 0%, #ffffff 55%)' }}
      >
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 inline-flex items-center gap-1 text-[14px] font-semibold text-[#13294b] hover:underline">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to homepage
          </Link>

          <div className="overflow-hidden rounded-lg border border-[#13294b] bg-white shadow-lg">
            <div className="bg-[#13294b] px-7 py-5">
              <img src={logo} alt="SRM Global Hospitals" className="mb-4 h-10 w-auto rounded bg-white px-2 py-1 lg:hidden" />
              <h2 className="font-headline text-2xl font-extrabold text-white">Admin Login</h2>
              <p className="mt-1 text-[13px] text-white/80">Sign in to manage inventory, donors and allocations.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-7">
              <div>
                <label htmlFor="username" className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-wider text-[#13294b]">
                  Username
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-[#4b5468]">person</span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                    className="w-full rounded border border-[#13294b]/60 bg-white py-3 pl-10 pr-3 text-[15px] text-[#0b1b36] outline-none transition focus:border-[#13294b] focus:ring-2 focus:ring-[#9db7e0]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-wider text-[#13294b]">
                  Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-[#4b5468]">lock</span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="w-full rounded border border-[#13294b]/60 bg-white py-3 pl-10 pr-11 text-[15px] text-[#0b1b36] outline-none transition focus:border-[#13294b] focus:ring-2 focus:ring-[#9db7e0]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#4b5468] hover:bg-[#13294b]/10"
                  >
                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="flex items-center gap-2 rounded border border-[#7a0909]/40 bg-[#f4c4be] px-3 py-2.5 text-[13px] font-semibold text-[#4a0005]">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded bg-[#13294b] py-3.5 text-[15px] font-bold text-white transition hover:bg-[#0b1b36] active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-[12px] font-semibold uppercase tracking-widest text-[#4b5468]">
            Restricted access · Authorised staff only
          </p>
        </div>
      </div>
    </div>
  )
}
