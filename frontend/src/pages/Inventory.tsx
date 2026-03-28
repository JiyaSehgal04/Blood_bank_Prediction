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
