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
