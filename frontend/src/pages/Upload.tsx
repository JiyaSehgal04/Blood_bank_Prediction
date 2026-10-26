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
  if (label === 'Inserted') return '#6B4A98'
  if (label === 'Flagged') return '#ba1a1a'
  if (label === 'Errors') return '#93000a'
  return '#4a4466'
}

export default function Upload() {
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
          <div className="text-[10px] font-mono text-[#6B4A98] uppercase tracking-[0.3em] mb-1">
            Data Ingestion
          </div>
          <h1 className="font-headline text-3xl font-extrabold text-[#2e2157] tracking-tight">
            Upload Register
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['Batches', history.length],
            ['Loaded', importedTotal],
            ['Latest', latestBatch?.uploaded_at ? latestBatch.uploaded_at.slice(0, 10) : 'None'],
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-[#d9d0ea]/50 bg-white px-3 py-2 min-w-[92px]">
              <div className="text-[10px] uppercase tracking-wider text-[#6b6680]">{label}</div>
              <div className="mono-data text-sm font-bold text-[#2e2157]">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] gap-6">
        <div className="soft-green-panel border border-[#d9d0ea]/40 rounded overflow-hidden">
          <div className="px-6 py-5 border-b border-[#d9d0ea]/25 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-headline font-bold text-[#2e2157]">Excel to Database</h3>
              <p className="text-xs text-[#6b6680] mt-1">Accepted formats: .xlsx and .csv</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs mono-data text-[#6B4A98]">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Duplicate-safe
            </div>
          </div>

          <form onSubmit={handleUpload} className="p-6 space-y-5">
            <div
              className={`relative border-2 border-dashed rounded min-h-[240px] flex flex-col items-center justify-center text-center px-6 transition-all ${
                dragActive
                  ? 'border-[#6B4A98] bg-[#d9cfee]/15'
                  : selectedFile
                    ? 'border-[#6B4A98] bg-[#f6f2fc]'
                    : 'border-[#d9d0ea] bg-[#f9f6fd] hover:border-[#6B4A98]'
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
                selectedFile ? 'bg-[#6B4A98] text-white' : 'bg-white border border-[#d9d0ea]/60 text-[#6B4A98]'
              }`}>
                <span className="material-symbols-outlined text-[30px]">
                  {selectedFile ? 'description' : 'upload_file'}
                </span>
              </div>
              <div className="font-headline text-lg font-bold text-[#2e2157]">
                {selectedFile ? selectedFile.name : 'Drop Excel file here'}
              </div>
              <div className="text-xs text-[#6b6680] mt-2">
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
              <div className="flex items-center justify-between gap-3 rounded border border-[#d9d0ea]/40 bg-[#f3effa] px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#2e2157] truncate">{selectedFile.name}</div>
                  <div className="text-xs text-[#6b6680] mono-data">{formatBytes(selectedFile.size)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => chooseFile(undefined)}
                  className="h-9 w-9 rounded border border-[#d9d0ea] text-[#4a4466] hover:bg-white transition-colors"
                  aria-label="Remove selected file"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )}

            {result && (
              <div className="border border-[#6B4A98]/25 bg-[#f6f2fc] rounded p-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-sm font-bold text-[#492880]">{result.message ?? 'Load complete'}</div>
                    {result.batch_id && (
                      <div className="mono-data text-[10px] text-[#6b6680] mt-1">Batch {result.batch_id}</div>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-[#6B4A98]">check_circle</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {resultMetrics.map(([label, value]) => (
                    <div key={label} className="bg-white border border-[#d9d0ea]/35 rounded px-3 py-3">
                      <div className="mono-data text-xl font-bold" style={{ color: metricColor(label) }}>
                        {value}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-[#6b6680]">{label}</div>
                    </div>
                  ))}
                </div>
                {result.warnings && result.warnings.length > 0 && (
                  <div className="mt-3 rounded border border-[#ba1a1a]/20 bg-[#fff4f2] p-3 text-xs text-[#93000a]">
                    <div className="font-bold mb-1">Loaded, but follow-up processing needs attention</div>
                    {result.warnings.map((warning, index) => (
                      <div key={index}>{warning}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 rounded p-3 text-xs text-[#93000a] flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#6B4A98] text-white px-5 py-3 text-sm font-bold rounded hover:bg-[#492880] active:scale-[0.99] transition-all disabled:opacity-40 disabled:active:scale-100"
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
          <div className="soft-green-panel border border-[#d9d0ea]/40 rounded p-5">
            <h3 className="font-headline font-bold text-[#2e2157] mb-4">Pipeline</h3>
            <div className="space-y-3">
              {[
                ['upload_file', 'Read file', selectedFile ? 'Ready' : 'Waiting'],
                ['rule', 'Clean rows', result ? `${result.flagged} flagged` : 'Automatic'],
                ['database', 'Insert records', result ? `${result.inserted} inserted` : 'Duplicate-safe'],
                ['monitoring', 'Refresh models', result?.predictions_generated != null ? `${result.predictions_generated} predictions` : 'After load'],
              ].map(([icon, label, value], index) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded flex items-center justify-center border ${
                    result || index === 0 ? 'border-[#6B4A98]/30 text-[#6B4A98] bg-[#d9cfee]/15' : 'border-[#d9d0ea]/50 text-[#6b6680] bg-[#f9f6fd]'
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-[#2e2157]">{label}</div>
                    <div className="text-xs text-[#6b6680]">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="soft-green-panel border border-[#d9d0ea]/40 rounded p-5">
            <h3 className="font-headline font-bold text-[#2e2157] mb-3">System Info</h3>
            <div className="space-y-2 text-xs">
              {([
                ['API Base', 'http://localhost:5001'],
                ['Database', 'Supabase PostgreSQL'],
                ['Dedup Key', 'S.No + Segment + Component'],
                ['Formats', '.xlsx · .csv'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between items-start gap-4 py-1.5 border-b border-[#d9d0ea]/20 last:border-b-0">
                  <span className="text-[#4a4466] font-medium shrink-0">{k}</span>
                  <span className="mono-data text-[#6b6680] text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="soft-green-panel border border-[#d9d0ea]/40 rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-[#d9d0ea]/20 flex items-center justify-between">
          <h3 className="font-headline font-bold text-[#2e2157]">Upload History</h3>
          <span className="mono-data text-xs text-[#6b6680]">{history.length} batches</span>
        </div>
        {loading ? (
          <div className="px-4 py-6 text-center text-[#6b6680] text-sm mono-data animate-pulse">
            Loading...
          </div>
        ) : history.length === 0 ? (
          <div className="px-4 py-6 text-center text-[#6b6680] text-sm">
            No upload batches yet
          </div>
        ) : (
          <div className="max-h-[280px] overflow-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#f3effa]">
                  {['Batch ID', 'Source', 'Filename', 'Total', 'Inserted', 'Dupes', 'Flagged', 'Errors', 'Date'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-[#4a4466] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={h.id ?? i} className={`border-b border-[#d9d0ea]/10 ${i % 2 === 0 ? 'bg-white' : 'bg-[#f9f6fd]'}`}>
                    <td className="px-3 py-1.5 mono-data text-[11px] text-[#6b6680] whitespace-nowrap" title={h.batch_id}>
                      {h.batch_id?.slice(0, 16)}...
                    </td>
                    <td className="px-3 py-1.5 mono-data text-[11px] text-[#4a4466] whitespace-nowrap">{h.source}</td>
                    <td className="px-3 py-1.5 text-xs text-[#2e2157] max-w-[180px] truncate" title={h.filename}>
                      {h.filename}
                    </td>
                    <td className="px-3 py-1.5 mono-data text-[11px] text-[#6b6680]">{h.total_rows ?? '-'}</td>
                    <td className="px-3 py-1.5 mono-data text-[11px] text-[#6B4A98] font-bold">{h.inserted}</td>
                    <td className="px-3 py-1.5 mono-data text-[11px] text-[#5b5470]">{h.duplicates}</td>
                    <td className="px-3 py-1.5 mono-data text-[11px] text-[#ba1a1a]">{h.flagged}</td>
                    <td className="px-3 py-1.5 mono-data text-[11px] text-[#93000a]">{h.errors ?? 0}</td>
                    <td className="px-3 py-1.5 mono-data text-[11px] text-[#6b6680] whitespace-nowrap">
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
