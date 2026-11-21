import { Loader2 } from 'lucide-react'

// Small placeholder shown while a lazily-loaded page chunk downloads.
// It keeps the shell (sidebar + navbar) visible instead of blanking the screen.
export default function PageLoader() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      Loading…
    </div>
  )
}
