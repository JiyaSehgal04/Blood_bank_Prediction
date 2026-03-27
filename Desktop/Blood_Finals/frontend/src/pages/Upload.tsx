import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'

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
}

export default function Upload() {
  const [history, setHistory] = useState<UploadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  const loadHistory = () => {
    api.get('/upload/history')
      .then((r) => setHistory(r.data.history ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(loadHistory, [])

  const handleFileChange = () => {
    setSelectedFile(fileRef.current?.files?.[0]?.name ?? '')
    setResult(null)
    setError('')
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Please select a file first'); return }
    setUploading(true)
    setResult(null)
    setError('')

    const fd = new FormData()
    fd.append('file', file)

    try {
      const r = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(r.data)
      setSelectedFile('')
      if (fileRef.current) fileRef.current.value = ''
      loadHistory()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error ?? 'Upload failed — check the server logs')
    } finally {
      setUploading(false)
    }
  }

  const handleBulkLoad = async () => {
    setUploading(true)
    setResult(null)
    setError('')
    try {
      const r = await api.post('/upload/bulk-load')
      setResult({
        inserted:   r.data.inserted   ?? 0,
        duplicates: r.data.duplicates ?? 0,
        flagged:    r.data.flagged    ?? 0,
        errors:     r.data.errors     ?? 0,
        message:    r.data.message,
        batch_id:   r.data.batch_id,
      })
      loadHistory()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error ?? 'Bulk load failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-[10px] font-mono text-[#006d30] uppercase tracking-[0.3em] mb-1">
          Data Ingestion
        </div>
        <h1 className="font-headline text-3xl font-extrabold text-[#1b1c15] tracking-tight">
          Upload & Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File upload */}
        <div className="bg-white border border-[#becabc]/30 rounded p-6">
          <h3 className="font-headline font-bold text-[#1b1c15] mb-1">File Upload</h3>
          <p className="text-xs text-[#6f7a6e] mb-5">
            Upload blood bank register files (.numbers, .xlsx, .csv).
            Duplicates are automatically skipped.
          </p>

          <form onSubmit={handleUpload} className="space-y-4">
            <div
              className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors ${
                selectedFile
                  ? 'border-[#006d30] bg-[#92f5a4]/10'
                  : 'border-[#becabc] hover:border-[#006d30]'
              }`}
              onClick={() => fileRef.current?.click()}
            >
              <span className={`material-symbols-outlined text-4xl mb-2 block ${selectedFile ? 'text-[#006d30]' : 'text-[#6f7a6e]'}`}>
                {selectedFile ? 'check_circle' : 'upload_file'}
              </span>
              <div className="text-sm font-medium text-[#1b1c15]">
                {selectedFile || 'Click to select file'}
              </div>
              <div className="text-xs text-[#6f7a6e] mt-1">.numbers · .xlsx · .csv</div>
              <input
                ref={fileRef}
                type="file"
                accept=".numbers,.xlsx,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Result banner */}
            {result && (
              <div className="bg-[#92f5a4]/20 border border-[#006d30]/20 rounded p-4">
                {result.message && (
                  <div className="text-sm font-medium text-[#005323] mb-3">{result.message}</div>
                )}
                {result.batch_id && (
                  <div className="mono-data text-[10px] text-[#6f7a6e] mb-3">
                    Batch: {result.batch_id}
                  </div>
                )}
                <div className="grid grid-cols-4 gap-3 text-center">
                  {([
                    ['Inserted',   result.inserted,   '#006d30'],
                    ['Duplicates', result.duplicates,  '#585756'],
                    ['Flagged',    result.flagged,     '#ba1a1a'],
                    ['Errors',     result.errors ?? 0, '#93000a'],
                  ] as [string, number, string][]).map(([label, val, color]) => (
                    <div key={label}>
                      <div className="mono-data text-2xl font-bold" style={{ color }}>{val}</div>
                      <div className="text-[10px] text-[#6f7a6e] uppercase tracking-wider mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 rounded p-3 text-xs text-[#93000a] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full bg-[#006d30] text-white py-3 text-sm font-bold rounded hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
            >
              {uploading ? 'Processing...' : 'Upload & Ingest'}
            </button>
          </form>
        </div>

        {/* Bulk load + system info */}
        <div className="space-y-4">
          <div className="bg-white border border-[#becabc]/30 rounded p-6">
            <h3 className="font-headline font-bold text-[#1b1c15] mb-1">Initial Bulk Load</h3>
            <p className="text-xs text-[#6f7a6e] mb-5">
              Load all records from{' '}
              <span className="mono-data text-[#3f493f]">cleaned_records.csv</span> into the
              database. Safe to re-run — duplicates are skipped.
            </p>
            <button
              onClick={handleBulkLoad}
              disabled={uploading}
              className="flex items-center gap-2 border border-[#1b1c15] text-[#1b1c15] px-5 py-2.5 text-sm font-bold rounded hover:bg-[#1b1c15] hover:text-white transition-all disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">storage</span>
              {uploading ? 'Loading...' : 'Run Bulk Load'}
            </button>
          </div>

          <div className="bg-white border border-[#becabc]/30 rounded p-6">
            <h3 className="font-headline font-bold text-[#1b1c15] mb-3">System Info</h3>
            <div className="space-y-2 text-xs">
              {([
                ['API Base',   'http://localhost:5001'],
                ['Auth',       'admin / bloodbank2026'],
                ['Database',   'Supabase PostgreSQL'],
                ['ML Models',  'SES · Isolation Forest · Random Forest'],
                ['Components', 'WB/PRC · FFP · PLT'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between items-start gap-4 py-1.5 border-b border-[#becabc]/20">
                  <span className="text-[#3f493f] font-medium shrink-0">{k}</span>
                  <span className="mono-data text-[#6f7a6e] text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Upload history */}
      <div className="bg-white border border-[#becabc]/30 rounded overflow-hidden">
        <div className="px-6 py-4 border-b border-[#becabc]/20 flex items-center justify-between">
          <h3 className="font-headline font-bold text-[#1b1c15]">Upload History</h3>
          <span className="mono-data text-xs text-[#6f7a6e]">{history.length} batches</span>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-[#6f7a6e] text-sm mono-data animate-pulse">
            Loading...
          </div>
        ) : history.length === 0 ? (
          <div className="px-6 py-8 text-center text-[#6f7a6e] text-sm">
            No uploads yet — run a bulk load or upload a file above
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f5f4e8]">
                {['Batch ID', 'Source', 'Filename', 'Total', 'Inserted', 'Dupes', 'Flagged', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-[#3f493f]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={h.id ?? i} className={`border-b border-[#becabc]/10 ${i % 2 === 0 ? 'bg-white' : 'bg-[#fbfaee]'}`}>
                  <td className="px-4 py-2 mono-data text-xs text-[#6f7a6e]" title={h.batch_id}>
                    {h.batch_id?.slice(0, 14)}…
                  </td>
                  <td className="px-4 py-2 mono-data text-xs text-[#3f493f]">{h.source}</td>
                  <td className="px-4 py-2 text-xs text-[#1b1c15] max-w-[160px] truncate" title={h.filename}>
                    {h.filename}
                  </td>
                  <td className="px-4 py-2 mono-data text-xs text-[#6f7a6e]">{h.total_rows ?? '—'}</td>
                  <td className="px-4 py-2 mono-data text-xs text-[#006d30] font-bold">{h.inserted}</td>
                  <td className="px-4 py-2 mono-data text-xs text-[#585756]">{h.duplicates}</td>
                  <td className="px-4 py-2 mono-data text-xs text-[#ba1a1a]">{h.flagged}</td>
                  <td className="px-4 py-2 mono-data text-xs text-[#6f7a6e]">
                    {(h.uploaded_at ?? '').slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
