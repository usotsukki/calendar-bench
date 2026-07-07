/**
 * Per-tab scene provider: maps a month date to its MonthScene, cached and
 * invalidated by the shared event store. Each calendar tab owns an instance
 * so implementations stay independent while consuming identical scenes.
 */
import { useCallback, useMemo, useRef } from 'react'
import {
  type CalendarEvent,
  getMonthRows,
  getOrCreateMonthScene,
  type MonthEventRow,
  type MonthScene,
  type MonthSceneCacheEntry,
  startOfMonth,
  useEventsStore,
} from '@/calendar-core'

const PRUNE_THRESHOLD = 36
const PRUNE_RADIUS = 12

export function useMonthScenes(maxVisibleChipsPerCell: number) {
  const events = useEventsStore(state => state.events)
  const anchorMonth = useMemo(() => startOfMonth(new Date()), [])
  const monthDateCacheRef = useRef(new Map<number, Date>())
  const rowsCacheRef = useRef(new Map<number, { source: CalendarEvent[]; rows: MonthEventRow[] }>())
  const sceneCacheRef = useRef(new Map<number, MonthSceneCacheEntry>())

  const getScene = useCallback(
    (monthDateInput: Date): MonthScene => {
      const monthIndex =
        (monthDateInput.getFullYear() - anchorMonth.getFullYear()) * 12 +
        (monthDateInput.getMonth() - anchorMonth.getMonth())

      // Stable Date identity per month — getOrCreateMonthScene compares by reference.
      let monthDate = monthDateCacheRef.current.get(monthIndex)
      if (!monthDate) {
        monthDate = startOfMonth(monthDateInput)
        monthDateCacheRef.current.set(monthIndex, monthDate)
      }

      const cachedRows = rowsCacheRef.current.get(monthIndex)
      let rows: MonthEventRow[]
      if (cachedRows && cachedRows.source === events) {
        rows = cachedRows.rows
      } else {
        rows = getMonthRows(events, monthDate)
        rowsCacheRef.current.set(monthIndex, { source: events, rows })
      }

      if (sceneCacheRef.current.size > PRUNE_THRESHOLD) {
        for (const key of Array.from(sceneCacheRef.current.keys())) {
          if (Math.abs(key - monthIndex) > PRUNE_RADIUS) {
            sceneCacheRef.current.delete(key)
            rowsCacheRef.current.delete(key)
          }
        }
      }

      return getOrCreateMonthScene({
        cache: sceneCacheRef.current,
        events: rows,
        maxVisibleChipsPerCell,
        monthDate,
        monthIndex,
      })
    },
    [anchorMonth, events, maxVisibleChipsPerCell],
  )

  return { anchorMonth, events, getScene }
}
