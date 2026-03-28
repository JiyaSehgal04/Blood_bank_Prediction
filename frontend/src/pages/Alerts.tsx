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
