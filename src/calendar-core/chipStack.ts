import type { MonthEventRow } from './types'

export interface ChipStackSlot {
  event: MonthEventRow
  hidden: boolean
}

export interface VisibleChipStack {
  hiddenCount: number
  visibleSlots: ChipStackSlot[]
}

export function buildVisibleChipStack(events: MonthEventRow[], maxVisibleChips: number): VisibleChipStack {
  if (events.length === 0) {
    return {
      hiddenCount: 0,
      visibleSlots: [],
    }
  }

  // Single-event overflow renders the event itself instead of a "+1 more" chip.
  const overflow = events.length - maxVisibleChips
  const visibleCount = overflow === 1 ? events.length : Math.min(maxVisibleChips, events.length)
  const visibleSlots = events.slice(0, visibleCount).map(event => ({
    event,
    hidden: false,
  }))

  return {
    hiddenCount: Math.max(0, events.length - visibleCount),
    visibleSlots,
  }
}
