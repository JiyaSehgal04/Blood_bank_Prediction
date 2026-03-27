import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const ok = await login(username, password)
    setLoading(false)
    if (ok) navigate('/dashboard')
    else setError('Invalid credentials. Try admin / bloodbank2026')
  }

  return (
    <div className="min-h-screen bg-[#fbfaee] grid grid-cols-1 lg:grid-cols-2">
      {/* Left: hero */}
      <div className="hidden lg:flex flex-col justify-between bg-[#1b1c15] p-16">
        <span className="text-2xl font-black text-white tracking-tighter font-headline">
          HEMA_STRAT
        </span>
        <div>
          <div className="flex items-center gap-2 mb-6">
            <span className="text-[#79db8d] text-xs font-mono uppercase tracking-widest">
              SYSTEM_MODULE / ACCESS_CONTROL
            </span>
          </div>
          <h1 className="font-headline text-5xl font-extrabold text-white leading-tight tracking-tighter mb-6">
            Blood Bank<br />Inventory &amp;<br />Distribution
          </h1>
          <p className="text-white/50 text-base leading-relaxed max-w-sm">
            Engineered for clinical precision. Real-time logistics, rigorous
            cross-matching protocols, and automated inventory reconciliation.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[['76+', 'Records Tracked'], ['3', 'Components'], ['8', 'Blood Groups']].map(
            ([val, label]) => (
              <div key={label} className="border-l border-white/10 pl-4">
                <div className="mono-data text-2xl font-bold text-white">{val}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">
                  {label}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Right: form */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <span className="text-2xl font-black text-[#1b1c15] tracking-tighter font-headline">
              HEMA_STRAT
            </span>
          </div>

          <div className="mb-8">
            <div className="text-[10px] font-mono text-[#006d30] uppercase tracking-[0.3em] mb-2">
              Administrative Access
            </div>
            <h2 className="font-headline text-3xl font-extrabold text-[#1b1c15] tracking-tight">
              Sign In
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#3f493f] mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[#f5f4e8] border border-[#becabc]/40 text-[#1b1c15] text-sm outline-none focus:border-[#006d30] focus:ring-2 focus:ring-[#79db8d]/30 transition-all rounded"
                placeholder="admin"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3f493f] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#f5f4e8] border border-[#becabc]/40 text-[#1b1c15] text-sm outline-none focus:border-[#006d30] focus:ring-2 focus:ring-[#79db8d]/30 transition-all rounded"
                placeholder="••••••••••"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[#ba1a1a] text-xs bg-[#ffdad6] px-3 py-2 rounded">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1b1c15] text-white py-3.5 text-sm font-bold rounded hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Access System'}
            </button>
          </form>

          <p className="text-center text-[10px] text-[#6f7a6e] mt-8 mono-data uppercase tracking-widest">
            HEMA_STRAT v4.2.0 · Restricted Access
          </p>
        </div>
      </div>
    </div>
  )
}
