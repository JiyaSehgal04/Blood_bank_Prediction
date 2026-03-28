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
