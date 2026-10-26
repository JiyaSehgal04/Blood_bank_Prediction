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

export default function Layout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen bg-[#f9f6fd]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#2e2157] flex flex-col sticky top-0 h-screen">
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-6 py-5 border-b border-white/10 text-left hover:bg-white/5 transition-colors"
          aria-label="Go to homepage"
        >
          <img src={logo} alt="SRM Global Hospitals" className="h-9 w-auto bg-white rounded-md p-1.5" />
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d9cfee] animate-pulse" />
            <span className="text-[10px] font-mono text-[#c9bde5] uppercase tracking-widest">
              Blood Bank · Online
            </span>
          </div>
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
                    ? 'bg-[#6B4A98] text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors w-full"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-[#f9f6fd]/90 backdrop-blur-md border-b border-[#d9d0ea]/30 px-8 py-3 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-4">
            <NavLink to="/alerts">
              <button className="material-symbols-outlined text-[#5b5470] hover:text-[#2e2157] transition-colors">
                notifications
              </button>
            </NavLink>
            <div className="w-8 h-8 rounded-full bg-[#2e2157] flex items-center justify-center">
              <span className="text-white text-xs font-bold font-mono">AD</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
