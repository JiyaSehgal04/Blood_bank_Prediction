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
    <div className="min-h-screen bg-[#0a0e1a] grid grid-cols-1 lg:grid-cols-2">
      {/* Left: hero */}
      <div className="hidden lg:flex flex-col justify-between bg-[#080c18] p-16 border-r border-[#1e2d47]">
        <span className="text-2xl font-black text-[#e2e8f8] tracking-tighter font-headline">
          HEMA_STRAT
        </span>
        <div>
          <div className="flex items-center gap-2 mb-6">
            <span className="text-[#00d4ff] text-xs font-mono uppercase tracking-widest">
              SYSTEM_MODULE / ACCESS_CONTROL
            </span>
          </div>
          <h1 className="font-headline text-5xl font-extrabold text-[#e2e8f8] leading-tight tracking-tighter mb-6">
            <span className="text-[#00d4ff]">Blood Bank</span><br />Inventory &amp;<br />Distribution
          </h1>
          <p className="text-[#3d5275] text-base leading-relaxed max-w-sm">
            Engineered for clinical precision. Real-time logistics, rigorous
            cross-matching protocols, and automated inventory reconciliation.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[['76+', 'Records Tracked'], ['3', 'Components'], ['8', 'Blood Groups']].map(
            ([val, label]) => (
              <div key={label} className="border-l border-[#1e2d47] pl-4">
                <div className="mono-data text-2xl font-bold text-[#00d4ff]">{val}</div>
                <div className="text-[10px] text-[#3d5275] uppercase tracking-wider mt-1">
                  {label}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Right: form */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-16 bg-[#0a0e1a]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <span className="text-2xl font-black text-[#e2e8f8] tracking-tighter font-headline">
              HEMA_STRAT
            </span>
          </div>

          <div className="mb-8">
            <div className="text-[10px] font-mono text-[#00d4ff] uppercase tracking-[0.3em] mb-2">
              Administrative Access
            </div>
            <h2 className="font-headline text-3xl font-extrabold text-[#e2e8f8] tracking-tight">
              Sign In
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#6b8cba] mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[#080c18] border border-[#1e2d47] text-[#e2e8f8] text-sm outline-none focus:border-[#00d4ff] focus:ring-2 focus:ring-[#00d4ff]/20 transition-all rounded placeholder-[#3d5275]"
                placeholder="admin"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b8cba] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#080c18] border border-[#1e2d47] text-[#e2e8f8] text-sm outline-none focus:border-[#00d4ff] focus:ring-2 focus:ring-[#00d4ff]/20 transition-all rounded placeholder-[#3d5275]"
                placeholder="••••••••••"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[#ff4757] text-xs bg-[#ff4757]/10 border border-[#ff4757]/20 px-3 py-2 rounded">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00d4ff] text-[#0a0e1a] py-3.5 text-sm font-bold rounded hover:shadow-[0_0_20px_#00d4ff40] active:scale-[0.98] transition-all disabled:opacity-40"
            >
              {loading ? 'Authenticating...' : 'Access System'}
            </button>
          </form>

          <p className="text-center text-[10px] text-[#3d5275] mt-8 mono-data uppercase tracking-widest">
            HEMA_STRAT v4.2.0 · Restricted Access
          </p>
        </div>
      </div>
    </div>
  )
}
