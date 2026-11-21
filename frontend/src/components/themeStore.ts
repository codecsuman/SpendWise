import { useSyncExternalStore } from 'react'
import { defaultAppearance, isAppearanceValue, type AppearanceKey, type AppearancePreferences, type ThemeMode } from './appearance'
import { buildPalette, paletteProperties } from './themePalette'

const key = 'spendwise-theme-v2'
const legacyKey = 'spendwise-theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')
const root = document.documentElement
const listeners = new Set<() => void>()
const paletteCache = new Map<number, ReturnType<typeof buildPalette>>()
const validTone = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 100

function read(name: string) {
  try { return localStorage.getItem(name) } catch { return null }
}

function parse(value: string | null): Record<string, unknown> {
  try {
    const data = JSON.parse(value ?? '{}')
    return data && typeof data === 'object' ? data : {}
  } catch { return {} }
}

function preferences(value: unknown): AppearancePreferences {
  const result = { ...defaultAppearance }
  if (!value || typeof value !== 'object') return result
  for (const key of Object.keys(result) as AppearanceKey[]) {
    const option = (value as Record<string, unknown>)[key]
    if (isAppearanceValue(key, option)) Object.assign(result, { [key]: option })
  }
  return result
}

function legacyLevel(mode: 'light' | 'dark') {
  const level = Number(read(`${legacyKey}-${mode}-level`))
  if (Number.isInteger(level) && level >= 1 && level <= 50) return level
  const intensity = Number(read(`${legacyKey}-${mode}-intensity`))
  return Number.isInteger(intensity) && intensity >= 1 && intensity <= 5
    ? Math.round(1 + (intensity - 1) * 49 / 4) : null
}

function load() {
  const saved = read(key)
  if (saved !== null) {
    const data = parse(saved)
    const mode = data.mode === 'light' || data.mode === 'dark' || data.mode === 'manual' ? data.mode : 'system'
    return { mode, manual: validTone(data.manual) ? data.manual : 1, appearance: preferences(data.appearance) } as const
  }
  const previous = read(legacyKey)
  const mode = previous === 'light' || previous === 'dark' ? previous : 'system'
  const recovered = mode === 'system' ? null : legacyLevel(mode)
  return {
    mode: (recovered === null ? mode : 'manual') as ThemeMode,
    manual: recovered === null ? 1 : mode === 'light' ? 51 - recovered : 50 + recovered,
    appearance: preferences(parse(read('spendwise-appearance'))),
  }
}

let saved = load()
let snapshot = resolve()
let appliedTone: number | undefined
let transitionTimer: number | undefined
let appliedAppearance: AppearancePreferences | undefined

function resolve() {
  const { mode, manual, appearance } = saved
  const tone = mode === 'manual' ? manual : mode === 'dark' || (mode === 'system' && media.matches) ? 100 : 1
  return { mode, tone, appearance }
}

function apply() {
  if (appliedTone !== snapshot.tone) {
    let palette = paletteCache.get(snapshot.tone)
    if (!palette) {
      palette = buildPalette(snapshot.tone)
      paletteCache.set(snapshot.tone, palette)
    }
    if (appliedTone !== undefined) {
      root.dataset.themeChanging = ''
      window.clearTimeout(transitionTimer)
      transitionTimer = window.setTimeout(() => delete root.dataset.themeChanging, 180)
    }
    for (const [name, value] of Object.entries(paletteProperties(palette))) root.style.setProperty(name, value)
    // Native controls use this hint. Shared colors come exclusively from the palette.
    root.style.colorScheme = palette.lightInk ? 'dark' : 'light'
    root.dataset.glowMotion = palette.glow < 0.14 ? 'instant' : 'smooth'
    appliedTone = snapshot.tone
  }
  if (appliedAppearance !== snapshot.appearance) {
    for (const [name, value] of Object.entries(snapshot.appearance)) root.setAttribute(`data-appearance-${name}`, value)
    appliedAppearance = snapshot.appearance
  }
}

function update() {
  snapshot = resolve()
  apply()
  listeners.forEach((listener) => listener())
}

function save() {
  try { localStorage.setItem(key, JSON.stringify(saved)) } catch { /* Keep the in-memory choices. */ }
  update()
}

export const themeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
  getSnapshot: () => snapshot,
  setMode(mode: ThemeMode) {
    saved = { ...saved, mode }
    save()
  },
  setTone(value: number) {
    if (!Number.isFinite(value)) return
    saved = { ...saved, mode: 'manual', manual: Math.max(1, Math.min(100, Math.round(value))) }
    save()
  },
  setAppearance(name: AppearanceKey, value: string) {
    if (!isAppearanceValue(name, value)) return
    saved = { ...saved, appearance: { ...saved.appearance, [name]: value } }
    save()
  },
  reset() {
    saved = { mode: 'system', manual: 1, appearance: { ...defaultAppearance } }
    try {
      for (const name of [legacyKey, 'spendwise-appearance',
        ...['light', 'dark'].flatMap((mode) => [`${legacyKey}-${mode}-level`, `${legacyKey}-${mode}-intensity`]), key]) {
        localStorage.removeItem(name)
      }
    } catch { /* The current tab still resets. */ }
    update()
  },
}

function syncSystemAppearance() {
  if (saved.mode === 'system' && resolve().tone !== snapshot.tone) update()
}

media.addEventListener('change', syncSystemAppearance)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') syncSystemAppearance()
})
window.addEventListener('storage', (event) => {
  if (event.key === key || event.key === null) {
    saved = load()
    update()
  }
})
apply()

export function useTheme() {
  return { ...useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot), ...themeStore }
}
