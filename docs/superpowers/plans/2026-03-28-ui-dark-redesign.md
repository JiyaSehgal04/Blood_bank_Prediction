# UI Dark Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the entire Blood Bank frontend to a Deep Space dark theme (near-black navy + electric cyan) while leaving all logic, routing, and API calls untouched.

**Architecture:** Pure visual change — replace inline Tailwind arbitrary color values across 10 frontend files. No new components, no logic changes, no backend changes. The dark palette tokens are `#0a0e1a` (bg), `#0f1629` (card), `#080c18` (sidebar/topbar), `#1e2d47` (border), `#00d4ff` (cyan accent), `#e2e8f8` (text).

**Tech Stack:** React, TypeScript, Tailwind CSS v4 (arbitrary values), Recharts, Material Symbols

---

## File Map

| File | Change |
|---|---|
| `frontend/src/index.css` | Update body background + CSS custom properties |
| `frontend/src/components/Layout.tsx` | Sidebar + top bar dark theme |
| `frontend/src/pages/Login.tsx` | Dark form panel + hero cyan accent |
| `frontend/src/pages/Dashboard.tsx` | KPI cards, bar chart colors, all palette |
| `frontend/src/pages/Inventory.tsx` | Table, filters, status badges |
| `frontend/src/pages/Allocate.tsx` | Form inputs, table, priority badges |
| `frontend/src/pages/Donors.tsx` | Form, search, eligibility badges |
| `frontend/src/pages/Predictions.tsx` | Area chart colors, component selector, tables |
| `frontend/src/pages/Alerts.tsx` | Severity config, count cards, alert rows |
| `frontend/src/pages/Upload.tsx` | Drop zone, result banner, system info |

---

### Task 1: Dark base — index.css

**Files:**
- Modify: `frontend/src/index.css`

No automated tests for CSS. Verify visually: `npm run dev`, open http://localhost:5173 — page background should be near-black (`#0a0e1a`).

- [ ] **Step 1: Replace index.css**

Replace the entire file content:

```css
@import "tailwindcss";

@theme {
  --color-surface: #0a0e1a;
  --color-surface-dim: #080c18;
  --color-surface-bright: #0f1629;
  --color-surface-container-lowest: #060912;
  --color-surface-container-low: #0d1424;
  --color-surface-container: #0f1629;
  --color-surface-container-high: #1a2744;
  --color-surface-container-highest: #1e2d47;
  --color-surface-variant: #1e2d47;
  --color-background: #0a0e1a;
  --color-on-background: #e2e8f8;
  --color-on-surface: #e2e8f8;
  --color-on-surface-variant: #6b8cba;
  --color-outline: #3d5275;
  --color-outline-variant: #1e2d47;
  --color-primary: #00d4ff;
  --color-on-primary: #0a0e1a;
  --color-secondary: #38bdf8;
  --color-on-secondary: #0a0e1a;
  --color-secondary-container: #0ea5e9;
  --color-on-secondary-container: #e2e8f8;
  --color-tertiary: #10d48e;
  --color-tertiary-container: #0a7a52;
  --color-on-tertiary-container: #a7f3d0;
  --color-error: #ff4757;
  --color-error-container: #3d0a0f;
  --color-on-error: #e2e8f8;
  --color-on-error-container: #ff4757;
  --color-inverse-surface: #e2e8f8;
  --color-inverse-on-surface: #0a0e1a;

  --font-headline: "Manrope", sans-serif;
  --font-body: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}

@layer base {
  body {
    font-family: "Inter", sans-serif;
    background-color: #0a0e1a;
    color: #e2e8f8;
    -webkit-font-smoothing: antialiased;
    margin: 0;
  }

  #root {
    width: 100%;
    min-height: 100vh;
  }
}

.font-headline { font-family: "Manrope", sans-serif; }
.mono-data { font-family: "JetBrains Mono", monospace; }

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  font-size: 20px;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(ui): dark base — navy background and CSS tokens"
```

---

### Task 2: Layout — sidebar and top bar

**Files:**
- Modify: `frontend/src/components/Layout.tsx`

Verify: sidebar is near-black (`#080c18`), active nav item has cyan left border + cyan text, top bar is dark with cyan glow on notification icon.

- [ ] **Step 1: Replace Layout.tsx**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Layout.tsx
git commit -m "feat(ui): dark sidebar and top bar with cyan accent"
```

---

### Task 3: Login page

**Files:**
- Modify: `frontend/src/pages/Login.tsx`

Verify: both panels are dark, form inputs have dark background, "Blood Bank" in hero has cyan color, button has dark bg.

- [ ] **Step 1: Replace Login.tsx**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Login.tsx
git commit -m "feat(ui): dark login page with cyan hero accents"
```

---

### Task 4: Dashboard page

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

Verify: all cards are dark navy, bar chart uses cyan spectrum colors, KPI accent card has cyan top border, module label is cyan.

- [ ] **Step 1: Replace Dashboard.tsx**

```tsx
import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface Stats {
  inventory: {
    total: number
    by_group: Record<string, number>
    by_component: Record<string, number>
    expiring_soon: number
  }
  donors: { total: number; eligible: number }
  allocations: { total_today: number; total_all_time: number }
  wastage: { total_expired: number; today: number }
  alerts: { active: number; critical: number }
  uploads: { total_batches: number; total_records: number }
}

const BLOOD_COLORS: Record<string, string> = {
  'O Pos': '#00d4ff', 'A Pos': '#38bdf8', 'B Pos': '#0ea5e9',
  'AB Pos': '#7dd3fc', 'O Neg': '#1e2d47', 'A Neg': '#2d4a6e',
  'B Neg': '#3d5a7e', 'AB Neg': '#4d6a8e',
}

function KpiCard({ icon, label, value, sub, accent = false }: {
  icon: string; label: string; value: string | number; sub?: string; accent?: boolean
}) {
  return (
    <div className={`p-6 border rounded ${
      accent
        ? 'bg-[#0d1932] border-[#00d4ff]/30 border-t-2 border-t-[#00d4ff]'
        : 'bg-[#0f1629] border-[#1e2d47] hover:border-[#00d4ff]/20 transition-colors'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-[10px] font-medium uppercase tracking-[0.2em] ${accent ? 'text-[#00d4ff]' : 'text-[#6b8cba]'}`}>
          {label}
        </span>
        <span className={`material-symbols-outlined ${accent ? 'text-[#00d4ff]' : 'text-[#38bdf8]'}`}>
          {icon}
        </span>
      </div>
      <div className={`mono-data text-3xl font-bold ${accent ? 'text-[#00d4ff]' : 'text-[#e2e8f8]'}`}>
        {value}
      </div>
      {sub && <div className={`text-xs mt-1 ${accent ? 'text-[#3d5275]' : 'text-[#3d5275]'}`}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStats = () => {
    api.get('/dashboard/stats')
      .then((r) => {
        setStats(r.data)
        setLastUpdated(new Date().toLocaleTimeString())
      })
      .catch((e) => setError(e?.response?.data?.error ?? 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchStats()
    intervalRef.current = setInterval(fetchStats, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="mono-data text-[#00d4ff] text-sm animate-pulse">Loading system data...</div>
    </div>
  )

  if (error) return (
    <div className="bg-[#ff4757]/10 border border-[#ff4757]/20 rounded p-6 text-[#ff4757]">
      <span className="material-symbols-outlined mr-2">error</span>
      {error} — make sure the Flask API is running on port 5001.
    </div>
  )

  const groupData = stats
    ? Object.entries(stats.inventory.by_group).map(([k, v]) => ({ name: k, units: v }))
    : []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="text-[10px] font-mono text-[#00d4ff] uppercase tracking-[0.3em] mb-1">
          System Overview
        </div>
        <h1 className="font-headline text-3xl font-extrabold text-[#e2e8f8] tracking-tight">
          Dashboard
        </h1>
        {lastUpdated && (
          <div className="text-[10px] font-mono text-[#3d5275] mt-1">
            Last updated {lastUpdated}
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon="inventory_2" label="Available Units"
          value={stats?.inventory.total ?? 0}
          sub={`${stats?.inventory.expiring_soon ?? 0} expiring in 7d`}
          accent />
        <KpiCard icon="verified_user" label="Donors"
          value={stats?.donors.total ?? 0}
          sub={`${stats?.donors.eligible ?? 0} eligible`} />
        <KpiCard icon="hub" label="Allocations Today"
          value={stats?.allocations.total_today ?? 0}
          sub={`${stats?.allocations.total_all_time ?? 0} all-time`} />
        <KpiCard icon="delete_sweep" label="Expired Units"
          value={stats?.wastage.total_expired ?? 0}
          sub="logged wastage" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-[#0f1629] border border-[#1e2d47] rounded p-6">
          <div className="mb-6">
            <div className="text-[10px] font-mono text-[#00d4ff] uppercase tracking-[0.2em] mb-1">
              Inventory
            </div>
            <h3 className="font-headline text-lg font-bold text-[#e2e8f8]">
              Available Units by Blood Group
            </h3>
          </div>
          {groupData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={groupData} barSize={28}>
                <XAxis dataKey="name"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#3d5275' }}
                  axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#3d5275' }}
                  axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#080c18', border: '1px solid #1e2d47', borderRadius: 4,
                    fontSize: 12, fontFamily: 'JetBrains Mono', color: '#e2e8f8',
                  }}
                />
                <Bar dataKey="units" radius={[2, 2, 0, 0]}>
                  {groupData.map((entry) => (
                    <Cell key={entry.name} fill={BLOOD_COLORS[entry.name] ?? '#00d4ff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-[#3d5275] text-sm">
              No inventory data — run initial load or upload a file
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Alerts card */}
          <div className={`p-6 border rounded ${
            (stats?.alerts.critical ?? 0) > 0
              ? 'bg-[#ff4757]/10 border-[#ff4757]/20'
              : 'bg-[#0f1629] border-[#1e2d47]'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`material-symbols-outlined ${(stats?.alerts.critical ?? 0) > 0 ? 'text-[#ff4757]' : 'text-[#10d48e]'}`}>
                {(stats?.alerts.critical ?? 0) > 0 ? 'warning' : 'check_circle'}
              </span>
              <h3 className="font-headline font-bold text-[#e2e8f8]">Active Alerts</h3>
            </div>
            <div className="mono-data text-4xl font-bold text-[#e2e8f8] mb-1">
              {stats?.alerts.active ?? 0}
            </div>
            <div className="text-xs text-[#6b8cba]">
              {stats?.alerts.critical ?? 0} critical
            </div>
          </div>

          {/* Components breakdown */}
          <div className="bg-[#0f1629] border border-[#1e2d47] rounded p-6">
            <h3 className="font-headline font-bold text-[#e2e8f8] mb-4">By Component</h3>
            {stats && Object.keys(stats.inventory.by_component).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.inventory.by_component).map(([comp, count]) => (
                  <div key={comp}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-[#6b8cba]">{comp}</span>
                      <span className="mono-data text-sm font-bold text-[#e2e8f8]">{count}</span>
                    </div>
                    <div className="h-1.5 bg-[#1e2d47] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00d4ff] rounded-full"
                        style={{ width: `${Math.min(100, (count / (stats.inventory.total || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#3d5275]">No data</div>
            )}
          </div>

          {/* Data ingestion */}
          <div className="bg-[#0f1629] border border-[#1e2d47] rounded p-6">
            <h3 className="font-headline font-bold text-[#e2e8f8] mb-3">Data Ingestion</h3>
            <div className="space-y-2">
              {[
                ['Upload Batches', stats?.uploads.total_batches ?? 0],
                ['Records Loaded', stats?.uploads.total_records ?? 0],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between items-center text-xs">
                  <span className="text-[#6b8cba]">{label}</span>
                  <span className="mono-data font-bold text-[#e2e8f8]">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat(ui): dark dashboard — KPI cards and cyan bar chart"
```

---

### Task 5: Inventory page

**Files:**
- Modify: `frontend/src/pages/Inventory.tsx`

Verify: table header is `#080c18`, alternating rows are `#0f1629`/`#0d1424`, status badges use new dark palette, filter selects are dark.

- [ ] **Step 1: Replace Inventory.tsx**

```tsx
import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'

interface Unit {
  unit_id: string
  blood_group: string
  component: string
  status: string
  expiry_date: string
  collection_date: string
  quantity_ml: number
  notes?: string
}

const GROUPS = ['', 'O Pos', 'A Pos', 'B Pos', 'AB Pos', 'O Neg', 'A Neg', 'B Neg', 'AB Neg']
const COMPONENTS = ['', 'WB/PRC', 'FFP', 'PLT']

export default function Inventory() {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [bloodGroup, setBloodGroup] = useState('')
  const [component, setComponent] = useState('')
  const [status, setStatus] = useState('available')
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (bloodGroup) params.set('blood_group', bloodGroup)
    if (component) params.set('component', component)
    if (status) params.set('status', status)
    api.get(`/inventory?${params}`)
      .then((r) => {
        setUnits(r.data.units ?? [])
        setLastUpdated(new Date().toLocaleTimeString())
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [bloodGroup, component, status])

  useEffect(() => {
    intervalRef.current = setInterval(load, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [bloodGroup, component, status])

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      available: 'bg-[#10d48e]/15 text-[#10d48e] border border-[#10d48e]/30',
      issued:    'bg-[#1e2d47] text-[#6b8cba] border border-[#1e2d47]',
      expired:   'bg-[#ff4757]/15 text-[#ff4757] border border-[#ff4757]/30',
    }
    return map[s] ?? 'bg-[#1e2d47] text-[#6b8cba] border border-[#1e2d47]'
  }

  const expiryWarning = (expiry: string) => {
    const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
    if (days < 0) return 'text-[#ff4757]'
    if (days <= 3) return 'text-[#ff4757] font-bold'
    if (days <= 7) return 'text-[#f59e0b] font-medium'
    return 'text-[#6b8cba]'
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] font-mono text-[#00d4ff] uppercase tracking-[0.3em] mb-1">
          MODULE_01
        </div>
        <h1 className="font-headline text-3xl font-extrabold text-[#e2e8f8] tracking-tight">
          Blood Inventory
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Blood Group', value: bloodGroup, set: setBloodGroup, opts: GROUPS },
          { label: 'Component', value: component, set: setComponent, opts: COMPONENTS },
        ].map(({ label, value, set, opts }) => (
          <div key={label}>
            <label className="block text-[10px] font-mono text-[#3d5275] uppercase tracking-wider mb-1">
              {label}
            </label>
            <select
              value={value}
              onChange={(e) => set(e.target.value)}
              className="bg-[#080c18] border border-[#1e2d47] text-[#e2e8f8] text-sm px-3 py-2 rounded outline-none focus:border-[#00d4ff] transition-colors"
            >
              {opts.map((o) => <option key={o} value={o}>{o || `All ${label}s`}</option>)}
            </select>
          </div>
        ))}
        <div>
          <label className="block text-[10px] font-mono text-[#3d5275] uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#080c18] border border-[#1e2d47] text-[#e2e8f8] text-sm px-3 py-2 rounded outline-none focus:border-[#00d4ff] transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="issued">Issued</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Count */}
      <div className="text-xs mono-data text-[#3d5275]">
        {loading ? 'Loading...' : `${units.length} units`}
        {lastUpdated && <span className="ml-3">· Last updated {lastUpdated}</span>}
      </div>

      {/* Table */}
      <div className="bg-[#0f1629] border border-[#1e2d47] rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#080c18] border-b border-[#1e2d47]">
              {['Unit ID', 'Blood Group', 'Component', 'Status', 'Expiry Date', 'Qty (mL)'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-[#3d5275]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units.map((u, i) => (
              <tr key={u.unit_id} className={`border-b border-[#1e2d47]/40 hover:bg-[#1e2d47]/40 transition-colors ${i % 2 === 0 ? 'bg-[#0f1629]' : 'bg-[#0d1424]'}`}>
                <td className="px-4 py-3 mono-data text-xs text-[#3d5275]">{u.unit_id}</td>
                <td className="px-4 py-3 font-medium text-[#e2e8f8]">{u.blood_group}</td>
                <td className="px-4 py-3 mono-data text-xs text-[#6b8cba]">{u.component}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge(u.status)}`}>
                    {u.status}
                  </span>
                </td>
                <td className={`px-4 py-3 mono-data text-xs ${expiryWarning(u.expiry_date)}`}>
                  {u.expiry_date}
                </td>
                <td className="px-4 py-3 mono-data text-xs text-[#6b8cba]">{u.quantity_ml}</td>
              </tr>
            ))}
            {!loading && units.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[#3d5275] text-sm">
                  No units found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Inventory.tsx
git commit -m "feat(ui): dark inventory table with cyan filter controls"
```

---

### Task 6: Allocate page

**Files:**
- Modify: `frontend/src/pages/Allocate.tsx`

Verify: form inputs dark, table dark, priority badges use new glow style, submit button is cyan.

- [ ] **Step 1: Replace Allocate.tsx**

```tsx
import { useEffect, useState } from 'react'
import api from '../lib/api'

interface Allocation {
  id: string
  blood_group: string
  component: string
  units_requested: number
  units_allocated: number
  patient_name: string
  priority: string
  status: string
  created_at: string
}

const GROUPS = ['O Pos', 'A Pos', 'B Pos', 'AB Pos', 'O Neg', 'A Neg', 'B Neg', 'AB Neg']
const COMPONENTS = ['WB/PRC', 'FFP', 'PLT']

export default function Allocate() {
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    blood_group: 'O Pos', component: 'WB/PRC',
    units_requested: 1, patient_name: '', hospital: '',
    priority: 'routine', notes: ''
  })
  const [result, setResult] = useState<{ status: string; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadAllocations = () => {
    api.get('/allocations').then((r) => setAllocations(r.data.allocations ?? []))
      .catch(console.error).finally(() => setLoading(false))
  }

  useEffect(loadAllocations, [])

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)
    try {
      const r = await api.post('/allocate', form)
      setResult({ status: r.data.status, message: r.data.message ?? 'Allocation processed' })
      loadAllocations()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      setResult({ status: 'error', message: error?.response?.data?.error ?? 'Allocation failed' })
    } finally {
      setSubmitting(false)
    }
  }

  const priorityBadge = (p: string) => ({
    emergency: 'bg-[#ff4757]/15 text-[#ff4757] border border-[#ff4757]/30',
    urgent:    'bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30',
    routine:   'bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20',
  }[p] ?? 'bg-[#1e2d47] text-[#6b8cba] border border-[#1e2d47]')

  const inputCls = "w-full px-3 py-2 bg-[#080c18] border border-[#1e2d47] text-sm text-[#e2e8f8] rounded outline-none focus:border-[#00d4ff] focus:ring-2 focus:ring-[#00d4ff]/10 transition-colors placeholder-[#3d5275]"
  const labelCls = "block text-[10px] font-mono text-[#3d5275] uppercase tracking-wider mb-1"

  return (
    <div className="space-y-8">
      <div>
        <div className="text-[10px] font-mono text-[#00d4ff] uppercase tracking-[0.3em] mb-1">
          MODULE_02
        </div>
        <h1 className="font-headline text-3xl font-extrabold text-[#e2e8f8] tracking-tight">
          Blood Allocation
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Allocation Form */}
        <div className="lg:col-span-2 bg-[#0f1629] border border-[#1e2d47] rounded p-6">
          <h3 className="font-headline text-lg font-bold text-[#e2e8f8] mb-5">New Request</h3>
          <form onSubmit={handleAllocate} className="space-y-4">
            {[
              { label: 'Patient Name', key: 'patient_name', type: 'text', placeholder: 'Full name' },
              { label: 'Hospital / Ward', key: 'hospital', type: 'text', placeholder: 'Hospital name' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <input
                  type={type}
                  value={(form as Record<string, string | number>)[key] as string}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  required
                  className={inputCls}
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Blood Group</label>
                <select
                  value={form.blood_group}
                  onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                  className={inputCls}
                >
                  {GROUPS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Component</label>
                <select
                  value={form.component}
                  onChange={(e) => setForm({ ...form, component: e.target.value })}
                  className={inputCls}
                >
                  {COMPONENTS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Units</label>
                <input
                  type="number" min={1} max={20}
                  value={form.units_requested}
                  onChange={(e) => setForm({ ...form, units_requested: +e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className={inputCls}
                >
                  <option value="emergency">Emergency</option>
                  <option value="urgent">Urgent</option>
                  <option value="routine">Routine</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className={`${inputCls} resize-none`}
              />
            </div>

            {result && (
              <div className={`px-3 py-2 rounded text-xs flex items-center gap-2 ${
                result.status === 'allocated'
                  ? 'bg-[#10d48e]/10 border border-[#10d48e]/30 text-[#10d48e]'
                  : 'bg-[#ff4757]/10 border border-[#ff4757]/20 text-[#ff4757]'
              }`}>
                <span className="material-symbols-outlined text-[16px]">
                  {result.status === 'allocated' ? 'check_circle' : 'error'}
                </span>
                {result.message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#00d4ff] text-[#0a0e1a] py-3 text-sm font-bold rounded hover:shadow-[0_0_16px_#00d4ff40] transition-all disabled:opacity-30"
            >
              {submitting ? 'Processing...' : 'Process Request'}
            </button>
          </form>
        </div>

        {/* Recent allocations */}
        <div className="lg:col-span-3 bg-[#0f1629] border border-[#1e2d47] rounded overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1e2d47]">
            <h3 className="font-headline font-bold text-[#e2e8f8]">Recent Allocations</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#080c18]">
                {['Patient', 'Group', 'Component', 'Units', 'Priority', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-[#3d5275]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#3d5275] text-sm">Loading...</td></tr>
              ) : allocations.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#3d5275] text-sm">No allocations yet</td></tr>
              ) : (
                allocations.slice(0, 20).map((a, i) => (
                  <tr key={a.id ?? i} className={`border-b border-[#1e2d47]/40 hover:bg-[#1e2d47]/40 transition-colors ${i % 2 === 0 ? 'bg-[#0f1629]' : 'bg-[#0d1424]'}`}>
                    <td className="px-4 py-2 text-[#e2e8f8] font-medium">{a.patient_name || '—'}</td>
                    <td className="px-4 py-2 mono-data text-xs text-[#e2e8f8]">{a.blood_group}</td>
                    <td className="px-4 py-2 mono-data text-xs text-[#6b8cba]">{a.component}</td>
                    <td className="px-4 py-2 mono-data text-xs text-[#e2e8f8]">{a.units_allocated}/{a.units_requested}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${priorityBadge(a.priority)}`}>
                        {a.priority}
                      </span>
                    </td>
                    <td className="px-4 py-2 mono-data text-xs text-[#3d5275]">
                      {a.created_at?.slice(0, 10)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Allocate.tsx
git commit -m "feat(ui): dark allocation form and table with glow badges"
```

---

### Task 7: Donors page

**Files:**
- Modify: `frontend/src/pages/Donors.tsx`

Verify: search input is dark, Add Donor form panel is dark navy, eligible badge is cyan-glow green, ineligible is red-glow.

- [ ] **Step 1: Replace Donors.tsx**

```tsx
import { useEffect, useState } from 'react'
import api from '../lib/api'

interface Donor {
  id: number
  name: string
  blood_group: string
  email?: string
  phone?: string
  is_eligible: boolean
  last_donation_date?: string
  total_donations: number
}

export default function Donors() {
  const [donors, setDonors] = useState<Donor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', blood_group: 'O Pos', email: '', phone: '', date_of_birth: '', gender: 'M'
  })
  const [saving, setSaving] = useState(false)

  const GROUPS = ['O Pos', 'A Pos', 'B Pos', 'AB Pos', 'O Neg', 'A Neg', 'B Neg', 'AB Neg']

  const load = () => {
    setLoading(true)
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    api.get(`/donors${params}`).then((r) => setDonors(r.data.donors ?? []))
      .catch(console.error).finally(() => setLoading(false))
  }

  useEffect(load, [search])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/donors', form)
      setShowForm(false)
      setForm({ name: '', blood_group: 'O Pos', email: '', phone: '', date_of_birth: '', gender: 'M' })
      load()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full px-3 py-2 bg-[#080c18] border border-[#1e2d47] text-sm text-[#e2e8f8] rounded outline-none focus:border-[#00d4ff] focus:ring-2 focus:ring-[#00d4ff]/10 transition-colors"
  const labelCls = "block text-[10px] font-mono text-[#3d5275] uppercase tracking-wider mb-1"

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-mono text-[#00d4ff] uppercase tracking-[0.3em] mb-1">
            MODULE_03
          </div>
          <h1 className="font-headline text-3xl font-extrabold text-[#e2e8f8] tracking-tight">
            Donor Portal
          </h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#00d4ff] text-[#0a0e1a] px-4 py-2 text-sm font-bold rounded hover:shadow-[0_0_16px_#00d4ff40] transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">person_add</span>
          Add Donor
        </button>
      </div>

      {/* Add donor form */}
      {showForm && (
        <div className="bg-[#0f1629] border border-[#1e2d47] rounded p-6">
          <h3 className="font-headline font-bold text-[#e2e8f8] mb-4">Register New Donor</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Full Name', key: 'name', type: 'text', req: true },
              { label: 'Email', key: 'email', type: 'email', req: false },
              { label: 'Phone', key: 'phone', type: 'tel', req: false },
              { label: 'Date of Birth', key: 'date_of_birth', type: 'date', req: false },
            ].map(({ label, key, type, req }) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <input
                  type={type}
                  required={req}
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className={inputCls}
                />
              </div>
            ))}
            <div>
              <label className={labelCls}>Blood Group</label>
              <select
                value={form.blood_group}
                onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                className={inputCls}
              >
                {GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className={inputCls}
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="bg-[#00d4ff] text-[#0a0e1a] px-6 py-2 text-sm font-bold rounded hover:shadow-[0_0_16px_#00d4ff40] transition-all disabled:opacity-40">
                {saving ? 'Saving...' : 'Register Donor'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="border border-[#1e2d47] text-[#6b8cba] px-6 py-2 text-sm font-medium rounded hover:border-[#00d4ff] hover:text-[#00d4ff] transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3d5275] text-[18px]">search</span>
        <input
          type="search"
          placeholder="Search donors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-[#080c18] border border-[#1e2d47] text-sm text-[#e2e8f8] rounded outline-none focus:border-[#00d4ff] transition-colors placeholder-[#3d5275]"
        />
      </div>

      {/* Table */}
      <div className="bg-[#0f1629] border border-[#1e2d47] rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#080c18] border-b border-[#1e2d47]">
              {['Name', 'Blood Group', 'Phone', 'Donations', 'Last Donation', 'Eligible'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-[#3d5275]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-[#3d5275] mono-data animate-pulse">Loading...</td></tr>
            ) : donors.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-[#3d5275]">No donors found</td></tr>
            ) : (
              donors.map((d, i) => (
                <tr key={d.id} className={`border-b border-[#1e2d47]/40 hover:bg-[#1e2d47]/40 transition-colors ${i % 2 === 0 ? 'bg-[#0f1629]' : 'bg-[#0d1424]'}`}>
                  <td className="px-4 py-3 font-medium text-[#e2e8f8]">{d.name}</td>
                  <td className="px-4 py-3 mono-data text-xs text-[#e2e8f8]">{d.blood_group}</td>
                  <td className="px-4 py-3 text-xs text-[#6b8cba]">{d.phone || '—'}</td>
                  <td className="px-4 py-3 mono-data text-xs text-center text-[#e2e8f8]">{d.total_donations}</td>
                  <td className="px-4 py-3 mono-data text-xs text-[#3d5275]">{d.last_donation_date || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      d.is_eligible
                        ? 'bg-[#10d48e]/15 text-[#10d48e] border border-[#10d48e]/30'
                        : 'bg-[#ff4757]/15 text-[#ff4757] border border-[#ff4757]/30'
                    }`}>
                      {d.is_eligible ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Donors.tsx
git commit -m "feat(ui): dark donor portal with cyan CTA button"
```

---

### Task 8: Predictions page

**Files:**
- Modify: `frontend/src/pages/Predictions.tsx`

Verify: area chart uses cyan fills, component selector active state is cyan, replenishment table rows are dark.

- [ ] **Step 1: Replace Predictions.tsx**

```tsx
import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, Legend,
} from 'recharts'

interface Prediction {
  blood_group: string
  component: string
  predicted_demand: number
  confidence_low: number
  confidence_high: number
  model_used: string
  prediction_date: string
}

interface ReplenishItem {
  blood_group: string
  component: string
  current_stock: number
  est_demand_7d: number
  expiring_in_7d: number
  recommended_order: number
  urgency: string
  model_used: string
}

export default function Predictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [replenishment, setReplenishment] = useState<ReplenishItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [activeComponent, setActiveComponent] = useState('WB/PRC')

  const fetchPredictions = () => {
    Promise.all([
      api.get('/predictions'),
      api.get('/replenishment'),
    ]).then(([p, r]) => {
      setPredictions(p.data.predictions ?? [])
      setReplenishment(r.data.replenishment ?? [])
      setLastUpdated(new Date().toLocaleTimeString())
    }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPredictions()
    intervalRef.current = setInterval(fetchPredictions, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const filteredPreds = predictions.filter((p) => p.component === activeComponent)

  const chartData = filteredPreds.map((p) => ({
    name: p.blood_group,
    demand: p.predicted_demand,
    low: p.confidence_low,
    high: p.confidence_high,
  }))

  const urgencyBadge = (u: string) => ({
    HIGH:   'bg-[#ff4757]/15 text-[#ff4757] border border-[#ff4757]/30',
    MEDIUM: 'bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30',
    LOW:    'bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20',
  }[u] ?? 'bg-[#1e2d47] text-[#6b8cba] border border-[#1e2d47]')

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-mono text-[#00d4ff] uppercase tracking-[0.3em] mb-1">
            MODULE_04
          </div>
          <h1 className="font-headline text-3xl font-extrabold text-[#e2e8f8] tracking-tight">
            Demand Predictions
          </h1>
        </div>
        {lastUpdated && (
          <div className="text-[10px] font-mono text-[#3d5275]">
            Last updated {lastUpdated}
            {predictions.length > 0 && predictions[0]?.prediction_date && (
              <span className="ml-2">· predictions as of {predictions[0].prediction_date}</span>
            )}
          </div>
        )}
      </div>

      {/* Model status */}
      <div className="grid grid-cols-3 gap-4">
        {['WB/PRC', 'FFP', 'PLT'].map((comp) => {
          const preds = predictions.filter((p) => p.component === comp)
          const models = preds.length > 0 ? [...new Set(preds.map((p) => p.model_used))] : []
          return (
            <div key={comp} className="bg-[#0f1629] border border-[#1e2d47] rounded p-4 hover:border-[#00d4ff]/20 transition-colors">
              <div className="text-[10px] font-mono text-[#3d5275] uppercase tracking-wider mb-2">{comp}</div>
              <div className="mono-data text-2xl font-bold text-[#e2e8f8] mb-1">{preds.length}</div>
              <div className="text-xs text-[#3d5275]">predictions</div>
              {models.length > 0 && (
                <div className="mt-2 text-[10px] font-mono text-[#00d4ff]">
                  via {models.join(', ')}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Component selector */}
      <div className="flex gap-2">
        {['WB/PRC', 'FFP', 'PLT'].map((c) => (
          <button
            key={c}
            onClick={() => setActiveComponent(c)}
            className={`px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded transition-all ${
              activeComponent === c
                ? 'bg-[#00d4ff] text-[#0a0e1a] shadow-[0_0_12px_#00d4ff40]'
                : 'border border-[#1e2d47] text-[#6b8cba] hover:border-[#00d4ff] hover:text-[#00d4ff]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-[#00d4ff] text-sm mono-data animate-pulse">
          Loading predictions...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Forecast Chart */}
          <div className="bg-[#0f1629] border border-[#1e2d47] rounded p-6">
            <h3 className="font-headline font-bold text-[#e2e8f8] mb-4">
              Predicted Demand — {activeComponent}
            </h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4730" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#3d5275' }} />
                  <YAxis tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#3d5275' }} />
                  <Tooltip contentStyle={{ background: '#080c18', border: '1px solid #1e2d47', borderRadius: 4, fontSize: 11, fontFamily: 'JetBrains Mono', color: '#e2e8f8' }} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#6b8cba' }} />
                  <Area type="monotone" dataKey="high" stroke="#38bdf8" fill="#38bdf820" name="Conf. High" />
                  <Area type="monotone" dataKey="demand" stroke="#00d4ff" fill="#00d4ff20" strokeWidth={2} name="Demand" />
                  <Area type="monotone" dataKey="low" stroke="#0ea5e9" fill="#0ea5e920" name="Conf. Low" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-[#3d5275] text-sm">
                No predictions yet — upload data to generate
              </div>
            )}
          </div>

          {/* Predictions table */}
          <div className="bg-[#0f1629] border border-[#1e2d47] rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e2d47]">
              <h3 className="font-headline font-bold text-[#e2e8f8]">Forecast Details</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#080c18]">
                  {['Group', 'Predicted', 'Low', 'High', 'Model'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-[#3d5275]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPreds.map((p, i) => (
                  <tr key={p.blood_group} className={`border-b border-[#1e2d47]/40 hover:bg-[#1e2d47]/40 transition-colors ${i % 2 === 0 ? 'bg-[#0f1629]' : 'bg-[#0d1424]'}`}>
                    <td className="px-3 py-2 font-medium text-[#e2e8f8] text-xs">{p.blood_group}</td>
                    <td className="px-3 py-2 mono-data text-xs font-bold text-[#00d4ff]">{p.predicted_demand}</td>
                    <td className="px-3 py-2 mono-data text-xs text-[#6b8cba]">{p.confidence_low}</td>
                    <td className="px-3 py-2 mono-data text-xs text-[#6b8cba]">{p.confidence_high}</td>
                    <td className="px-3 py-2 text-[10px] font-mono text-[#3d5275]">{p.model_used}</td>
                  </tr>
                ))}
                {filteredPreds.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[#3d5275] text-sm">No data for {activeComponent}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Replenishment plan */}
      {replenishment.length > 0 && (
        <div className="bg-[#0f1629] border border-[#1e2d47] rounded overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1e2d47] flex items-center justify-between">
            <h3 className="font-headline font-bold text-[#e2e8f8]">Replenishment Recommendations</h3>
            <span className="mono-data text-xs text-[#3d5275]">{replenishment.length} items</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#080c18]">
                {['Group', 'Component', 'Current Stock', 'Est. 7d Demand', 'Expiring 7d', 'Order Qty', 'Urgency'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-[#3d5275]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {replenishment.map((r, i) => (
                <tr key={`${r.blood_group}-${r.component}`} className={`border-b border-[#1e2d47]/40 hover:bg-[#1e2d47]/40 transition-colors ${i % 2 === 0 ? 'bg-[#0f1629]' : 'bg-[#0d1424]'}`}>
                  <td className="px-4 py-2 font-medium text-[#e2e8f8] text-xs">{r.blood_group}</td>
                  <td className="px-4 py-2 mono-data text-xs text-[#6b8cba]">{r.component}</td>
                  <td className="px-4 py-2 mono-data text-xs text-[#e2e8f8]">{r.current_stock}</td>
                  <td className="px-4 py-2 mono-data text-xs text-[#e2e8f8]">{r.est_demand_7d}</td>
                  <td className="px-4 py-2 mono-data text-xs text-[#ff4757]">{r.expiring_in_7d}</td>
                  <td className="px-4 py-2 mono-data text-xs font-bold text-[#00d4ff]">{r.recommended_order}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${urgencyBadge(r.urgency)}`}>
                      {r.urgency}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Predictions.tsx
git commit -m "feat(ui): dark predictions page with cyan area chart"
```

---

### Task 9: Alerts page

**Files:**
- Modify: `frontend/src/pages/Alerts.tsx`

Verify: critical/high count cards use dark red/amber glow, alert rows use dark severity backgrounds, "All clear" empty state uses cyan/teal, Run Scan button is cyan.

- [ ] **Step 1: Replace Alerts.tsx**

```tsx
import { useEffect, useState } from 'react'
import api from '../lib/api'

interface Alert {
  id: number
  alert_type: string
  blood_group: string
  component: string
  severity: string
  message: string
  is_resolved: boolean
  created_at: string
}

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  CRITICAL: { bg: 'bg-[#ff4757]/10', border: 'border-[#ff4757]/30', text: 'text-[#ff4757]', icon: 'emergency' },
  HIGH:     { bg: 'bg-[#ff4757]/7',  border: 'border-[#ff4757]/20', text: 'text-[#ff4757]', icon: 'warning' },
  MEDIUM:   { bg: 'bg-[#f59e0b]/10', border: 'border-[#f59e0b]/20', text: 'text-[#f59e0b]', icon: 'info' },
  LOW:      { bg: 'bg-[#1e2d47]',    border: 'border-[#1e2d47]',    text: 'text-[#6b8cba]', icon: 'check_circle' },
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [filter, setFilter] = useState<'active' | 'all'>('active')

  const load = () => {
    setLoading(true)
    api.get('/alerts').then((r) => setAlerts(r.data.alerts ?? []))
      .catch(console.error).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleScan = async () => {
    setScanning(true)
    try {
      await api.post('/alerts/scan')
      load()
    } catch (err) {
      console.error(err)
    } finally {
      setScanning(false)
    }
  }

  const handleResolve = async (id: number) => {
    try {
      await api.put(`/alerts/${id}/resolve`)
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_resolved: true } : a))
    } catch (err) {
      console.error(err)
    }
  }

  const displayed = filter === 'active' ? alerts.filter((a) => !a.is_resolved) : alerts

  const counts = {
    critical: alerts.filter((a) => !a.is_resolved && a.severity === 'CRITICAL').length,
    high:     alerts.filter((a) => !a.is_resolved && a.severity === 'HIGH').length,
    active:   alerts.filter((a) => !a.is_resolved).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-mono text-[#00d4ff] uppercase tracking-[0.3em] mb-1">
            System Monitoring
          </div>
          <h1 className="font-headline text-3xl font-extrabold text-[#e2e8f8] tracking-tight">
            Alerts
          </h1>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-2 bg-[#00d4ff] text-[#0a0e1a] px-4 py-2 text-sm font-bold rounded hover:shadow-[0_0_16px_#00d4ff40] transition-all disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[16px]">search</span>
          {scanning ? 'Scanning...' : 'Run Scan'}
        </button>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#ff4757]/10 border border-[#ff4757]/20 rounded p-4">
          <div className="text-[10px] font-mono text-[#ff4757] uppercase tracking-wider mb-1">Critical</div>
          <div className="mono-data text-3xl font-bold text-[#ff4757]">{counts.critical}</div>
        </div>
        <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded p-4">
          <div className="text-[10px] font-mono text-[#f59e0b] uppercase tracking-wider mb-1">High</div>
          <div className="mono-data text-3xl font-bold text-[#f59e0b]">{counts.high}</div>
        </div>
        <div className="bg-[#0f1629] border border-[#1e2d47] rounded p-4">
          <div className="text-[10px] font-mono text-[#3d5275] uppercase tracking-wider mb-1">Total Active</div>
          <div className="mono-data text-3xl font-bold text-[#e2e8f8]">{counts.active}</div>
        </div>
      </div>

      {/* Filter toggle */}
      <div className="flex gap-2">
        {(['active', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded transition-all ${
              filter === f
                ? 'bg-[#00d4ff] text-[#0a0e1a] shadow-[0_0_12px_#00d4ff40]'
                : 'border border-[#1e2d47] text-[#6b8cba] hover:border-[#00d4ff] hover:text-[#00d4ff]'
            }`}
          >
            {f === 'active' ? 'Active Only' : 'All Alerts'}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="h-32 flex items-center justify-center text-[#00d4ff] text-sm mono-data animate-pulse">Loading...</div>
      ) : displayed.length === 0 ? (
        <div className="bg-[#10d48e]/10 border border-[#10d48e]/20 rounded p-8 text-center">
          <span className="material-symbols-outlined text-[#10d48e] text-3xl mb-2 block">check_circle</span>
          <div className="text-[#10d48e] font-medium">All clear — no {filter === 'active' ? 'active' : ''} alerts</div>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.LOW
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-4 p-4 rounded border transition-opacity ${
                  alert.is_resolved
                    ? 'opacity-40 bg-[#0f1629] border-[#1e2d47]'
                    : `${cfg.bg} ${cfg.border}`
                }`}
              >
                <span className={`material-symbols-outlined mt-0.5 text-[20px] ${cfg.text}`}>
                  {cfg.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${cfg.text}`}>
                      {alert.severity}
                    </span>
                    <span className="text-[10px] font-mono text-[#3d5275] uppercase tracking-wider">
                      {alert.alert_type}
                    </span>
                    {alert.blood_group && (
                      <span className="text-[10px] font-mono text-[#6b8cba]">· {alert.blood_group} {alert.component}</span>
                    )}
                  </div>
                  <p className="text-sm text-[#e2e8f8]">{alert.message}</p>
                  <div className="mono-data text-[10px] text-[#3d5275] mt-1">
                    {alert.created_at?.slice(0, 16).replace('T', ' ')}
                  </div>
                </div>
                {!alert.is_resolved && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="text-xs font-medium text-[#00d4ff] hover:underline shrink-0"
                  >
                    Resolve
                  </button>
                )}
                {alert.is_resolved && (
                  <span className="text-[10px] mono-data text-[#3d5275] shrink-0">Resolved</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Alerts.tsx
git commit -m "feat(ui): dark alerts page with severity glow cards"
```

---

### Task 10: Upload page

**Files:**
- Modify: `frontend/src/pages/Upload.tsx`

Verify: drop zone has dark border → cyan when selected, result banner uses teal-glow, system info table is dark, history table is dark.

- [ ] **Step 1: Replace Upload.tsx**

```tsx
import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'

interface UploadRecord {
  id: string
  batch_id: string
  source: string
  filename: string
  inserted: number
  duplicates: number
  flagged: number
  errors: number
  total_rows: number
  uploaded_at: string
}

interface UploadResult {
  inserted: number
  duplicates: number
  flagged: number
  errors?: number
  message?: string
  batch_id?: string
  total_rows?: number
}

export default function Upload() {
  const [history, setHistory] = useState<UploadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  const loadHistory = () => {
    api.get('/upload/history')
      .then((r) => setHistory(r.data.history ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(loadHistory, [])

  const handleFileChange = () => {
    setSelectedFile(fileRef.current?.files?.[0]?.name ?? '')
    setResult(null)
    setError('')
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Please select a file first'); return }
    setUploading(true)
    setResult(null)
    setError('')

    const fd = new FormData()
    fd.append('file', file)

    try {
      const r = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(r.data)
      setSelectedFile('')
      if (fileRef.current) fileRef.current.value = ''
      loadHistory()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error ?? 'Upload failed — check the server logs')
    } finally {
      setUploading(false)
    }
  }

  const handleBulkLoad = async () => {
    setUploading(true)
    setResult(null)
    setError('')
    try {
      const r = await api.post('/upload/bulk-load')
      setResult({
        inserted:   r.data.inserted   ?? 0,
        duplicates: r.data.duplicates ?? 0,
        flagged:    r.data.flagged    ?? 0,
        errors:     r.data.errors     ?? 0,
        message:    r.data.message,
        batch_id:   r.data.batch_id,
      })
      loadHistory()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error ?? 'Bulk load failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-[10px] font-mono text-[#00d4ff] uppercase tracking-[0.3em] mb-1">
          Data Ingestion
        </div>
        <h1 className="font-headline text-3xl font-extrabold text-[#e2e8f8] tracking-tight">
          Upload &amp; Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File upload */}
        <div className="bg-[#0f1629] border border-[#1e2d47] rounded p-6">
          <h3 className="font-headline font-bold text-[#e2e8f8] mb-1">File Upload</h3>
          <p className="text-xs text-[#3d5275] mb-5">
            Upload blood bank register files (.numbers, .xlsx, .csv).
            Duplicates are automatically skipped.
          </p>

          <form onSubmit={handleUpload} className="space-y-4">
            <div
              className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors ${
                selectedFile
                  ? 'border-[#00d4ff] bg-[#00d4ff]/5'
                  : 'border-[#1e2d47] hover:border-[#00d4ff]/50'
              }`}
              onClick={() => fileRef.current?.click()}
            >
              <span className={`material-symbols-outlined text-4xl mb-2 block ${selectedFile ? 'text-[#00d4ff]' : 'text-[#3d5275]'}`}>
                {selectedFile ? 'check_circle' : 'upload_file'}
              </span>
              <div className="text-sm font-medium text-[#e2e8f8]">
                {selectedFile || 'Click to select file'}
              </div>
              <div className="text-xs text-[#3d5275] mt-1">.numbers · .xlsx · .csv</div>
              <input
                ref={fileRef}
                type="file"
                accept=".numbers,.xlsx,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Result banner */}
            {result && (
              <div className="bg-[#10d48e]/10 border border-[#10d48e]/20 rounded p-4">
                {result.message && (
                  <div className="text-sm font-medium text-[#10d48e] mb-3">{result.message}</div>
                )}
                {result.batch_id && (
                  <div className="mono-data text-[10px] text-[#3d5275] mb-3">
                    Batch: {result.batch_id}
                  </div>
                )}
                <div className="grid grid-cols-4 gap-3 text-center">
                  {(([
                    ['Inserted',   result.inserted,   '#10d48e'],
                    ['Duplicates', result.duplicates,  '#6b8cba'],
                    ['Flagged',    result.flagged,     '#f59e0b'],
                    ['Errors',     result.errors ?? 0, '#ff4757'],
                  ]) as [string, number, string][]).map(([label, val, color]) => (
                    <div key={label}>
                      <div className="mono-data text-2xl font-bold" style={{ color }}>{val}</div>
                      <div className="text-[10px] text-[#3d5275] uppercase tracking-wider mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-[#ff4757]/10 border border-[#ff4757]/20 rounded p-3 text-xs text-[#ff4757] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full bg-[#00d4ff] text-[#0a0e1a] py-3 text-sm font-bold rounded hover:shadow-[0_0_16px_#00d4ff40] active:scale-[0.98] transition-all disabled:opacity-30"
            >
              {uploading ? 'Processing...' : 'Upload & Ingest'}
            </button>
          </form>
        </div>

        {/* Bulk load + system info */}
        <div className="space-y-4">
          <div className="bg-[#0f1629] border border-[#1e2d47] rounded p-6">
            <h3 className="font-headline font-bold text-[#e2e8f8] mb-1">Initial Bulk Load</h3>
            <p className="text-xs text-[#3d5275] mb-5">
              Load all records from{' '}
              <span className="mono-data text-[#00d4ff]">cleaned_records.csv</span> into the
              database. Safe to re-run — duplicates are skipped.
            </p>
            <button
              onClick={handleBulkLoad}
              disabled={uploading}
              className="flex items-center gap-2 border border-[#1e2d47] text-[#e2e8f8] px-5 py-2.5 text-sm font-bold rounded hover:border-[#00d4ff] hover:text-[#00d4ff] transition-all disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[18px]">storage</span>
              {uploading ? 'Loading...' : 'Run Bulk Load'}
            </button>
          </div>

          <div className="bg-[#0f1629] border border-[#1e2d47] rounded p-6">
            <h3 className="font-headline font-bold text-[#e2e8f8] mb-3">System Info</h3>
            <div className="space-y-2 text-xs">
              {(([
                ['API Base',   'http://localhost:5001'],
                ['Auth',       'admin / bloodbank2026'],
                ['Database',   'Supabase PostgreSQL'],
                ['ML Models',  'SES · Isolation Forest · XGBoost'],
                ['Components', 'WB/PRC · FFP · PLT'],
              ]) as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between items-start gap-4 py-1.5 border-b border-[#1e2d47]/50">
                  <span className="text-[#6b8cba] font-medium shrink-0">{k}</span>
                  <span className="mono-data text-[#3d5275] text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Upload history */}
      <div className="bg-[#0f1629] border border-[#1e2d47] rounded overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1e2d47] flex items-center justify-between">
          <h3 className="font-headline font-bold text-[#e2e8f8]">Upload History</h3>
          <span className="mono-data text-xs text-[#3d5275]">{history.length} batches</span>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-[#00d4ff] text-sm mono-data animate-pulse">
            Loading...
          </div>
        ) : history.length === 0 ? (
          <div className="px-6 py-8 text-center text-[#3d5275] text-sm">
            No uploads yet — run a bulk load or upload a file above
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#080c18]">
                {['Batch ID', 'Source', 'Filename', 'Total', 'Inserted', 'Dupes', 'Flagged', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-[#3d5275]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={h.id ?? i} className={`border-b border-[#1e2d47]/40 hover:bg-[#1e2d47]/40 transition-colors ${i % 2 === 0 ? 'bg-[#0f1629]' : 'bg-[#0d1424]'}`}>
                  <td className="px-4 py-2 mono-data text-xs text-[#3d5275]" title={h.batch_id}>
                    {h.batch_id?.slice(0, 14)}…
                  </td>
                  <td className="px-4 py-2 mono-data text-xs text-[#6b8cba]">{h.source}</td>
                  <td className="px-4 py-2 text-xs text-[#e2e8f8] max-w-[160px] truncate" title={h.filename}>
                    {h.filename}
                  </td>
                  <td className="px-4 py-2 mono-data text-xs text-[#3d5275]">{h.total_rows ?? '—'}</td>
                  <td className="px-4 py-2 mono-data text-xs text-[#10d48e] font-bold">{h.inserted}</td>
                  <td className="px-4 py-2 mono-data text-xs text-[#6b8cba]">{h.duplicates}</td>
                  <td className="px-4 py-2 mono-data text-xs text-[#f59e0b]">{h.flagged}</td>
                  <td className="px-4 py-2 mono-data text-xs text-[#3d5275]">
                    {(h.uploaded_at ?? '').slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Upload.tsx
git commit -m "feat(ui): dark upload page with cyan drop zone and teal result banner"
```

---

### Task 11: Final verification and branch commit

**Files:** None (verification only)

- [ ] **Step 1: Start dev server and verify each page**

```bash
cd frontend && npm run dev
```

Visit http://localhost:5173 and check:
- Login: dark both panels, cyan hero text, cyan submit button
- Dashboard: dark KPI cards, cyan top border on first card, cyan bar chart
- Inventory: dark table, dark filter selects, colored status badges
- Allocate: dark form, cyan submit, glow priority badges
- Donors: dark table, cyan Add Donor button, glow eligible badges
- Predictions: cyan area chart, cyan active component button
- Alerts: severity glow cards, cyan Run Scan button, teal empty state
- Upload: cyan dropzone border when file selected, dark history table

- [ ] **Step 2: Run lint**

```bash
cd frontend && npm run lint
```

Expected: no errors

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(ui): complete Deep Space dark theme — all pages"
```
