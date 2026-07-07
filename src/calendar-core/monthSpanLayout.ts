import { addDays, startOfDay, toDateKey } from './date'
import type { MonthEventRow } from './types'

const GRID_CELLS = 42
const DAYS_IN_WEEK = 7

export interface MonthSpanCandidate {
  event: MonthEventRow
  startCellIndex: number
  endCellIndex: number
  durationDays: number
  startDayKey: string
  endDayKey: string
  isStartClipped: boolean
  isEndClipped: boolean
}

export interface MonthSpanSegment {
  event: MonthEventRow
  eventId: string
  weekRow: number
  slotIndex: number
  startCellIndex: number
  endCellIndex: number
  startDayKey: string
  endDayKey: string
  continuesBeforeWeek: boolean
  continuesAfterWeek: boolean
  isStartClipped: boolean
  isEndClipped: boolean
}

export interface MonthWeekSpanLayout {
  weekRow: number
  slotCount: number
  visibleSlotCount: number
  segments: MonthSpanSegment[]
}

export interface MonthSpanLayout {
  weekRows: MonthWeekSpanLayout[]
  spanSlotCountByCellIndex: Uint8Array
  spanningEventsByCellIndex: MonthEventRow[][]
}

export interface OccupiedDayRange {
  startDay: Date
  endDay: Date
}

export function getOccupiedDayRange(event: Pick<MonthEventRow, 'endAt' | 'startAt'>): OccupiedDayRange {
  const startDay = startOfDay(event.startAt)
  if (event.endAt.getTime() <= event.startAt.getTime()) {
    return { startDay, endDay: startDay }
  }

  return {
    startDay,
    endDay: startOfDay(new Date(event.endAt.getTime() - 1)),
  }
}

export function isSpanEligibleEvent(event: Pick<MonthEventRow, 'allDay' | 'endAt' | 'startAt'>): boolean {
  if (event.allDay) {
    return true
  }

  const range = getOccupiedDayRange(event)
  return range.startDay.getTime() !== range.endDay.getTime()
}

export function buildMonthCellIndexByDayKey(gridStart: Date): Map<string, number> {
  const map = new Map<string, number>()
  for (let index = 0; index < GRID_CELLS; index += 1) {
    map.set(toDateKey(addDays(gridStart, index)), index)
  }
  return map
}

export function buildSpanCandidate(
  event: MonthEventRow,
  gridStart: Date,
  gridEndExclusive: Date,
  cellIndexByDayKey: Map<string, number>,
): MonthSpanCandidate | null {
  const { startDay, endDay } = getOccupiedDayRange(event)
  const gridLastDay = addDays(gridEndExclusive, -1)
  const visibleStartDay = startDay.getTime() < gridStart.getTime() ? gridStart : startDay
  const visibleEndDay = endDay.getTime() > gridLastDay.getTime() ? gridLastDay : endDay

  if (visibleStartDay.getTime() > visibleEndDay.getTime()) {
    return null
  }

  const startDayKey = toDateKey(visibleStartDay)
  const endDayKey = toDateKey(visibleEndDay)
  const startCellIndex = cellIndexByDayKey.get(startDayKey)
  const endCellIndex = cellIndexByDayKey.get(endDayKey)
  if (startCellIndex == null || endCellIndex == null) {
    return null
  }

  return {
    event,
    startCellIndex,
    endCellIndex,
    durationDays: endCellIndex - startCellIndex + 1,
    startDayKey,
    endDayKey,
    isStartClipped: visibleStartDay.getTime() !== startDay.getTime(),
    isEndClipped: visibleEndDay.getTime() !== endDay.getTime(),
  }
}

function compareSpanCandidates(left: MonthSpanCandidate, right: MonthSpanCandidate): number {
  const startDiff = left.startCellIndex - right.startCellIndex
  if (startDiff !== 0) return startDiff

  const durationDiff = right.durationDays - left.durationDays
  if (durationDiff !== 0) return durationDiff

  if (left.event.allDay !== right.event.allDay) {
    return left.event.allDay ? -1 : 1
  }

  const timeDiff = left.event.startAt.getTime() - right.event.startAt.getTime()
  if (timeDiff !== 0) return timeDiff

  return left.event.id.localeCompare(right.event.id)
}

export function buildMonthSpanLayout(candidates: MonthSpanCandidate[]): MonthSpanLayout {
  const weekRows: MonthWeekSpanLayout[] = Array.from({ length: GRID_CELLS / DAYS_IN_WEEK }, (_, weekRow) => ({
    weekRow,
    slotCount: 0,
    visibleSlotCount: 0,
    segments: [],
  }))
  const spanSlotCountByCellIndex = new Uint8Array(GRID_CELLS)
  const spanningEventsByCellIndex = Array.from({ length: GRID_CELLS }, () => [] as MonthEventRow[])
  const sortedCandidates = [...candidates].sort(compareSpanCandidates)
  const slotOccupancy: Uint8Array[] = []

  for (const candidate of sortedCandidates) {
    let slotIndex = 0

    while (true) {
      const occupancy = slotOccupancy[slotIndex] ?? new Uint8Array(GRID_CELLS)
      let conflict = false
      for (let cellIndex = candidate.startCellIndex; cellIndex <= candidate.endCellIndex; cellIndex += 1) {
        if (occupancy[cellIndex] === 1) {
          conflict = true
          break
        }
      }

      if (!conflict) {
        slotOccupancy[slotIndex] = occupancy
        for (let cellIndex = candidate.startCellIndex; cellIndex <= candidate.endCellIndex; cellIndex += 1) {
          occupancy[cellIndex] = 1
          spanningEventsByCellIndex[cellIndex]!.push(candidate.event)
          spanSlotCountByCellIndex[cellIndex] = Math.max(spanSlotCountByCellIndex[cellIndex] ?? 0, slotIndex + 1)
        }
        break
      }

      slotIndex += 1
    }

    let cursor = candidate.startCellIndex
    while (cursor <= candidate.endCellIndex) {
      const weekRow = Math.floor(cursor / DAYS_IN_WEEK)
      const weekEndCellIndex = weekRow * DAYS_IN_WEEK + (DAYS_IN_WEEK - 1)
      const segmentEndCellIndex = Math.min(candidate.endCellIndex, weekEndCellIndex)
      weekRows[weekRow]!.segments.push({
        event: candidate.event,
        eventId: candidate.event.id,
        weekRow,
        slotIndex,
        startCellIndex: cursor,
        endCellIndex: segmentEndCellIndex,
        startDayKey: candidate.startDayKey,
        endDayKey: candidate.endDayKey,
        continuesBeforeWeek: cursor !== candidate.startCellIndex,
        continuesAfterWeek: segmentEndCellIndex !== candidate.endCellIndex,
        isStartClipped: candidate.isStartClipped && cursor === candidate.startCellIndex,
        isEndClipped: candidate.isEndClipped && segmentEndCellIndex === candidate.endCellIndex,
      })
      weekRows[weekRow]!.slotCount = Math.max(weekRows[weekRow]!.slotCount, slotIndex + 1)
      cursor = segmentEndCellIndex + 1
    }
  }

  return {
    weekRows,
    spanSlotCountByCellIndex,
    spanningEventsByCellIndex,
  }
}
