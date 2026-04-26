import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../lib/api'
import { DATA_CACHE_INVALIDATED_EVENT, readCache, writeCache } from '../lib/sessionCache'

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

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}
const ALERTS_CACHE_KEY = 'blood_bank_alerts_cache'

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>(() => (
    readCache<Alert[]>(ALERTS_CACHE_KEY, [])
  ))
  const [loading, setLoading] = useState(() => (
    readCache<Alert[]>(ALERTS_CACHE_KEY, []).length === 0
  ))
  const [scanning, setScanning] = useState(false)
  const [filter, setFilter] = useState<'active' | 'all'>('active')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback((blocking = alerts.length === 0) => {
    if (blocking) setLoading(true)
    Promise.all([
      api.get('/alerts?resolved=false&limit=500'),
      api.get('/alerts?resolved=true&limit=500'),
    ]).then(([active, resolved]) => {
      const nextAlerts = [
        ...(active.data.alerts ?? []),
        ...(resolved.data.alerts ?? []),
      ]
      setAlerts(nextAlerts)
      writeCache(ALERTS_CACHE_KEY, nextAlerts)
    })
      .catch(console.error).finally(() => setLoading(false))
  }, [alerts.length])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    intervalRef.current = setInterval(() => load(false), 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [load])

  useEffect(() => {
    const handleInvalidation = () => {
      setAlerts([])
      load(true)
    }
    window.addEventListener(DATA_CACHE_INVALIDATED_EVENT, handleInvalidation)
    return () => window.removeEventListener(DATA_CACHE_INVALIDATED_EVENT, handleInvalidation)
  }, [load])

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
      setAlerts((prev) => {
        const nextAlerts = prev.map((a) => a.id === id ? { ...a, is_resolved: true } : a)
        writeCache(ALERTS_CACHE_KEY, nextAlerts)
        return nextAlerts
      })
    } catch (err) {
      console.error(err)
    }
  }

  const displayed = filter === 'active' ? alerts.filter((a) => !a.is_resolved) : alerts
  const sortedAlerts = [...displayed].sort((a, b) => {
    if (a.is_resolved !== b.is_resolved) return a.is_resolved ? 1 : -1
    const severityDiff = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    if (severityDiff !== 0) return severityDiff
    return (b.created_at ?? '').localeCompare(a.created_at ?? '')
  })

  const counts = {
    critical: alerts.filter((a) => !a.is_resolved && a.severity === 'CRITICAL').length,
    high:     alerts.filter((a) => !a.is_resolved && a.severity === 'HIGH').length,
    medium:   alerts.filter((a) => !a.is_resolved && a.severity === 'MEDIUM').length,
    active:   alerts.filter((a) => !a.is_resolved).length,
    resolved: alerts.filter((a) => a.is_resolved).length,
  }

  return (
    <div className="green-stroke-bg space-y-6">
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-[#ffdad6] border border-[#ba1a1a]/10 rounded p-3">
          <div className="text-[9px] font-mono text-[#93000a] uppercase tracking-wider mb-1">Critical</div>
          <div className="mono-data text-2xl font-bold text-[#93000a]">{counts.critical}</div>
        </div>
        <div className="bg-[#ffdad6]/50 border border-[#ba1a1a]/10 rounded p-3">
          <div className="text-[9px] font-mono text-[#ba1a1a] uppercase tracking-wider mb-1">High</div>
          <div className="mono-data text-2xl font-bold text-[#ba1a1a]">{counts.high}</div>
        </div>
        <div className="bg-[#92f5a4]/20 border border-[#006d30]/10 rounded p-3">
          <div className="text-[9px] font-mono text-[#005323] uppercase tracking-wider mb-1">Medium</div>
          <div className="mono-data text-2xl font-bold text-[#005323]">{counts.medium}</div>
        </div>
        <div className="soft-green-panel border border-[#becabc]/30 rounded p-3">
          <div className="text-[9px] font-mono text-[#3f493f] uppercase tracking-wider mb-1">Active</div>
          <div className="mono-data text-2xl font-bold text-[#1b1c15]">{counts.active}</div>
        </div>
        <div className="soft-green-panel border border-[#becabc]/30 rounded p-3">
          <div className="text-[9px] font-mono text-[#6f7a6e] uppercase tracking-wider mb-1">Resolved</div>
          <div className="mono-data text-2xl font-bold text-[#585756]">{counts.resolved}</div>
        </div>
      </div>

      {/* Filter toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['active', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider rounded transition-colors ${
                filter === f ? 'bg-[#1b1c15] text-white' : 'border border-[#becabc] text-[#3f493f] hover:bg-[#f5f4e8]'
              }`}
            >
              {f === 'active' ? 'Active Only' : 'All Alerts'}
            </button>
          ))}
        </div>
        <div className="text-[10px] mono-data text-[#6f7a6e]">
          Showing {sortedAlerts.length} of {alerts.length}
        </div>
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="h-32 flex items-center justify-center text-[#6f7a6e] text-sm">Loading...</div>
      ) : sortedAlerts.length === 0 ? (
        <div className="bg-[#92f5a4]/20 border border-[#006d30]/20 rounded p-8 text-center">
          <span className="material-symbols-outlined text-[#006d30] text-3xl mb-2 block">check_circle</span>
          <div className="text-[#005323] font-medium">All clear — no {filter === 'active' ? 'active' : ''} alerts</div>
        </div>
      ) : (
        <div className="soft-green-panel border border-[#becabc]/30 rounded overflow-hidden">
          <div className="sticky top-0 z-10 flex items-center justify-between bg-[#f5f4e8] border-b border-[#becabc]/30 px-3 py-2">
            <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#3f493f]">
              Severity-sorted alert queue
            </div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#6f7a6e]">
              Newest within severity
            </div>
          </div>
          <div className="max-h-[58vh] min-h-[260px] overflow-auto">
          {sortedAlerts.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.LOW
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 border-b border-[#becabc]/20 px-3 py-2.5 ${alert.is_resolved ? 'bg-[#f5f4e8]/70 opacity-60' : cfg.bg}`}
              >
                <span className={`material-symbols-outlined mt-0.5 text-[18px] ${cfg.text}`}>
                  {cfg.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-0.5">
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
                  <p className="text-xs leading-relaxed text-[#1b1c15]">{alert.message}</p>
                  <div className="mono-data text-[10px] text-[#6f7a6e] mt-1">
                    {alert.created_at?.slice(0, 16).replace('T', ' ')}
                  </div>
                </div>
                {!alert.is_resolved && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="rounded border border-[#006d30]/20 bg-white/60 px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#006d30] hover:bg-white shrink-0"
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
        </div>
      )}
    </div>
  )
}
