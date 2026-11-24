export function getAuthError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string; errors?: string } }).data
    if (typeof data?.errors === 'string') return data.errors
    if (typeof data?.message === 'string') return data.message
  }
  return fallback
}
