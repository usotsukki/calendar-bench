import type { MonthEventRow } from './types'

// ─── Virtualized month range ─────────────────────────────────────────────────
// Local June 2000 → December 2199, anchored on the current month.

const GRID_MONTH_START = new Date(2000, 5, 1)
const GRID_MONTH_END = new Date(2199, 11, 1)

function startOfMonthLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function calendarMonthsBetween(earlierStart: Date, laterStart: Date): number {
  return (
    (laterStart.getFullYear() - earlierStart.getFullYear()) * 12 + (laterStart.getMonth() - earlierStart.getMonth())
  )
}

const anchorStartOfMonth = startOfMonthLocal(new Date())

export const MONTHS_BEFORE = calendarMonthsBetween(GRID_MONTH_START, anchorStartOfMonth)
export const MONTHS_AFTER = calendarMonthsBetween(anchorStartOfMonth, GRID_MONTH_END)
export const TOTAL_MONTHS = MONTHS_BEFORE + MONTHS_AFTER + 1

export const DEFAULT_MAX_VISIBLE_CHIPS = 4

export const EMPTY_EVENTS: MonthEventRow[] = []

// ─── Shared header layout ────────────────────────────────────────────────────
export const MONTH_HEADER_HEIGHT = 28
export const WEEKDAY_BAR_HEIGHT = 28
export const HEADER_TOTAL_HEIGHT = MONTH_HEADER_HEIGHT + WEEKDAY_BAR_HEIGHT

// ─── Chip metrics (shared by Skia drawing and React chips) ──────────────────
export const CHIP_BORDER_RADIUS = 2.5
/**
 * Fixed chip height. Tailtime derives this from Skia font metrics
 * (round(lineHeight of 9px Poppins SemiBold) + 2 * CHIP_PADDING_V = 14);
 * pinned here so React-view chips match the Skia canvas exactly.
 */
export const CHIP_HEIGHT = 14
export const CHIP_PADDING_H = 3
export const CHIP_PADDING_V = 0.5
export const CHIP_FONT_SIZE = 9
export const CHIP_GAP = 2
/** Vertical offset from cell top to where event chips begin (below day number). */
export const CHIP_AREA_TOP = 26
/** Horizontal inset from cell edge. */
export const CHIP_INSET = 1

// ─── Grid palette (Tailtime tokens) ──────────────────────────────────────────
export const COLOR_CURRENT_MONTH = '#000000' // app-black-700
export const COLOR_OTHER_MONTH = '#A1A1A1' // app-neutral-400
export const COLOR_GRID_LINE = '#F5F5F5' // app-neutral-100
export const COLOR_PAGE_BG = '#FFFFFF'
export const COLOR_TODAY_CIRCLE = '#596840' // app-green-500
export const COLOR_TODAY_LABEL = '#FFFFFF'
export const COLOR_MONTH_LABEL = '#596840'
export const COLOR_WEEKDAY_LABEL = '#737373' // app-neutral-500
export const COLOR_IN_PAGE_LABEL = '#262626' // app-neutral-800
export const MORE_CHIP_BG = '#E08011' // app-peach-300
export const MORE_CHIP_TEXT = '#FFFFFF'
export const FALLBACK_CHIP_BG = '#E08011'

/**
 * Max visible chips for a cell height — pure so every calendar tab resolves
 * the same count from the same measured cell height.
 */
export function resolveMaxVisibleChips(cellHeight: number, preferredMax: number = DEFAULT_MAX_VISIBLE_CHIPS): number {
  if (cellHeight <= 0) return preferredMax
  const maxRows = preferredMax + 1
  const needed = CHIP_AREA_TOP + maxRows * CHIP_HEIGHT + (maxRows - 1) * CHIP_GAP - 1
  return cellHeight >= needed ? preferredMax : Math.max(1, preferredMax - 1)
}

// Day-number typography (Skia baseline geometry mirrored by React cells).
export const DAY_NUMBER_FONT_SIZE = 10
export const DAY_NUMBER_Y_OFFSET = 18
export const TODAY_CIRCLE_RADIUS = 10
export const TODAY_CIRCLE_Y_OFFSET = DAY_NUMBER_Y_OFFSET - 4
