import { useToast } from '../context/toast'
import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../lib/api'
import { invalidateDataCaches, prefetchAllCaches, readCache, writeCache } from '../lib/sessionCache'

interface UploadRecord {
  id: string
  batch_id: string
  source: string
  filename: string
  inserted: number
  duplicates: number
  flagged: number
  errors: number
  total_rows: number
  uploaded_at: string
}

interface UploadResult {
  inserted: number
  duplicates: number
  flagged: number
  errors?: number
  message?: string
  batch_id?: string
  total_rows?: number
  summary_rows_upserted?: number
  predictions_generated?: number
  warnings?: string[]
}

type BusyAction = 'upload' | null
const UPLOAD_HISTORY_CACHE_KEY = 'blood_bank_upload_history_cache'

const ACCEPTED_EXTENSIONS = ['.xlsx', '.csv']

function isAcceptedFile(file: File) {
  const name = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function metricColor(label: string) {
  if (label === 'Inserted') return '#13294b'
  if (label === 'Flagged') return '#7a0909'
  if (label === 'Errors') return '#4a0005'
  return '#2a3246'
}

export default function Upload() {
  const toast = useToast()
  const [history, setHistory] = useState<UploadRecord[]>(() => (
    readCache<UploadRecord[]>(UPLOAD_HISTORY_CACHE_KEY, [])
  ))
  const [loading, setLoading] = useState(() => (
    readCache<UploadRecord[]>(UPLOAD_HISTORY_CACHE_KEY, []).length === 0
  ))
  const [busyAction, setBusyAction] = useState<BusyAction>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const uploading = busyAction !== null

  const loadHistory = (blocking = history.length === 0) => {
    if (blocking) setLoading(true)
    api.get('/upload/history')
      .then((r) => {
        const nextHistory = r.data.history ?? []
        setHistory(nextHistory)
        writeCache(UPLOAD_HISTORY_CACHE_KEY, nextHistory)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    intervalRef.current = setInterval(() => loadHistory(false), 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [history.length])

  const latestBatch = history[0]
  const importedTotal = useMemo(
    () => history.reduce((sum, row) => sum + (row.inserted ?? 0), 0),
    [history],
  )

  const chooseFile = (file?: File) => {
    setResult(null)
    setError('')
    if (!file) {
      setSelectedFile(null)
      return
    }
    if (!isAcceptedFile(file)) {
      setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setError('Upload an Excel .xlsx file or a .csv export.')
      return
    }
    setSelectedFile(file)
  }

  const handleFileChange = () => {
    chooseFile(fileRef.current?.files?.[0])
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    chooseFile(e.dataTransfer.files?.[0])
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setError('Select an Excel .xlsx file or CSV export first.')
      return
    }

    setBusyAction('upload')
    setResult(null)
    setError('')

    const fd = new FormData()
    fd.append('file', selectedFile)

    try {
      const r = await api.post('/upload', fd)
      invalidateDataCaches()
      prefetchAllCaches(api)
      setResult(r.data)
      toast.success('Saved', `${r.data.inserted ?? 0} record${r.data.inserted === 1 ? '' : 's'} loaded to the database`)
      setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
      loadHistory(true)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error ?? 'Upload failed. Check that the sheet headers match the register format.')
    } finally {
      setBusyAction(null)
    }
  }

  const resultMetrics = result
    ? ([
        ['Rows', result.total_rows ?? 0],
        ['Inserted', result.inserted],
        ['Duplicates', result.duplicates],
        ['Flagged', result.flagged],
        ['Errors', result.errors ?? 0],
        ['Summary', result.summary_rows_upserted ?? 0],
        ['Forecasts', result.predictions_generated ?? 0],
      ] as [string, number][])
    : []

  return (
    <div className="green-stroke-bg space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] font-mono text-[#13294b] uppercase tracking-[0.3em] mb-1">
            Data Ingestion
          </div>
          <h1 className="font-headline text-3xl font-extrabold text-[#1b1c15] tracking-tight">
            Upload Register
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['Batches', history.length],
            ['Loaded', importedTotal],
            ['Latest', latestBatch?.uploaded_at ? latestBatch.uploaded_at.slice(0, 10) : 'None'],
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-[#13294b]/50 bg-white px-3 py-2 min-w-[92px]">
              <div className="text-[11px] uppercase tracking-wider text-[#4b5468]">{label}</div>
              <div className="mono-data text-sm font-bold text-[#1b1c15]">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] gap-6">
        <div className="soft-green-panel border border-[#13294b]/50 rounded overflow-hidden">
          <div className="px-6 py-4 bg-[#13294b] flex items-center justify-between gap-4">
            <div>
              <h3 className="font-headline text-lg font-bold text-white">Excel to Database</h3>
              <p className="text-xs text-white/85 mt-0.5">Accepted formats: .xlsx and .csv</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs mono-data text-white">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Duplicate-safe
            </div>
          </div>

          <form onSubmit={handleUpload} className="p-6 space-y-5">
            <div
              className={`relative border-2 border-dashed rounded min-h-[240px] flex flex-col items-center justify-center text-center px-6 transition-all ${
                dragActive
                  ? 'border-[#13294b] bg-[#c5d5ee]/15'
                  : selectedFile
                    ? 'border-[#13294b] bg-[#eef3fb]'
                    : 'border-[#13294b]/60 bg-[#ffffff] hover:border-[#13294b]'
              }`}
              onClick={() => fileRef.current?.click()}
              onDragEnter={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false) }}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click()
              }}
            >
              <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-4 ${
                selectedFile ? 'bg-[#13294b] text-white' : 'bg-white border border-[#13294b]/50 text-[#13294b]'
              }`}>
                <span className="material-symbols-outlined text-[30px]">
                  {selectedFile ? 'description' : 'upload_file'}
                </span>
              </div>
              <div className="font-headline text-lg font-bold text-[#1b1c15]">
                {selectedFile ? selectedFile.name : 'Drop Excel file here'}
              </div>
              <div className="text-xs text-[#4b5468] mt-2">
                {selectedFile ? formatBytes(selectedFile.size) : 'or browse from your computer'}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between gap-3 rounded border border-[#13294b]/50 bg-[#fafafb] px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#1b1c15] truncate">{selectedFile.name}</div>
                  <div className="text-xs text-[#4b5468] mono-data">{formatBytes(selectedFile.size)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => chooseFile(undefined)}
                  className="h-9 w-9 rounded border border-[#13294b]/60 text-[#2a3246] hover:bg-white transition-colors"
                  aria-label="Remove selected file"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )}

            {result && (
              <div className="border border-[#13294b]/25 bg-[#eef3fb] rounded p-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-sm font-bold text-[#0b1b36]">{result.message ?? 'Load complete'}</div>
                    {result.batch_id && (
                      <div className="mono-data text-[11px] text-[#4b5468] mt-1">Batch {result.batch_id}</div>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-[#13294b]">check_circle</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {resultMetrics.map(([label, value]) => (
                    <div key={label} className="bg-white border border-[#13294b]/50 rounded px-3 py-3">
                      <div className="mono-data text-xl font-bold" style={{ color: metricColor(label) }}>
                        {value}
                      </div>
                      <div className="text-[11px] uppercase tracking-wider text-[#4b5468]">{label}</div>
                    </div>
                  ))}
                </div>
                {result.warnings && result.warnings.length > 0 && (
                  <div className="mt-3 rounded border border-[#7a0909]/20 bg-[#fff4f2] p-3 text-xs text-[#4a0005]">
                    <div className="font-bold mb-1">Loaded, but follow-up processing needs attention</div>
                    {result.warnings.map((warning, index) => (
                      <div key={index}>{warning}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-[#e8a099] border border-[#7a0909]/20 rounded p-3 text-xs text-[#4a0005] flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#13294b] text-white px-5 py-3 text-sm font-bold rounded hover:bg-[#0b1b36] active:scale-[0.99] transition-all disabled:opacity-40 disabled:active:scale-100"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {busyAction === 'upload' ? 'sync' : 'database_upload'}
                </span>
                {busyAction === 'upload' ? 'Loading to Database...' : 'Load to Database'}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="soft-green-panel border border-[#13294b]/50 rounded overflow-hidden">
            <div className="px-5 py-3.5 bg-[#13294b]">
              <h3 className="font-headline text-lg font-bold text-white">Pipeline</h3>
            </div>
            <div className="space-y-3 p-5">
              {[
                ['upload_file', 'Read file', selectedFile ? 'Ready' : 'Waiting'],
                ['rule', 'Clean rows', result ? `${result.flagged} flagged` : 'Automatic'],
                ['database', 'Insert records', result ? `${result.inserted} inserted` : 'Duplicate-safe'],
                ['monitoring', 'Refresh models', result?.predictions_generated != null ? `${result.predictions_generated} predictions` : 'After load'],
              ].map(([icon, label, value], index) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded flex items-center justify-center border ${
                    result || index === 0 ? 'border-[#13294b]/30 text-[#13294b] bg-[#c5d5ee]/15' : 'border-[#13294b]/50 text-[#4b5468] bg-[#ffffff]'
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-[#1b1c15]">{label}</div>
                    <div className="text-xs text-[#4b5468]">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="soft-green-panel border border-[#13294b]/50 rounded overflow-hidden">
            <div className="px-5 py-3.5 bg-[#13294b]">
              <h3 className="font-headline text-lg font-bold text-white">System Info</h3>
            </div>
            <div className="space-y-2 p-5 text-xs">
              {([
                ['API Base', 'http://localhost:5001'],
                ['Database', 'Supabase PostgreSQL'],
                ['Dedup Key', 'S.No + Segment + Component'],
                ['Formats', '.xlsx · .csv'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between items-start gap-4 py-1.5 border-b border-[#13294b]/20 last:border-b-0">
                  <span className="text-[#2a3246] font-medium shrink-0">{k}</span>
                  <span className="mono-data text-[#4b5468] text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="soft-green-panel border border-[#13294b]/50 rounded overflow-hidden">
        <div className="px-5 py-3.5 bg-[#13294b] flex items-center justify-between">
          <h3 className="font-headline text-lg font-bold text-white">Upload History</h3>
          <span className="mono-data text-xs font-semibold text-white/85">{history.length} batches</span>
        </div>
        {loading ? (
          <div className="px-4 py-6 text-center text-[#4b5468] text-sm mono-data animate-pulse">
            Loading...
          </div>
        ) : history.length === 0 ? (
          <div className="px-4 py-6 text-center text-[#4b5468] text-sm">
            No upload batches yet
          </div>
        ) : (
          <div className="max-h-[280px] overflow-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#1f3d73]">
                  {['Batch ID', 'Source', 'Filename', 'Total', 'Inserted', 'Dupes', 'Flagged', 'Errors', 'Date'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-mono font-bold uppercase tracking-wider text-white whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={h.id ?? i} className={`border-b border-[#13294b]/20 ${i % 2 === 0 ? 'bg-white' : 'bg-[#e9eff8]'}`}>
                    <td className="px-3 py-1.5 mono-data text-[11px] text-[#4b5468] whitespace-nowrap" title={h.batch_id}>
                      {h.batch_id?.slice(0, 16)}...
                    </td>
                    <td className="px-3 py-1.5 mono-data text-[11px] text-[#2a3246] whitespace-nowrap">{h.source}</td>
                    <td className="px-3 py-1.5 text-xs text-[#1b1c15] max-w-[180px] truncate" title={h.filename}>
                      {h.filename}
                    </td>
                    <td className="px-3 py-1.5 mono-data text-[11px] text-[#4b5468]">{h.total_rows ?? '-'}</td>
                    <td className="px-3 py-1.5 mono-data text-[11px] text-[#13294b] font-bold">{h.inserted}</td>
                    <td className="px-3 py-1.5 mono-data text-[11px] text-[#585756]">{h.duplicates}</td>
                    <td className="px-3 py-1.5 mono-data text-[11px] text-[#7a0909]">{h.flagged}</td>
                    <td className="px-3 py-1.5 mono-data text-[11px] text-[#4a0005]">{h.errors ?? 0}</td>
                    <td className="px-3 py-1.5 mono-data text-[11px] text-[#4b5468] whitespace-nowrap">
                      {(h.uploaded_at ?? '').slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
