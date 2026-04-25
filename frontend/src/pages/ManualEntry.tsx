import { useMemo, useState } from 'react'
import api from '../lib/api'

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
    <label className="block text-[10px] font-mono text-[#3f493f] uppercase tracking-wider mb-1">
      {children}
    </label>
  )
}

export default function ManualEntry() {
  const [form, setForm] = useState<ManualForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedUnitId, setSavedUnitId] = useState('')

  const ready = useMemo(
    () => Boolean(form.sno && form.unit_no && form.quantity_ml && form.collection_date),
    [form],
  )

  const setValue = (key: keyof ManualForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setError('')
    setSavedUnitId('')
  }

  const reset = () => {
    setForm(initialForm)
    setError('')
    setSavedUnitId('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready) {
      setError('Fill S.No, Unit No, Quantity, and Collection Date.')
      return
    }

    setSaving(true)
    setError('')
    setSavedUnitId('')

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
      setSavedUnitId(response.data.unit_id ?? response.data.inserted?.unit_id ?? '')
      setForm(initialForm)
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
          <div className="text-[10px] font-mono text-[#006d30] uppercase tracking-[0.3em] mb-1">
            Inventory Intake
          </div>
          <h1 className="font-headline text-3xl font-extrabold text-[#1b1c15] tracking-tight">
            Manual Entry
          </h1>
        </div>
        <div className="rounded border border-[#becabc]/50 bg-white px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-[#6f7a6e]">Source</div>
          <div className="mono-data text-sm font-bold text-[#1b1c15]">manual</div>
        </div>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="soft-green-panel border border-[#becabc]/40 rounded overflow-hidden">
          <div className="px-6 py-4 border-b border-[#becabc]/25 flex items-center justify-between">
            <h3 className="font-headline font-bold text-[#1b1c15]">Unit Details</h3>
            <span className="material-symbols-outlined text-[#006d30]">edit_note</span>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel>S.No</FieldLabel>
                <input
                  value={form.sno}
                  onChange={(e) => setValue('sno', e.target.value)}
                  className="w-full bg-[#fbfaee] border border-[#becabc]/50 rounded px-3 py-2 text-sm outline-none focus:border-[#006d30]"
                />
              </div>
              <div>
                <FieldLabel>Unit No</FieldLabel>
                <input
                  value={form.unit_no}
                  onChange={(e) => setValue('unit_no', e.target.value)}
                  className="w-full bg-[#fbfaee] border border-[#becabc]/50 rounded px-3 py-2 text-sm outline-none focus:border-[#006d30]"
                />
              </div>
              <div>
                <FieldLabel>Segment No</FieldLabel>
                <input
                  value={form.segment_no}
                  onChange={(e) => setValue('segment_no', e.target.value)}
                  placeholder="N/A"
                  className="w-full bg-[#fbfaee] border border-[#becabc]/50 rounded px-3 py-2 text-sm outline-none focus:border-[#006d30]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel>Blood Group</FieldLabel>
                <select
                  value={form.blood_group}
                  onChange={(e) => setValue('blood_group', e.target.value)}
                  className="w-full bg-[#fbfaee] border border-[#becabc]/50 rounded px-3 py-2 text-sm outline-none focus:border-[#006d30]"
                >
                  {BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Component</FieldLabel>
                <select
                  value={form.component}
                  onChange={(e) => setValue('component', e.target.value)}
                  className="w-full bg-[#fbfaee] border border-[#becabc]/50 rounded px-3 py-2 text-sm outline-none focus:border-[#006d30]"
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
                  className="w-full bg-[#fbfaee] border border-[#becabc]/50 rounded px-3 py-2 text-sm outline-none focus:border-[#006d30]"
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
                  className="w-full bg-[#fbfaee] border border-[#becabc]/50 rounded px-3 py-2 text-sm outline-none focus:border-[#006d30]"
                />
              </div>
              <div>
                <FieldLabel>Collection Time</FieldLabel>
                <input
                  type="time"
                  value={form.collection_time}
                  onChange={(e) => setValue('collection_time', e.target.value)}
                  className="w-full bg-[#fbfaee] border border-[#becabc]/50 rounded px-3 py-2 text-sm outline-none focus:border-[#006d30]"
                />
              </div>
              <div>
                <FieldLabel>Expiry Date</FieldLabel>
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setValue('expiry_date', e.target.value)}
                  className="w-full bg-[#fbfaee] border border-[#becabc]/50 rounded px-3 py-2 text-sm outline-none focus:border-[#006d30]"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Notes</FieldLabel>
              <textarea
                value={form.notes}
                onChange={(e) => setValue('notes', e.target.value)}
                rows={3}
                className="w-full resize-none bg-[#fbfaee] border border-[#becabc]/50 rounded px-3 py-2 text-sm outline-none focus:border-[#006d30]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="soft-green-panel border border-[#becabc]/40 rounded overflow-hidden">
            <div className="px-5 py-4 border-b border-[#becabc]/25">
              <h3 className="font-headline font-bold text-[#1b1c15]">Screening</h3>
            </div>
            <div className="p-5 space-y-3">
              {([
                ['HIV 1&2', 'hiv'],
                ['HBsAg', 'hbsag'],
                ['HCV', 'hcv'],
                ['Malaria', 'malaria'],
                ['VDRL', 'vdrl'],
              ] as [string, keyof ManualForm][]).map(([label, key]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-[#3f493f]">{label}</span>
                  <select
                    value={form[key]}
                    onChange={(e) => setValue(key, e.target.value)}
                    className="bg-[#fbfaee] border border-[#becabc]/50 rounded px-3 py-1.5 text-sm outline-none focus:border-[#006d30]"
                  >
                    {SCREENING.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {savedUnitId && (
            <div className="bg-[#f1fff1] border border-[#006d30]/25 rounded p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-[#006d30]">check_circle</span>
              <div>
                <div className="text-sm font-bold text-[#005323]">Entry saved</div>
                <div className="mono-data text-[11px] text-[#6f7a6e] mt-1">{savedUnitId}</div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 rounded p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-[#93000a]">error</span>
              <div className="text-xs text-[#93000a]">{error}</div>
            </div>
          )}

          <div className="soft-green-panel border border-[#becabc]/40 rounded p-5 space-y-3">
            <button
              type="submit"
              disabled={saving || !ready}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#006d30] text-white px-5 py-3 text-sm font-bold rounded hover:bg-[#005323] active:scale-[0.99] transition-all disabled:opacity-40 disabled:active:scale-100"
            >
              <span className="material-symbols-outlined text-[18px]">{saving ? 'sync' : 'save'}</span>
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 border border-[#becabc] text-[#1b1c15] px-5 py-2.5 text-sm font-bold rounded hover:bg-[#f5f4e8] transition-all disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              Reset
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
