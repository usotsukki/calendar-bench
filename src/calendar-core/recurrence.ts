import type { CalendarEvent, MonthEventRow } from './types'

/** Hard cap so a runaway rule can never lock the JS thread. */
const MAX_OCCURRENCES_PER_RANGE = 500

function advance(date: Date, freq: 'daily' | 'weekly' | 'monthly', interval: number): Date {
  const next = new Date(date.getTime())
  if (freq === 'daily') {
    next.setDate(next.getDate() + interval)
  } else if (freq === 'weekly') {
    next.setDate(next.getDate() + 7 * interval)
  } else {
    // Monthly on the same day-of-month; months lacking it clamp forward, so
    // pin to the anchor's day and skip months where it would overflow.
    const anchorDay = date.getDate()
    let candidate = new Date(next.getFullYear(), next.getMonth() + interval, 1, next.getHours(), next.getMinutes())
    while (new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate() < anchorDay) {
      candidate = new Date(candidate.getFullYear(), candidate.getMonth() + interval, 1, next.getHours(), next.getMinutes())
    }
    candidate.setDate(anchorDay)
    return candidate
  }
  return next
}

function toRow(event: CalendarEvent, occStart: Date, occEnd: Date, recurring: boolean): MonthEventRow {
  return {
    id: recurring ? `${event.id}:${occStart.getTime()}` : event.id,
    titleSnapshot: event.title,
    colorSnapshot: event.color,
    allDay: event.allDay,
    startAt: occStart,
    endAt: occEnd,
    updatedAt: new Date(event.updatedAt),
    petCount: 1,
    source: recurring ? 'recurring' : 'single',
    recurrenceRuleId: recurring ? event.id : null,
  }
}

/**
 * Expand persisted events into occurrences overlapping [rangeStart, rangeEnd).
 */
export function expandEventsForRange(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date): MonthEventRow[] {
  const rows: MonthEventRow[] = []

  for (const event of events) {
    const startAt = new Date(event.startAt)
    const endAt = new Date(event.endAt)
    const durationMs = Math.max(0, endAt.getTime() - startAt.getTime())

    if (!event.recurrence) {
      if (startAt < rangeEnd && endAt > rangeStart) {
        rows.push(toRow(event, startAt, endAt, false))
      }
      continue
    }

    const { freq, until } = event.recurrence
    const interval = Math.max(1, event.recurrence.interval)
    const untilMs = until ? new Date(until).getTime() : Number.POSITIVE_INFINITY

    let occStart = startAt

    // Fast-forward fixed-step rules so distant ranges don't iterate from the
    // anchor (a daily event viewed decades later would loop tens of thousands
    // of times). Monthly steps are non-uniform and stay iterative.
    if (freq !== 'monthly') {
      const stepMs = (freq === 'daily' ? 1 : 7) * interval * 24 * 60 * 60 * 1000
      const gapMs = rangeStart.getTime() - durationMs - startAt.getTime()
      if (gapMs > stepMs) {
        const skips = Math.floor(gapMs / stepMs)
        occStart = new Date(startAt.getTime() + skips * stepMs)
        // setDate-based stepping preserves local clock time across DST; keep
        // the ms-based skip consistent with it.
        occStart.setHours(startAt.getHours(), startAt.getMinutes(), startAt.getSeconds(), startAt.getMilliseconds())
      }
    }

    let produced = 0
    while (occStart.getTime() <= untilMs && occStart < rangeEnd && produced < MAX_OCCURRENCES_PER_RANGE) {
      const occEnd = new Date(occStart.getTime() + durationMs)
      if (occEnd > rangeStart) {
        rows.push(toRow(event, occStart, occEnd, true))
        produced += 1
      }
      occStart = advance(occStart, freq, interval)
    }
  }

  return rows
}
