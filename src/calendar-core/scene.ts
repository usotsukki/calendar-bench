/**
 * Month scene builder — pure layout math shared by every calendar
 * implementation so events stack, span, and overflow identically.
 */
import { buildVisibleChipStack } from './chipStack'
import { getCalendarGridEndExclusive, getCalendarGridStart, buildMonthCells } from './grid'
import { toDateKey } from './date'
import {
  buildMonthCellIndexByDayKey,
  buildMonthSpanLayout,
  buildSpanCandidate,
  isSpanEligibleEvent,
  type MonthSpanCandidate,
  type MonthSpanLayout,
} from './monthSpanLayout'
import type { MonthEventRow } from './types'

function sortMonthRowsForPresentation(rows: MonthEventRow[]): MonthEventRow[] {
  return [...rows].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
    const t = a.startAt.getTime() - b.startAt.getTime()
    if (t !== 0) return t
    return a.id.localeCompare(b.id)
  })
}

export interface MonthSceneCell {
  day: Date
  dayKey: string
  isCurrentMonth: boolean
  isToday: boolean
  events: MonthEventRow[]
  timedEvents: MonthEventRow[]
  visibleEvents: MonthEventRow[]
  hiddenCount: number
  spanSlotCount: number
}

export interface MonthScene {
  monthIndex: number
  monthDate: Date
  rangeStart: Date
  rangeEnd: Date
  cells: MonthSceneCell[]
  cellIndexByDayKey: Map<string, number>
  spanLayout: MonthSpanLayout
  mergedEvents: MonthEventRow[]
}

export interface MonthSceneCacheEntry {
  eventsSignature: string
  maxVisibleChipsPerCell: number
  monthDate: Date
  scene: MonthScene
}

interface BuildMonthSceneParams {
  events: MonthEventRow[]
  maxVisibleChipsPerCell: number
  monthDate: Date
  monthIndex: number
}

interface GetOrCreateMonthSceneParams extends BuildMonthSceneParams {
  cache: Map<number, MonthSceneCacheEntry>
}

const monthRowsSignatureCache = new WeakMap<MonthEventRow[], string>()

function getMonthRowsSignature(rows: MonthEventRow[]): string {
  const cached = monthRowsSignatureCache.get(rows)
  if (cached) return cached

  const signature = rows
    .map(
      row =>
        `${row.id}|${row.startAt.getTime()}|${row.endAt.getTime()}|${row.updatedAt.getTime()}|${row.colorSnapshot ?? ''}|${
          row.allDay ? 1 : 0
        }|${row.source}|${row.recurrenceRuleId ?? ''}|${row.titleSnapshot}`,
    )
    .join('~')

  monthRowsSignatureCache.set(rows, signature)
  return signature
}

export function buildMonthScene({
  events,
  maxVisibleChipsPerCell,
  monthDate,
  monthIndex,
}: BuildMonthSceneParams): MonthScene {
  const rangeStart = getCalendarGridStart(monthDate)
  const rangeEnd = getCalendarGridEndExclusive(monthDate)
  const cellIndexByDayKey = buildMonthCellIndexByDayKey(rangeStart)
  const baseCells = buildMonthCells(monthDate, new Map())
  const mutableCells = baseCells.map(cell => ({
    day: cell.day,
    dayKey: toDateKey(cell.day),
    isCurrentMonth: cell.isCurrentMonth,
    isToday: cell.isToday,
    events: [] as MonthEventRow[],
    timedEvents: [] as MonthEventRow[],
  }))

  const spanCandidates: MonthSpanCandidate[] = []
  for (const event of events) {
    const candidate = buildSpanCandidate(event, rangeStart, rangeEnd, cellIndexByDayKey)
    if (!candidate) continue

    for (let cellIndex = candidate.startCellIndex; cellIndex <= candidate.endCellIndex; cellIndex += 1) {
      mutableCells[cellIndex]!.events.push(event)
    }

    if (isSpanEligibleEvent(event)) {
      spanCandidates.push(candidate)
    } else {
      mutableCells[candidate.startCellIndex]!.timedEvents.push(event)
    }
  }

  for (const cell of mutableCells) {
    cell.events = sortMonthRowsForPresentation(cell.events)
    cell.timedEvents = sortMonthRowsForPresentation(cell.timedEvents)
  }

  const spanLayout = buildMonthSpanLayout(spanCandidates)
  for (const week of spanLayout.weekRows) {
    const weekStartCellIndex = week.weekRow * 7
    const weekEndCellIndex = weekStartCellIndex + 7
    const hasTimedEvents = mutableCells
      .slice(weekStartCellIndex, weekEndCellIndex)
      .some(cell => cell.timedEvents.length > 0)
    week.visibleSlotCount =
      week.slotCount === maxVisibleChipsPerCell + 1 && !hasTimedEvents
        ? week.slotCount
        : Math.min(week.slotCount, maxVisibleChipsPerCell)
  }

  const cells: MonthSceneCell[] = mutableCells.map((cell, cellIndex) => {
    const totalSpanRows = spanLayout.spanSlotCountByCellIndex[cellIndex] ?? 0
    const weekRow = Math.floor(cellIndex / 7)
    const visibleSpanRows = Math.min(totalSpanRows, spanLayout.weekRows[weekRow]?.visibleSlotCount ?? 0)
    const visibleTimedRows = Math.max(0, maxVisibleChipsPerCell - visibleSpanRows)
    const hiddenSpanCount = Math.max(0, totalSpanRows - visibleSpanRows)
    const stack = buildVisibleChipStack(cell.timedEvents, visibleTimedRows)

    return {
      day: cell.day,
      dayKey: cell.dayKey,
      isCurrentMonth: cell.isCurrentMonth,
      isToday: cell.isToday,
      events: cell.events,
      timedEvents: cell.timedEvents,
      visibleEvents: stack.visibleSlots.map(slot => slot.event),
      hiddenCount: stack.hiddenCount + hiddenSpanCount,
      spanSlotCount: visibleSpanRows,
    }
  })

  return {
    monthIndex,
    monthDate,
    rangeStart,
    rangeEnd,
    cells,
    cellIndexByDayKey,
    spanLayout,
    mergedEvents: events,
  }
}

export function getOrCreateMonthScene({
  cache,
  events,
  maxVisibleChipsPerCell,
  monthDate,
  monthIndex,
}: GetOrCreateMonthSceneParams): MonthScene {
  const cached = cache.get(monthIndex)
  const eventsSignature = getMonthRowsSignature(events)
  if (
    cached &&
    cached.monthDate === monthDate &&
    cached.eventsSignature === eventsSignature &&
    cached.maxVisibleChipsPerCell === maxVisibleChipsPerCell
  ) {
    return cached.scene
  }

  const scene = buildMonthScene({
    events,
    maxVisibleChipsPerCell,
    monthDate,
    monthIndex,
  })

  cache.set(monthIndex, {
    eventsSignature,
    maxVisibleChipsPerCell,
    monthDate,
    scene,
  })

  return scene
}

export function pruneMonthSceneCache(
  cache: Map<number, MonthSceneCacheEntry>,
  minMonthIndex: number,
  maxMonthIndex: number,
) {
  for (const monthIndex of cache.keys()) {
    if (monthIndex < minMonthIndex || monthIndex > maxMonthIndex) {
      cache.delete(monthIndex)
    }
  }
}
