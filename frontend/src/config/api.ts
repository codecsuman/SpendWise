// Use an absolute origin so RTK Query can call different API routers,
// including CSV endpoints registered on the transaction API slice.
function originOf(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    return new URL(value).origin
  } catch {
    // A malformed VITE_API_URL must not stop the app from loading.
    return undefined
  }
}

export const API_URL =
  originOf(import.meta.env.VITE_API_URL?.trim())
  ?? (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin)
