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
