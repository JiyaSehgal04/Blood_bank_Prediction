import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ToastContext } from './toast'
import type { ToastApi } from './toast'

interface ToastItem {
  id: number
  title: string
  detail?: string
}

const TOAST_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = useCallback(
    (title: string, detail?: string) => {
      const id = nextId.current++
      setToasts((prev) => [...prev.slice(-2), { id, title, detail }])
      window.setTimeout(() => dismiss(id), TOAST_MS)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(() => ({ success }), [success])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-5 top-20 z-[60] flex w-[min(92vw,22rem)] flex-col gap-3"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="toast-in pointer-events-auto flex items-start gap-3 rounded-md border-2 border-[#1e7a3e] bg-[#e7f6ec] px-4 py-3 shadow-xl"
          >
            <span
              className="material-symbols-outlined shrink-0 text-[#1e7a3e]"
              style={{ fontSize: 26, fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold text-[#0d4a22]">{t.title}</div>
              {t.detail && <div className="mt-0.5 break-words text-[13px] font-medium text-[#14532d]">{t.detail}</div>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#14532d] hover:bg-[#1e7a3e]/15"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
