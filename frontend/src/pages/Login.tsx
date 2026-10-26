import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import logo from '../assets/srm-logo.png'

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
    else setError('Invalid username or password.')
  }

  return (
    <div className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#492880] via-[#6B4A98] to-[#294C98] text-white p-16 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-[380px] h-[380px] rounded-full bg-white/5" />
        <div className="absolute -left-20 bottom-[-100px] w-[300px] h-[300px] rounded-full bg-white/5" />
        <img src={logo} alt="SRM Global Hospitals" className="relative h-14 w-auto self-start bg-white rounded-lg p-2" />
        <div className="relative">
          <p className="text-[12px] uppercase tracking-[0.25em] text-white/70 mb-5">Blood Bank Management</p>
          <h1 className="font-headline text-5xl font-extrabold leading-tight tracking-tight mb-6">
            Caring for life,<br />every drop counts.
          </h1>
          <p className="text-white/80 text-base leading-relaxed max-w-sm">
            Real-time inventory, careful cross-matching and demand forecasting for the SRM Global Hospitals blood bank.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-6">
          {[['24×7', 'Monitoring'], ['3', 'Components'], ['8', 'Blood groups']].map(([val, label]) => (
            <div key={label} className="border-l border-white/30 pl-4">
              <div className="font-headline text-2xl font-extrabold">{val}</div>
              <div className="text-[11px] text-white/70 uppercase tracking-wider mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: form */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-16 bg-[#f9f6fd]">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-1 text-[13px] text-[#6B4A98] hover:underline mb-8">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to homepage
          </Link>

          <div className="bg-white border border-[#d9d0ea] rounded-xl p-8 shadow-sm">
            <img src={logo} alt="SRM Global Hospitals" className="lg:hidden h-10 w-auto mb-6" />
            <div className="mb-8">
              <div className="text-[11px] font-semibold text-[#6B4A98] uppercase tracking-[0.25em] mb-2">
                Administrative access
              </div>
              <h2 className="font-headline text-3xl font-extrabold text-[#2e2157] tracking-tight">Admin Login</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-xs font-semibold text-[#4a4466] mb-1.5 uppercase tracking-wider">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full px-4 py-3 bg-[#f9f6fd] border border-[#d9d0ea] text-[#2e2157] text-sm outline-none focus:border-[#6B4A98] focus:ring-2 focus:ring-[#c9bde5]/60 transition-all rounded-md"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-[#4a4466] mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-[#f9f6fd] border border-[#d9d0ea] text-[#2e2157] text-sm outline-none focus:border-[#6B4A98] focus:ring-2 focus:ring-[#c9bde5]/60 transition-all rounded-md"
                  required
                />
              </div>

              {error && (
                <div role="alert" className="flex items-center gap-2 text-[#ba1a1a] text-xs bg-[#ffdad6] px-3 py-2 rounded-md">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6B4A98] hover:bg-[#492880] text-white py-3.5 text-sm font-bold rounded-md active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="text-center text-[11px] text-[#6b6680] mt-8 uppercase tracking-widest">
              Restricted access · Authorised staff only
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
