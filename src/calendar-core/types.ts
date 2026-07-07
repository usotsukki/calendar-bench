/**
 * Shared event model.
 *
 * `CalendarEvent` is the persisted record the user creates on the Events tab.
 * `MonthEventRow` is one expanded occurrence positioned on the month grid —
 * the shape every calendar implementation consumes. Field names mirror the
 * Tailtime month-grid contract so the ported renderer works unchanged.
 */

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly'

export interface RecurrenceRule {
  freq: RecurrenceFreq
  /** Every N days/weeks/months. */
  interval: number
  /** Inclusive ISO date-time bound; null = repeat indefinitely. */
  until: string | null
}

export interface CalendarEvent {
  id: string
  title: string
  /** Hex color driving chip chrome. */
  color: string
  allDay: boolean
  startAt: string
  endAt: string
  recurrence: RecurrenceRule | null
  createdAt: string
  updatedAt: string
}

/** One occurrence on the month grid. */
export interface MonthEventRow {
  id: string
  titleSnapshot: string
  colorSnapshot: string | null
  allDay: boolean
  startAt: Date
  endAt: Date
  updatedAt: Date
  /** Tailtime compacts chip titles by pet count; plain events use 1. */
  petCount: number
  source: 'single' | 'recurring'
  recurrenceRuleId: string | null
}

export interface DayCellData {
  day: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: MonthEventRow[]
}
