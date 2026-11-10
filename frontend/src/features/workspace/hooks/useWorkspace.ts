// ============================================================================
// useWorkspace.ts — small hooks shared by the Workspace components.
//
// useDebouncedValue: waits until the user stops typing before firing a search.
// useLocalStorage: keeps calculator history on this device without a backend.
// ============================================================================

import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)

    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debounced
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((previous: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initialValue
    } catch {
      // A broken or blocked localStorage must never crash the page.
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(stored))
    } catch {
      // Private mode or a full quota: keep the in-memory value and move on.
    }
  }, [key, stored])

  return [stored, setStored]
}
