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
