import CustomSelect from '../components/ui/CustomSelect'
import { appearanceOptions, type AppearanceKey } from '../components/appearance'
import { ThemeIntensityControl } from '../components/ThemeControls'
import { useTheme } from '../components/themeStore'

const controls: Array<{ key: AppearanceKey; label: string }> = [
  { key: 'accent', label: 'Accent color' },
  { key: 'scale', label: 'Interface size' },
  { key: 'spacing', label: 'Content spacing' },
  { key: 'corners', label: 'Corner shape' },
  { key: 'shadows', label: 'Shadows' },
  { key: 'motion', label: 'Motion' },
]

export default function SettingsPage() {
  const { mode, setMode, appearance, setAppearance, reset } = useTheme()

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="page-heading flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Appearance settings</h1>
          <p className="page-description">Changes apply across SpendWise and are saved in this browser.</p>
        </div>
        <button type="button" className="button-secondary" onClick={reset}>
          Reset to defaults
        </button>
      </header>

      <section className="surface-card space-y-4 p-5">
        <h2 className="text-base font-semibold">Theme</h2>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Color mode</legend>
          <div className="appearance-modes">
            {(['system', 'light', 'dark', 'manual'] as const).map((option) => (
              <label key={option}>
                <input
                  type="radio"
                  name="theme-mode"
                  value={option}
                  checked={mode === option}
                  onChange={() => setMode(option)}
                  className="sr-only"
                />
                <span className="capitalize">{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="max-w-sm border-t pt-4">
          <ThemeIntensityControl />
        </div>
      </section>

      <section className="surface-card space-y-4 p-5">
        <h2 className="text-base font-semibold">Interface</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {controls.map(({ key, label }) => (
            <div key={key} className="field-stack text-sm font-medium">
              <label htmlFor={`appearance-${key}`}>{label}</label>
              <CustomSelect
                id={`appearance-${key}`}
                className="w-full"
                value={appearance[key]}
                onChange={(event) => setAppearance(key, event.target.value)}
                aria-describedby={key === 'motion' ? 'appearance-motion-description' : undefined}
              >
                {appearanceOptions[key].map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </CustomSelect>
              {key === 'motion' && (
                <p id="appearance-motion-description" className="text-xs font-normal text-muted-foreground">
                  Controls animations and transitions across SpendWise.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
