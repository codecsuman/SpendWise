export type ThemeMode = 'light' | 'dark' | 'system' | 'manual'

export const appearanceOptions = {
  accent: [
    { value: 'page', label: 'Different color on each page' },
    { value: 'indigo', label: 'Indigo' },
    { value: 'blue', label: 'Blue' },
    { value: 'teal', label: 'Teal' },
    { value: 'rose', label: 'Rose' },
  ],
  scale: [
    { value: 'default', label: 'Default' },
    { value: 'small', label: 'Smaller' },
    { value: 'large', label: 'Larger' },
  ],
  spacing: [
    { value: 'default', label: 'Default' },
    { value: 'compact', label: 'Compact' },
    { value: 'relaxed', label: 'Spacious' },
  ],
  corners: [
    { value: 'default', label: 'Default' },
    { value: 'sharp', label: 'Sharper' },
    { value: 'round', label: 'Rounder' },
  ],
  shadows: [
    { value: 'default', label: 'Default' },
    { value: 'off', label: 'Off' },
    { value: 'soft', label: 'Soft' },
    { value: 'strong', label: 'Strong' },
  ],
  motion: [
    { value: 'system', label: 'Use device setting' },
    { value: 'reduced', label: 'Reduce motion' },
  ],
} as const

export type AppearanceKey = keyof typeof appearanceOptions
export type AppearancePreferences = {
  [Key in AppearanceKey]: (typeof appearanceOptions)[Key][number]['value']
}

export const defaultAppearance: AppearancePreferences = {
  accent: 'page',
  scale: 'default',
  spacing: 'default',
  corners: 'default',
  shadows: 'default',
  motion: 'system',
}

export function isAppearanceValue<Key extends AppearanceKey>(
  key: Key,
  value: unknown,
): value is AppearancePreferences[Key] {
  return appearanceOptions[key].some((option) => option.value === value)
}
