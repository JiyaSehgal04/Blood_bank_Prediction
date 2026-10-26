import { createContext, useContext } from 'react'

export interface ToastApi {
  /** Green confirmation, e.g. toast.success('Saved'). */
  success: (title: string, detail?: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
