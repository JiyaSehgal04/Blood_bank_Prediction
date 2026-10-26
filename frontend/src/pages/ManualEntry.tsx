import { useMemo, useState } from 'react'
import api from '../lib/api'
import { useToast } from '../context/toast'
import { invalidateDataCaches, prefetchAllCaches } from '../lib/sessionCache'

const BLOOD_GROUPS = ['O Pos', 'A Pos', 'B Pos', 'AB Pos', 'O Neg', 'A Neg', 'B Neg', 'AB Neg']
const COMPONENTS = ['WB/PRC', 'FFP', 'PLT']
const SCREENING = ['Neg', 'Pos']

interface ManualForm {
  sno: string
  unit_no: string
  segment_no: string
  blood_group: string
  component: string
  quantity_ml: string
  collection_date: string
  collection_time: string
  expiry_date: string
  hiv: string
  hbsag: string
  hcv: string
  malaria: string
  vdrl: string
  notes: string
}

const initialForm: ManualForm = {
  sno: '',
  unit_no: '',
  segment_no: '',
  blood_group: 'O Pos',
  component: 'WB/PRC',
  quantity_ml: '',
  collection_date: '',
  collection_time: '',
  expiry_date: '',
  hiv: 'Neg',
  hbsag: 'Neg',
  hcv: 'Neg',
  malaria: 'Neg',
  vdrl: 'Neg',
  notes: '',
}

function toApiDate(value: string) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-mono font-bold text-[#13294b] uppercase tracking-wider mb-1">
      {children}
    </label>
  )
}

export default function ManualEntry() {
  const toast = useToast()
  const [form, setForm] = useState<ManualForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const ready = useMemo(
    () => Boolean(form.sno && form.unit_no && form.quantity_ml && form.collection_date),
    [form],
  )

  const setValue = (key: keyof ManualForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setError('')
  }

  const reset = () => {
    setForm(initialForm)
    setError('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready) {
      setError('Fill S.No, Unit No, Quantity, and Collection Date.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        ...form,
        segment_no: form.segment_no || 'N/A',
        collection_date: toApiDate(form.collection_date),
        expiry_date: toApiDate(form.expiry_date),
        quantity_ml: Number(form.quantity_ml),
        source: 'manual',
      }
      const response = await api.post('/inventory', payload)
      const unitId = response.data.unit_id ?? response.data.inserted?.unit_id ?? ''
      toast.success('Saved', unitId ? `Unit ${unitId} added to inventory` : 'Entry added to inventory')
      setForm(initialForm)
      invalidateDataCaches()
      prefetchAllCaches(api)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; errors?: string[] } } }
      setError(e?.response?.data?.errors?.join(' ') ?? e?.response?.data?.error ?? 'Manual entry failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="green-stroke-bg space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] font-mono text-[#13294b] uppercase tracking-[0.3em] mb-1">
            Inventory Intake
          </div>
          <h1 className="font-headline text-3xl font-extrabold text-[#1b1c15] tracking-tight">
            Manual Entry
          </h1>
        </div>
        <div className="rounded border border-[#13294b]/50 bg-white px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-[#4b5468]">Source</div>
          <div className="mono-data text-sm font-bold text-[#1b1c15]">manual</div>
        </div>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="bg-white border border-[#13294b] rounded overflow-hidden shadow-sm">
          <div className="px-6 py-3.5 bg-[#13294b] flex items-center justify-between">
            <h3 className="font-headline text-lg font-bold text-white">Unit Details</h3>
            <span className="material-symbols-outlined text-white">edit_note</span>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel>S.No</FieldLabel>
                <input
                  value={form.sno}
                  onChange={(e) => setValue('sno', e.target.value)}
                  className="w-full bg-white text-[#0b1b36] border border-[#13294b]/60 rounded px-3 py-2 text-sm outline-none focus:border-[#13294b]"
                />
              </div>
              <div>
                <FieldLabel>Unit No</FieldLabel>
                <input
                  value={form.unit_no}
                  onChange={(e) => setValue('unit_no', e.target.value)}
                  className="w-full bg-white text-[#0b1b36] border border-[#13294b]/60 rounded px-3 py-2 text-sm outline-none focus:border-[#13294b]"
                />
              </div>
              <div>
                <FieldLabel>Segment No</FieldLabel>
                <input
                  value={form.segment_no}
                  onChange={(e) => setValue('segment_no', e.target.value)}
                  placeholder="N/A"
                  className="w-full bg-white text-[#0b1b36] border border-[#13294b]/60 rounded px-3 py-2 text-sm outline-none focus:border-[#13294b]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel>Blood Group</FieldLabel>
                <select
                  value={form.blood_group}
                  onChange={(e) => setValue('blood_group', e.target.value)}
                  className="w-full bg-white text-[#0b1b36] border border-[#13294b]/60 rounded px-3 py-2 text-sm outline-none focus:border-[#13294b]"
                >
                  {BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Component</FieldLabel>
                <select
                  value={form.component}
                  onChange={(e) => setValue('component', e.target.value)}
                  className="w-full bg-white text-[#0b1b36] border border-[#13294b]/60 rounded px-3 py-2 text-sm outline-none focus:border-[#13294b]"
                >
                  {COMPONENTS.map((component) => <option key={component}>{component}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Quantity (mL)</FieldLabel>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.quantity_ml}
                  onChange={(e) => setValue('quantity_ml', e.target.value)}
                  className="w-full bg-white text-[#0b1b36] border border-[#13294b]/60 rounded px-3 py-2 text-sm outline-none focus:border-[#13294b]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel>Collection Date</FieldLabel>
                <input
                  type="date"
                  value={form.collection_date}
                  onChange={(e) => setValue('collection_date', e.target.value)}
                  className="w-full bg-white text-[#0b1b36] border border-[#13294b]/60 rounded px-3 py-2 text-sm outline-none focus:border-[#13294b]"
                />
              </div>
              <div>
                <FieldLabel>Collection Time</FieldLabel>
                <input
                  type="time"
                  value={form.collection_time}
                  onChange={(e) => setValue('collection_time', e.target.value)}
                  className="w-full bg-white text-[#0b1b36] border border-[#13294b]/60 rounded px-3 py-2 text-sm outline-none focus:border-[#13294b]"
                />
              </div>
              <div>
                <FieldLabel>Expiry Date</FieldLabel>
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setValue('expiry_date', e.target.value)}
                  className="w-full bg-white text-[#0b1b36] border border-[#13294b]/60 rounded px-3 py-2 text-sm outline-none focus:border-[#13294b]"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Notes</FieldLabel>
              <textarea
                value={form.notes}
                onChange={(e) => setValue('notes', e.target.value)}
                rows={3}
                className="w-full resize-none bg-white text-[#0b1b36] border border-[#13294b]/60 rounded px-3 py-2 text-sm outline-none focus:border-[#13294b]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-[#13294b] rounded overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 bg-[#13294b]">
              <h3 className="font-headline text-lg font-bold text-white">Screening</h3>
            </div>
            <div className="px-5 py-1 divide-y divide-[#13294b]/20">
              {([
                ['HIV 1&2', 'hiv'],
                ['HBsAg', 'hbsag'],
                ['HCV', 'hcv'],
                ['Malaria', 'malaria'],
                ['VDRL', 'vdrl'],
              ] as [string, keyof ManualForm][]).map(([label, key]) => (
                <div key={key} className="flex items-center justify-between gap-4 py-3.5">
                  <span className="text-[15px] font-bold text-[#0b1b36]">{label}</span>
                  <select
                    value={form[key]}
                    onChange={(e) => setValue(key, e.target.value)}
                    className="bg-white text-[#0b1b36] border border-[#13294b]/60 rounded px-3 py-1.5 text-sm font-semibold outline-none focus:border-[#13294b]"
                  >
                    {SCREENING.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-[#e8a099] border border-[#7a0909]/20 rounded p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-[#4a0005]">error</span>
              <div className="text-xs text-[#4a0005]">{error}</div>
            </div>
          )}

          <div className="bg-white border border-[#13294b] rounded p-4 space-y-2 shadow-sm">
            <button
              type="submit"
              disabled={saving || !ready}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#2a5db0] text-white px-4 py-2 text-[13px] font-bold rounded hover:bg-[#1f4a91] active:scale-[0.99] transition-all disabled:bg-[#c9d3e4] disabled:text-[#4b5468] disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <span className="material-symbols-outlined text-[16px]">{saving ? 'sync' : 'save'}</span>
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#dbe6f7] text-[#13294b] border border-[#9db7e0] px-4 py-2 text-[13px] font-bold rounded hover:bg-[#c5d5ee] transition-all disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              Reset
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
