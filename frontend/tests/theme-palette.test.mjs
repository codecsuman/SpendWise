import assert from 'node:assert/strict'
import { test } from 'node:test'
import { contrast, luminance } from '../src/components/themeColors.ts'
import { buildPalette } from '../src/components/themePalette.ts'

test('all steps are distinct and readable in either direction', () => {
  const range = Array.from({ length: 100 }, (_, index) => index + 1)
  for (const direction of [range, [...range].reverse()]) {
    let last
    for (const value of direction) {
      const { tokens, screenSurfaces, accentColors } = buildPalette(value)
      if (last) {
        const difference = Math.abs(luminance(tokens.background) - luminance(last))
        assert.ok(difference > 0 && difference < 0.03, `background step at ${value}`)
      }
      last = tokens.background
      for (const surface of screenSurfaces) {
        for (const name of ['foreground', 'muted-foreground', 'income', 'expense', 'warning']) {
          const ratio = contrast(tokens[name], surface)
          assert.ok(ratio >= 4.5, `${name} at ${value}: ${ratio.toFixed(3)}`)
        }
        for (const name of ['input', 'border-hover', 'chart-2', 'chart-3', 'chart-4', 'chart-5']) {
          assert.ok(contrast(tokens[name], surface) >= 3, `${name} at ${value}`)
        }
        for (const { ink, fillInk } of Object.values(accentColors)) {
          assert.ok(contrast(ink, surface) >= 4.5, `accent/focus at ${value}`)
          assert.ok(contrast(ink, fillInk) >= 4.5, `button label at ${value}`)
        }
      }
    }
  }
  assert.ok(luminance(buildPalette(1).tokens.background) > 0.9)
  assert.ok(luminance(buildPalette(100).tokens.background) < 0.01)
})
