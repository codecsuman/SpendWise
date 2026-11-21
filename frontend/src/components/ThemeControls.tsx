import { Minus, Moon, Plus, SlidersHorizontal, Sun } from 'lucide-react'
import { useId } from 'react'
import { useTheme } from './themeStore'

export function ThemeIntensityControl() {
  const { tone, setTone } = useTheme()
  const id = useId()
  const maxTone = 100
  const description = `${tone} of ${maxTone}`

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold">Light to dark</label>
      <div className="tone-control">
        <button
          type="button"
          aria-label="Make appearance lighter"
          disabled={tone === 1}
          onClick={() => setTone(tone - 1)}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <input
          id={id}
          type="range"
          min={1}
          max={maxTone}
          value={tone}
          aria-valuetext={description}
          onChange={(event) => setTone(event.target.valueAsNumber)}
        />
        <button
          type="button"
          aria-label="Make appearance darker"
          disabled={tone === maxTone}
          onClick={() => setTone(tone + 1)}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Sun className="size-3" aria-hidden="true" /> Brightness {101 - tone}%</span>
        <output htmlFor={id}>{description}</output>
      </div>
    </div>
  )
}

export function ThemeToggle() {
  const { tone, setMode } = useTheme()
  const dark = tone === 100

  return (
    <div className="relative flex shrink-0 items-center gap-2">
      <button type="button" role="switch" aria-checked={dark} aria-label="Dark mode"
        onClick={() => setMode(dark ? 'light' : 'dark')} className="appearance-switch">
        <Sun className="size-4" aria-hidden="true" />
        <Moon className="size-4" aria-hidden="true" />
      </button>
      <details>
        <summary className="button-secondary theme-intensity-trigger list-none cursor-pointer [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          <span className="sr-only">Theme intensity</span>
        </summary>
        <div className="theme-intensity-panel">
          <ThemeIntensityControl />
        </div>
      </details>
    </div>
  )
}
