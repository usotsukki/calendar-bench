import { useMemo } from 'react'
import { getCalendarGridEndExclusive, getCalendarGridStart } from './grid'
import { expandEventsForRange } from './recurrence'
import { useEventsStore } from './eventsStore'
import type { CalendarEvent, MonthEventRow } from './types'

export function getMonthRows(events: CalendarEvent[], monthDate: Date): MonthEventRow[] {
  return expandEventsForRange(events, getCalendarGridStart(monthDate), getCalendarGridEndExclusive(monthDate))
}

/** Occurrences overlapping the 6x7 grid of `monthDate`, recomputed when the store changes. */
export function useMonthRows(monthDate: Date): MonthEventRow[] {
  const events = useEventsStore(state => state.events)
  return useMemo(() => getMonthRows(events, monthDate), [events, monthDate])
}
