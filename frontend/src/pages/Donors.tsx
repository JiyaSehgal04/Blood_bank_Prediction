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

  return (
    <div className="green-stroke-bg space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-mono text-[#006d30] uppercase tracking-[0.3em] mb-1">
            MODULE_03
          </div>
          <h1 className="font-headline text-3xl font-extrabold text-[#1b1c15] tracking-tight">
            Donor Portal
          </h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#1b1c15] text-white px-4 py-2 text-sm font-bold rounded hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">person_add</span>
          Add Donor
        </button>
      </div>

      {/* Add donor form */}
      {showForm && (
        <div className="soft-green-panel border border-[#becabc]/30 rounded p-6">
          <h3 className="font-headline font-bold text-[#1b1c15] mb-4">Register New Donor</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Full Name', key: 'name', type: 'text', req: true },
              { label: 'Email', key: 'email', type: 'email', req: false },
              { label: 'Phone', key: 'phone', type: 'tel', req: false },
              { label: 'Date of Birth', key: 'date_of_birth', type: 'date', req: false },
            ].map(({ label, key, type, req }) => (
              <div key={key}>
                <label className="block text-[10px] font-mono text-[#3f493f] uppercase tracking-wider mb-1">{label}</label>
                <input
                  type={type}
                  required={req}
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f4e8] border border-[#becabc]/40 text-sm text-[#1b1c15] rounded outline-none focus:border-[#006d30] transition-colors"
                />
              </div>
            ))}
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
              <label className="block text-[10px] font-mono text-[#3f493f] uppercase tracking-wider mb-1">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full px-3 py-2 bg-[#f5f4e8] border border-[#becabc]/40 text-sm text-[#1b1c15] rounded outline-none focus:border-[#006d30] transition-colors"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
            <div className="col-span-full flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="bg-[#006d30] text-white px-6 py-2 text-sm font-bold rounded hover:opacity-90 transition-all disabled:opacity-50">
                {saving ? 'Saving...' : 'Register Donor'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="border border-[#becabc] text-[#3f493f] px-6 py-2 text-sm font-medium rounded hover:bg-[#f5f4e8] transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7a6e] text-[18px]">search</span>
        <input
          type="search"
          placeholder="Search donors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-[#becabc]/40 text-sm text-[#1b1c15] rounded outline-none focus:border-[#006d30] transition-colors"
        />
      </div>

      {/* Table */}
      <div className="soft-green-panel border border-[#becabc]/30 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f5f4e8] border-b border-[#becabc]/30">
              {['Name', 'Blood Group', 'Phone', 'Donations', 'Last Donation', 'Eligible'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-[#3f493f]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-[#6f7a6e]">Loading...</td></tr>
            ) : donors.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-[#6f7a6e]">No donors found</td></tr>
            ) : (
              donors.map((d, i) => (
                <tr key={d.id} className={`border-b border-[#becabc]/10 ${i % 2 === 0 ? 'bg-white' : 'bg-[#fbfaee]'}`}>
                  <td className="px-4 py-3 font-medium text-[#1b1c15]">{d.name}</td>
                  <td className="px-4 py-3 mono-data text-xs">{d.blood_group}</td>
                  <td className="px-4 py-3 text-xs text-[#3f493f]">{d.phone || '—'}</td>
                  <td className="px-4 py-3 mono-data text-xs text-center">{d.total_donations}</td>
                  <td className="px-4 py-3 mono-data text-xs text-[#6f7a6e]">{d.last_donation_date || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      d.is_eligible ? 'bg-[#92f5a4]/40 text-[#005323]' : 'bg-[#ffdad6] text-[#93000a]'
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
