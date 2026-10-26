import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import logo from '../assets/srm-logo.png'

const navItems = [
  { path: '/dashboard',   icon: 'dashboard',       label: 'Dashboard'   },
  { path: '/inventory',   icon: 'inventory_2',     label: 'Inventory'   },
  { path: '/manual-entry', icon: 'edit_note',       label: 'Manual Entry'},
  { path: '/allocate',    icon: 'hub',             label: 'Allocation'  },
  { path: '/donors',      icon: 'verified_user',   label: 'Donors'      },
  { path: '/predictions', icon: 'query_stats',     label: 'Predictions' },
  { path: '/alerts',      icon: 'notifications',   label: 'Alerts'      },
  { path: '/upload',      icon: 'upload_file',     label: 'Upload'      },
]

const DASHBOARD_CACHE_KEY = 'blood_bank_dashboard_stats_cache'

// The dashboard keeps its latest stats in sessionStorage; reuse that for the bell badge.
function readCriticalAlerts(): number {
  try {
    const cached = sessionStorage.getItem(DASHBOARD_CACHE_KEY)
    return cached ? JSON.parse(cached)?.alerts?.critical ?? 0 : 0
  } catch {
    return 0
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [critical, setCritical] = useState(readCriticalAlerts)

  useEffect(() => {
    const t = setInterval(() => setCritical(readCriticalAlerts()), 5000)
    return () => clearInterval(t)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen bg-[#ffffff]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0b1b36] flex flex-col sticky top-0 h-screen">
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="block w-full px-4 pt-4 pb-3 text-left hover:bg-white/5 transition-colors"
          aria-label="Go to homepage"
        >
          <img src={logo} alt="SRM Global Hospitals" className="w-full h-auto bg-white rounded-lg px-3 py-2.5" />
        </button>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(({ path, icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#2a4f94] text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors w-full"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-[#13294b] px-8 py-3 flex items-center justify-between">
          <div className="text-white font-semibold tracking-wide text-[15px]">
            Blood Bank Management
          </div>
          <div className="flex items-center gap-4">
            <NavLink
              to="/alerts"
              aria-label={critical > 0 ? `Alerts, ${critical} critical` : 'Alerts'}
              className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-white" style={{ fontSize: 26 }}>
                notifications
              </span>
              {critical > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-[#7a0909] border-2 border-[#13294b] text-white text-[11px] font-bold flex items-center justify-center">
                  {critical > 99 ? '99+' : critical}
                </span>
              )}
            </NavLink>
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
              <span className="text-[#13294b] text-xs font-bold font-mono">AD</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
