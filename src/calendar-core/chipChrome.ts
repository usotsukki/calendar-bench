import { contrastingForegroundColor, normalizeHexColor, relativeLuminance } from './colorContrast'
import { FALLBACK_CHIP_BG } from './constants'
import type { MonthEventRow } from './types'
import { isSpanEligibleEvent } from './monthSpanLayout'

/** How much to lighten (blend toward white) or darken the event color for chip chrome. */
const CHIP_TINT_STEP = 0.2

/** Colors above this luminance are too light for tintOverWhite — use darken instead. */
const LIGHT_COLOR_LUMINANCE = 0.7

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (c: number) =>
    Math.round(Math.max(0, Math.min(255, c)))
      .toString(16)
      .padStart(2, '0')
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`
}

/** Event color at `alpha` opacity blended on white (#fff). */
export function tintOverWhite(hex: string, alpha = CHIP_TINT_STEP): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(255 - alpha * (255 - r), 255 - alpha * (255 - g), 255 - alpha * (255 - b))
}

/** Darken the color by `amount` (0-1). 0.10 = 10% darker than source. */
export function darken(hex: string, amount = CHIP_TINT_STEP): string {
  const factor = 1 - amount
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * factor, g * factor, b * factor)
}

export function getEventChipBackgroundColor(event: MonthEventRow): string {
  return normalizeHexColor(event.colorSnapshot) ?? FALLBACK_CHIP_BG
}

export interface ChipChrome {
  backgroundColor: string
  color: string
}

const chromeCache = new Map<string, ChipChrome>()

export function getEventChipChrome(event: MonthEventRow): ChipChrome {
  const eventColor = getEventChipBackgroundColor(event)
  const allDay = event.allDay
  const cacheKey = `${eventColor}:${allDay ? '1' : '0'}`

  const cached = chromeCache.get(cacheKey)
  if (cached) return cached

  let result: ChipChrome

  const isLight = (relativeLuminance(eventColor) ?? 0) > LIGHT_COLOR_LUMINANCE

  if (allDay) {
    // All-day: full event color bg, white or dark label.
    result = {
      backgroundColor: eventColor,
      color: contrastingForegroundColor(eventColor),
    }
  } else {
    // Regular: event color as text, tinted bg.
    // Most colors → lighten bg; near-white → darken bg.
    result = {
      backgroundColor: isLight ? darken(eventColor) : tintOverWhite(eventColor),
      color: eventColor,
    }
  }

  chromeCache.set(cacheKey, result)
  return result
}

export function getSpanChipChrome(event: MonthEventRow): ChipChrome {
  const eventColor = getEventChipBackgroundColor(event)
  const cacheKey = `${eventColor}:span`
  const cached = chromeCache.get(cacheKey)
  if (cached) return cached

  const result = {
    backgroundColor: eventColor,
    color: contrastingForegroundColor(eventColor),
  }
  chromeCache.set(cacheKey, result)
  return result
}

export { isSpanEligibleEvent }
