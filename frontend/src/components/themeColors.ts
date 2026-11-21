type RGB = [number, number, number]
type OKLCH = [number, number, number]

export function hexToRgb(hex: string): RGB {
  if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error('Expected a six-digit HEX color')
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255) as RGB
}

const black: RGB = [0, 0, 0]
const white: RGB = [1, 1, 1]
const linear = (value: number) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
const gamma = (value: number) => value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055

export function luminance(rgb: RGB) {
  const [r, g, b] = rgb.map(linear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(first: RGB, second: RGB) {
  const a = luminance(first)
  const b = luminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function toOklch(rgb: RGB): OKLCH {
  const [r, g, b] = rgb.map(linear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const axis = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, Math.hypot(a, axis), Math.atan2(axis, a)]
}

function fromOklch([lightness, chroma, hue]: OKLCH): RGB {
  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

function inGamut(color: OKLCH): RGB {
  const [l, chroma, h] = color
  const original = fromOklch(color)
  const fits = (rgb: RGB) => rgb.every((channel) => channel >= 0 && channel <= 1)
  if (fits(original)) return original

  let low = 0
  let high = chroma
  for (let step = 0; step < 12; step++) {
    const middle = (low + high) / 2
    if (fits(fromOklch([l, middle, h]))) low = middle
    else high = middle
  }
  return fromOklch([l, low, h]).map((channel) => Math.max(0, Math.min(1, channel))) as RGB
}

export function mix(first: RGB, second: RGB, amount: number): RGB {
  const [l1, c1, h1] = toOklch(first)
  const [l2, c2, h2] = toOklch(second)
  const start = c1 < 0.0001 ? h2 : h1
  const end = c2 < 0.0001 ? start : h2
  const turn = Math.atan2(Math.sin(end - start), Math.cos(end - start))
  return inGamut([l1 + (l2 - l1) * amount, c1 + (c2 - c1) * amount, start + turn * amount])
}

export function accessibleColor(preferred: RGB, background: RGB[], minimum: number): RGB {
  const meets = (color: RGB) => background.every((surface) => contrast(color, surface) >= minimum)
  if (meets(preferred)) return preferred
  const aim = meets(black) ? black : white
  let low = 0
  let high = 1
  for (let step = 0; step < 12; step++) {
    const middle = (low + high) / 2
    if (meets(mix(preferred, aim, middle))) high = middle
    else low = middle
  }
  return mix(preferred, aim, high)
}

export function cssColor(rgb: RGB) {
  return `rgb(${rgb.map((channel) => (channel * 255).toFixed(4)).join(' ')})`
}
