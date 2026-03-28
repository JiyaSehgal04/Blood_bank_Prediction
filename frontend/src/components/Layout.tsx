import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { path: '/dashboard',   icon: 'dashboard',       label: 'Dashboard'   },
  { path: '/inventory',   icon: 'inventory_2',     label: 'Inventory'   },
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
    <div className="flex min-h-screen bg-[#0a0e1a]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#080c18] flex flex-col sticky top-0 h-screen border-r border-[#1e2d47]">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-[#1e2d47]">
          <span className="text-xl font-black text-[#e2e8f8] tracking-tighter font-headline">
            HEMA_STRAT
          </span>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
            <span className="text-[10px] font-mono text-[#00d4ff] uppercase tracking-widest">
              System Active
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(({ path, icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#00d4ff]/10 text-[#00d4ff] border-l-2 border-[#00d4ff]'
                    : 'text-[#3d5275] hover:text-[#e2e8f8] hover:bg-[#1e2d47]/40 border-l-2 border-transparent'
                }`
              }
            >
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1e2d47]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-[#3d5275] hover:text-[#e2e8f8] transition-colors w-full"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-[#080c18]/90 backdrop-blur-md border-b border-[#1e2d47] px-8 py-3 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-4">
            <NavLink to="/alerts">
              <button className="material-symbols-outlined text-[#3d5275] hover:text-[#00d4ff] transition-colors">
                notifications
              </button>
            </NavLink>
            <div className="w-8 h-8 rounded-full bg-[#1e2d47] border border-[#00d4ff]/30 flex items-center justify-center">
              <span className="text-[#00d4ff] text-xs font-bold font-mono">AD</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
