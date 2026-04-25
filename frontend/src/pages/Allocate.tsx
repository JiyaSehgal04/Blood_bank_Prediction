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
    emergency: 'bg-[#ffdad6] text-[#93000a]',
    urgent:    'bg-[#92f5a4]/40 text-[#005323]',
    routine:   'bg-[#e4e3d7] text-[#585756]',
  }[p] ?? 'bg-[#efeee3] text-[#3f493f]')

  return (
    <div className="green-stroke-bg space-y-8">
      <div>
        <div className="text-[10px] font-mono text-[#006d30] uppercase tracking-[0.3em] mb-1">
          MODULE_02
        </div>
        <h1 className="font-headline text-3xl font-extrabold text-[#1b1c15] tracking-tight">
          Blood Allocation
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Allocation Form */}
        <div className="lg:col-span-2 soft-green-panel border border-[#becabc]/30 rounded p-6">
          <h3 className="font-headline text-lg font-bold text-[#1b1c15] mb-5">New Request</h3>
          <form onSubmit={handleAllocate} className="space-y-4">
            {[
              { label: 'Patient Name', key: 'patient_name', type: 'text', placeholder: 'Full name' },
              { label: 'Hospital / Ward', key: 'hospital', type: 'text', placeholder: 'Hospital name' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] font-mono text-[#3f493f] uppercase tracking-wider mb-1">{label}</label>
                <input
                  type={type}
                  value={(form as Record<string, string | number>)[key] as string}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  required
                  className="w-full px-3 py-2 bg-[#f5f4e8] border border-[#becabc]/40 text-sm text-[#1b1c15] rounded outline-none focus:border-[#006d30] transition-colors"
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-[#3f493f] uppercase tracking-wider mb-1">Blood Group</label>
                <select
                  value={form.blood_group}
                  onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f4e8] border border-[#becabc]/40 text-sm text-[#1b1c15] rounded outline-none focus:border-[#006d30] transition-colors"
                >
                  {GROUPS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#3f493f] uppercase tracking-wider mb-1">Component</label>
                <select
                  value={form.component}
                  onChange={(e) => setForm({ ...form, component: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f4e8] border border-[#becabc]/40 text-sm text-[#1b1c15] rounded outline-none focus:border-[#006d30] transition-colors"
                >
                  {COMPONENTS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-[#3f493f] uppercase tracking-wider mb-1">Units</label>
                <input
                  type="number" min={1} max={20}
                  value={form.units_requested}
                  onChange={(e) => setForm({ ...form, units_requested: +e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f4e8] border border-[#becabc]/40 text-sm text-[#1b1c15] rounded outline-none focus:border-[#006d30] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#3f493f] uppercase tracking-wider mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f4e8] border border-[#becabc]/40 text-sm text-[#1b1c15] rounded outline-none focus:border-[#006d30] transition-colors"
                >
                  <option value="emergency">Emergency</option>
                  <option value="urgent">Urgent</option>
                  <option value="routine">Routine</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-[#3f493f] uppercase tracking-wider mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-[#f5f4e8] border border-[#becabc]/40 text-sm text-[#1b1c15] rounded outline-none focus:border-[#006d30] transition-colors resize-none"
              />
            </div>

            {result && (
              <div className={`px-3 py-2 rounded text-xs flex items-center gap-2 ${
                result.status === 'allocated' ? 'bg-[#92f5a4]/30 text-[#005323]' : 'bg-[#ffdad6] text-[#93000a]'
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
              className="w-full bg-[#1b1c15] text-white py-3 text-sm font-bold rounded hover:opacity-90 transition-all disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Process Request'}
            </button>
          </form>
        </div>

        {/* Recent allocations */}
        <div className="lg:col-span-3 soft-green-panel border border-[#becabc]/30 rounded overflow-hidden">
          <div className="px-6 py-4 border-b border-[#becabc]/20">
            <h3 className="font-headline font-bold text-[#1b1c15]">Recent Allocations</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f5f4e8]">
                {['Patient', 'Group', 'Component', 'Units', 'Priority', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-[#3f493f]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#6f7a6e] text-sm">Loading...</td></tr>
              ) : allocations.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#6f7a6e] text-sm">No allocations yet</td></tr>
              ) : (
                allocations.slice(0, 20).map((a, i) => (
                  <tr key={a.id ?? i} className={`border-b border-[#becabc]/10 ${i % 2 === 0 ? 'bg-white' : 'bg-[#fbfaee]'}`}>
                    <td className="px-4 py-2 text-[#1b1c15] font-medium">{a.patient_name || '—'}</td>
                    <td className="px-4 py-2 mono-data text-xs">{a.blood_group}</td>
                    <td className="px-4 py-2 mono-data text-xs text-[#3f493f]">{a.component}</td>
                    <td className="px-4 py-2 mono-data text-xs">{a.units_allocated}/{a.units_requested}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${priorityBadge(a.priority)}`}>
                        {a.priority}
                      </span>
                    </td>
                    <td className="px-4 py-2 mono-data text-xs text-[#6f7a6e]">
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
