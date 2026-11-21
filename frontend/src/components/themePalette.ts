import { accessibleColor, cssColor, hexToRgb, luminance, mix } from './themeColors.ts'

const routes = {
  home: '#0369a1', login: '#a21caf', register: '#0e7490', dashboard: '#4f46e5',
  transactions: '#1d4ed8', categories: '#c2410c', budgets: '#6d28d9', goals: '#047857',
  recurring: '#a16207', analytics: '#be185d', workspace: '#0f766e', profile: '#475569',
  settings: '#7e22ce', indigo: '#4338ca', blue: '#1d4ed8', teal: '#0f766e', rose: '#be185d',
}

export function buildPalette(value: number) {
  const intensity = (value - 1) / 99
  const ramp = (light: string, dark: string) => mix(hexToRgb(light), hexToRgb(dark), intensity)
  const background = ramp('#f6f8ff', '#090d16')
  const lightInk = luminance(background) < 0.179
  // Narrow the distance between surfaces where both text polarities need headroom.
  const separation = Math.min(1, Math.abs(luminance(background) - 0.179) / 0.14)
  const surface = (light: string, dark: string) => mix(background, ramp(light, dark), separation)
  const card = surface('#ffffff', '#171f30')
  const sidebar = surface('#ffffff', '#101726')
  const field = surface('#ffffff', '#111827')
  const muted = surface('#e9eef7', '#253147')
  const glow = (0.19 - intensity * 0.04) * separation
  const glowSurface = (hex: string) => {
    const accent = hexToRgb(hex)
    return background.map((channel, index) => channel + (accent[index] - channel) * glow) as typeof background
  }
  const screenSurfaces = [background, card, sidebar, field, muted, ...Object.values(routes).map(glowSurface)]
  const text = (preferred: string, minimum = 4.54) => accessibleColor(hexToRgb(preferred), screenSurfaces, minimum)
  const foreground = text(lightInk ? '#eff5ff' : '#172033')
  const secondary = text(lightInk ? '#aebdd1' : '#53627a')
  const boundary = text(lightInk ? '#8897ab' : '#718198', 3.04)
  const income = text('#218446')
  const expense = text('#c52d45')
  const warning = text('#986008')
  const accentColors = Object.fromEntries(Object.entries(routes).map(([name, hue]) => {
    const ink = text(hue)
    return [name, { ink, fillInk: accessibleColor(hexToRgb('#ffffff'), [ink], 4.54) }]
  }))
  const tokens = {
    background, card, sidebar, 'control-surface': field, muted, foreground,
    'muted-foreground': secondary, 'input': boundary, 'border-hover': boundary,
    border: surface('#dce4f1', '#39455e'),
    income, expense, warning,
    'chart-2': text('#cf6925', 3.04), 'chart-3': text('#168975', 3.04),
    'chart-4': text('#8453dc', 3.04), 'chart-5': text('#ba3e76', 3.04),
  }

  return { tokens, accentColors, lightInk, glow, intensity, screenSurfaces }
}

export function paletteProperties(palette: ReturnType<typeof buildPalette>) {
  const properties = Object.fromEntries(Object.entries(palette.tokens).map(([name, rgb]) => ['--' + name, cssColor(rgb)]))
  for (const [name, accent] of Object.entries(palette.accentColors)) {
    properties[`--accent-${name}`] = cssColor(accent.ink)
    properties[`--accent-ink-${name}`] = cssColor(accent.fillInk)
    properties[`--glow-${name}`] = routes[name as keyof typeof routes]
  }
  properties['--glow-strength'] = `${100 * palette.glow}%`
  properties['--shadow-depth'] = String(0.18 + palette.intensity * 0.35)
  properties['--overlay-scrim'] = `rgb(4 7 16 / ${0.32 + palette.intensity * 0.24})`
  return properties
}
