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

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
  CRITICAL: { bg: 'bg-[#ffdad6]', text: 'text-[#93000a]', icon: 'emergency' },
  HIGH:     { bg: 'bg-[#ffdad6]/70', text: 'text-[#ba1a1a]', icon: 'warning' },
  MEDIUM:   { bg: 'bg-[#92f5a4]/20', text: 'text-[#005323]', icon: 'info' },
  LOW:      { bg: 'bg-[#e4e3d7]', text: 'text-[#585756]', icon: 'check_circle' },
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
          <div className="text-[10px] font-mono text-[#006d30] uppercase tracking-[0.3em] mb-1">
            System Monitoring
          </div>
          <h1 className="font-headline text-3xl font-extrabold text-[#1b1c15] tracking-tight">
            Alerts
          </h1>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-2 bg-[#1b1c15] text-white px-4 py-2 text-sm font-bold rounded hover:opacity-90 transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px]">search</span>
          {scanning ? 'Scanning...' : 'Run Scan'}
        </button>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#ffdad6] border border-[#ba1a1a]/10 rounded p-4">
          <div className="text-[10px] font-mono text-[#93000a] uppercase tracking-wider mb-1">Critical</div>
          <div className="mono-data text-3xl font-bold text-[#93000a]">{counts.critical}</div>
        </div>
        <div className="bg-[#ffdad6]/50 border border-[#ba1a1a]/10 rounded p-4">
          <div className="text-[10px] font-mono text-[#ba1a1a] uppercase tracking-wider mb-1">High</div>
          <div className="mono-data text-3xl font-bold text-[#ba1a1a]">{counts.high}</div>
        </div>
        <div className="bg-white border border-[#becabc]/30 rounded p-4">
          <div className="text-[10px] font-mono text-[#3f493f] uppercase tracking-wider mb-1">Total Active</div>
          <div className="mono-data text-3xl font-bold text-[#1b1c15]">{counts.active}</div>
        </div>
      </div>

      {/* Filter toggle */}
      <div className="flex gap-2">
        {(['active', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded transition-colors ${
              filter === f ? 'bg-[#1b1c15] text-white' : 'border border-[#becabc] text-[#3f493f] hover:bg-[#f5f4e8]'
            }`}
          >
            {f === 'active' ? 'Active Only' : 'All Alerts'}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="h-32 flex items-center justify-center text-[#6f7a6e] text-sm">Loading...</div>
      ) : displayed.length === 0 ? (
        <div className="bg-[#92f5a4]/20 border border-[#006d30]/20 rounded p-8 text-center">
          <span className="material-symbols-outlined text-[#006d30] text-3xl mb-2 block">check_circle</span>
          <div className="text-[#005323] font-medium">All clear — no {filter === 'active' ? 'active' : ''} alerts</div>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.LOW
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-4 p-4 rounded border ${alert.is_resolved ? 'opacity-50 bg-[#f5f4e8] border-[#becabc]/20' : `${cfg.bg} border-transparent`}`}
              >
                <span className={`material-symbols-outlined mt-0.5 text-[20px] ${cfg.text}`}>
                  {cfg.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${cfg.text}`}>
                      {alert.severity}
                    </span>
                    <span className="text-[10px] font-mono text-[#6f7a6e] uppercase tracking-wider">
                      {alert.alert_type}
                    </span>
                    {alert.blood_group && (
                      <span className="text-[10px] font-mono text-[#3f493f]">· {alert.blood_group} {alert.component}</span>
                    )}
                  </div>
                  <p className="text-sm text-[#1b1c15]">{alert.message}</p>
                  <div className="mono-data text-[10px] text-[#6f7a6e] mt-1">
                    {alert.created_at?.slice(0, 16).replace('T', ' ')}
                  </div>
                </div>
                {!alert.is_resolved && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="text-xs font-medium text-[#006d30] hover:underline shrink-0"
                  >
                    Resolve
                  </button>
                )}
                {alert.is_resolved && (
                  <span className="text-[10px] mono-data text-[#6f7a6e] shrink-0">Resolved</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
