import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../lib/api'
import { DATA_CACHE_INVALIDATED_EVENT, readCache, writeCache } from '../lib/sessionCache'

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
const INVENTORY_CACHE_PREFIX = 'blood_bank_inventory_cache'
const INVENTORY_TIME_PREFIX = 'blood_bank_inventory_updated_at'

export default function Inventory() {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [bloodGroup, setBloodGroup] = useState('')
  const [component, setComponent] = useState('')
  const [status, setStatus] = useState('available')
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (bloodGroup) params.set('blood_group', bloodGroup)
    if (component) params.set('component', component)
    if (status) params.set('status', status)
    const cacheKey = `${INVENTORY_CACHE_PREFIX}:${params.toString()}`
    const timeKey = `${INVENTORY_TIME_PREFIX}:${params.toString()}`
    const cached = readCache<Unit[]>(cacheKey, [])
    if (cached.length > 0) {
      setUnits(cached)
      setLastUpdated(readCache<string>(timeKey, ''))
      setLoading(false)
    } else {
      setLoading(true)
    }
    api.get(`/inventory?${params}`)
      .then((r) => {
        const nextUnits = r.data.units ?? []
        const updatedAt = new Date().toLocaleTimeString()
        setNowMs(Date.now())
        setUnits(nextUnits)
        setLastUpdated(updatedAt)
        writeCache(cacheKey, nextUnits)
        writeCache(timeKey, updatedAt)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [bloodGroup, component, status])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  useEffect(() => {
    intervalRef.current = setInterval(load, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [load])

  useEffect(() => {
    const handleInvalidation = () => {
      setUnits([])
      setLastUpdated('')
      setLoading(true)
      load()
    }
    window.addEventListener(DATA_CACHE_INVALIDATED_EVENT, handleInvalidation)
    return () => window.removeEventListener(DATA_CACHE_INVALIDATED_EVENT, handleInvalidation)
  }, [load])

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      available: 'bg-[#92f5a4]/40 text-[#005323]',
      issued:    'bg-[#e4e3d7] text-[#585756]',
      expired:   'bg-[#ffdad6] text-[#93000a]',
    }
    return map[s] ?? 'bg-[#efeee3] text-[#3f493f]'
  }

  const expiryWarning = (expiry: string, currentTimeMs: number) => {
    const days = Math.ceil((new Date(expiry).getTime() - currentTimeMs) / 86400000)
    if (days < 0) return 'text-[#ba1a1a]'
    if (days <= 3) return 'text-[#ba1a1a] font-bold'
    if (days <= 7) return 'text-[#006d30] font-medium'
    return 'text-[#3f493f]'
  }

  return (
    <div className="green-stroke-bg space-y-6">
      <div>
        <div className="text-[10px] font-mono text-[#006d30] uppercase tracking-[0.3em] mb-1">
          MODULE_01
        </div>
        <h1 className="font-headline text-3xl font-extrabold text-[#1b1c15] tracking-tight">
          Blood Inventory
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {[
          { label: 'Blood Group', value: bloodGroup, set: setBloodGroup, opts: GROUPS },
          { label: 'Component', value: component, set: setComponent, opts: COMPONENTS },
        ].map(({ label, value, set, opts }) => (
          <div key={label}>
            <label className="block text-[10px] font-mono text-[#3f493f] uppercase tracking-wider mb-1">
              {label}
            </label>
            <select
              value={value}
              onChange={(e) => set(e.target.value)}
              className="bg-white border border-[#becabc]/40 text-[#1b1c15] text-sm px-3 py-2 rounded outline-none focus:border-[#006d30] transition-colors"
            >
              {opts.map((o) => <option key={o} value={o}>{o || `All ${label}s`}</option>)}
            </select>
          </div>
        ))}
        <div>
          <label className="block text-[10px] font-mono text-[#3f493f] uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-white border border-[#becabc]/40 text-[#1b1c15] text-sm px-3 py-2 rounded outline-none focus:border-[#006d30] transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="issued">Issued</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Count */}
      <div className="text-xs mono-data text-[#6f7a6e]">
        {loading ? 'Loading...' : `${units.length} units`}
        {lastUpdated && <span className="ml-3">· Last updated {lastUpdated}</span>}
      </div>

      {/* Table */}
      <div className="soft-green-panel border border-[#becabc]/30 rounded overflow-hidden">
        <div className="max-h-[58vh] min-h-[260px] overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#f5f4e8] border-b border-[#becabc]/30 shadow-[0_1px_0_rgba(190,202,188,0.25)]">
                {['Unit ID', 'Blood Group', 'Component', 'Status', 'Expiry Date', 'Qty (mL)'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[9px] font-mono uppercase tracking-wider text-[#3f493f]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map((u, i) => (
                <tr key={u.unit_id} className={`border-b border-[#becabc]/10 hover:bg-[#f5f4e8] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#fbfaee]'}`}>
                  <td className="px-3 py-2 mono-data text-[11px] text-[#585756] whitespace-nowrap">{u.unit_id}</td>
                  <td className="px-3 py-2 font-medium text-[#1b1c15] whitespace-nowrap">{u.blood_group}</td>
                  <td className="px-3 py-2 mono-data text-[11px] text-[#3f493f] whitespace-nowrap">{u.component}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusBadge(u.status)}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className={`px-3 py-2 mono-data text-[11px] whitespace-nowrap ${expiryWarning(u.expiry_date, nowMs)}`}>
                    {u.expiry_date}
                  </td>
                  <td className="px-3 py-2 mono-data text-[11px] text-[#3f493f] whitespace-nowrap">{u.quantity_ml}</td>
                </tr>
              ))}
              {!loading && units.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#6f7a6e] text-sm">
                    No units found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
