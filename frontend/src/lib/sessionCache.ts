type ApiClient = { get: (url: string) => Promise<{ data: unknown }> }

export async function prefetchAllCaches(apiClient: ApiClient): Promise<void> {
  const now = new Date().toLocaleTimeString()

  const fetches: Array<() => Promise<void>> = [
    async () => {
      const { data } = await apiClient.get('/dashboard/stats')
      writeCache('blood_bank_dashboard_stats_cache', data)
      writeCache('blood_bank_dashboard_stats_updated_at', now)
    },
    async () => {
      const { data } = await apiClient.get('/inventory')
      writeCache('blood_bank_inventory_cache:', data)
      writeCache('blood_bank_inventory_updated_at:', now)
    },
    async () => {
      const { data } = await apiClient.get('/donors')
      writeCache('blood_bank_donors_cache:', data)
    },
    async () => {
      const { data } = await apiClient.get('/alerts')
      writeCache('blood_bank_alerts_cache', data)
    },
    async () => {
      const { data } = await apiClient.get('/predictions')
      writeCache('blood_bank_predictions_cache', data)
    },
    async () => {
      const { data } = await apiClient.get('/replenishment')
      writeCache('blood_bank_replenishment_cache', data)
    },
    async () => {
      const { data } = await apiClient.get('/allocations')
      writeCache('blood_bank_allocations_cache', data)
    },
    async () => {
      const { data } = await apiClient.get('/upload/history')
      writeCache('blood_bank_upload_history_cache', data)
    },
  ]

  await Promise.allSettled(fetches.map((f) => f()))
}

export function readCache<T>(key: string, fallback: T): T {
  try {
    const cached = sessionStorage.getItem(key)
    return cached ? JSON.parse(cached) as T : fallback
  } catch {
    return fallback
  }
}

export function writeCache<T>(key: string, value: T) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Cache is a convenience only; ignore quota or private-mode failures.
  }
}

const DATA_CACHE_PREFIXES = [
  'blood_bank_dashboard_stats_cache',
  'blood_bank_dashboard_stats_updated_at',
  'blood_bank_predictions_cache',
  'blood_bank_replenishment_cache',
  'blood_bank_inventory_cache',
  'blood_bank_inventory_updated_at',
  'blood_bank_allocations_cache',
  'blood_bank_donors_cache',
  'blood_bank_alerts_cache',
  'blood_bank_upload_history_cache',
]

export const DATA_CACHE_INVALIDATED_EVENT = 'blood-bank-data-cache-invalidated'

export function removeCache(key: string) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // Cache removal is best-effort.
  }
}

export function invalidateDataCaches() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i)
      if (key && DATA_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        sessionStorage.removeItem(key)
      }
    }
    sessionStorage.setItem('blood_bank_data_cache_invalidated_at', String(Date.now()))
  } catch {
    // Cache invalidation should never block the upload flow.
  }

  window.dispatchEvent(new Event(DATA_CACHE_INVALIDATED_EVENT))
}
