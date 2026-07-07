import { addDays, startOfDay, startOfMonth, toDateKey } from './date'
import type { DayCellData, MonthEventRow } from './types'

export const DAYS_IN_WEEK = 7
export const WEEKS_IN_MONTH_GRID = 6
export const MAX_CELLS = DAYS_IN_WEEK * WEEKS_IN_MONTH_GRID

const EMPTY_EVENTS: MonthEventRow[] = []

/** Monday-based grid start for the 6x7 month grid. */
export function getCalendarGridStart(monthDate: Date): Date {
  const firstDay = startOfMonth(monthDate)
  const mondayBasedDay = (firstDay.getDay() + 6) % 7
  return addDays(firstDay, -mondayBasedDay)
}

export function getCalendarGridEndExclusive(monthDate: Date): Date {
  return addDays(getCalendarGridStart(monthDate), MAX_CELLS)
}

export function buildMonthCells(monthDate: Date, dayEvents: Map<string, MonthEventRow[]>): DayCellData[] {
  const cells: DayCellData[] = []
  const month = monthDate.getMonth()
  const gridStart = getCalendarGridStart(monthDate)
  const todayKey = toDateKey(startOfDay(new Date()))

  for (let index = 0; index < MAX_CELLS; index += 1) {
    const day = addDays(gridStart, index)
    cells.push({
      day,
      isCurrentMonth: day.getMonth() === month,
      isToday: toDateKey(day) === todayKey,
      events: dayEvents.get(toDateKey(day)) ?? EMPTY_EVENTS,
    })
  }

  return cells
}

export function getWeekdayLabels(): string[] {
  const monday = new Date(2024, 0, 1)
  return Array.from({ length: DAYS_IN_WEEK }).map((_, index) =>
    addDays(monday, index).toLocaleString(undefined, { weekday: 'short' }).toUpperCase(),
  )
}
