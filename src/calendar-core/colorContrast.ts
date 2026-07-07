const HEX_TOKEN_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/** Accepts #RGB, #RRGGBB, #RRGGBBAA; returns lowercased #rrggbb or null if unusable. */
export function normalizeHexColor(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const match = value.trim().match(HEX_TOKEN_RE)
  if (!match) return null
  let h = match[1]!
  if (h.length === 3) {
    h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`
  } else if (h.length === 8) {
    h = h.slice(0, 6)
  }
  return `#${h.toLowerCase()}`
}

function channelToLinear(channel255: number): number {
  const c = channel255 / 255
  return c <= 0.039_28 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance for sRGB hex; null if parse fails. */
export function relativeLuminance(hex: string | null | undefined): number | null {
  const normalized = normalizeHexColor(hex)
  if (!normalized) return null
  const r = channelToLinear(parseInt(normalized.slice(1, 3), 16))
  const g = channelToLinear(parseInt(normalized.slice(3, 5), 16))
  const b = channelToLinear(parseInt(normalized.slice(5, 7), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Returns near-black for light backgrounds, white otherwise. */
export function contrastingForegroundColor(backgroundHex: string): string {
  const l = relativeLuminance(backgroundHex)
  if (l == null) return '#FFFFFF'
  return l > 0.55 ? '#000000' : '#FFFFFF'
}
