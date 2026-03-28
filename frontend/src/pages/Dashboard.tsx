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
        setError('')
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

  if (error && !stats) return (
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
        {error && stats && (
          <div className="text-[10px] font-mono text-[#f59e0b] mt-1">
            Poll failed — showing cached data
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
