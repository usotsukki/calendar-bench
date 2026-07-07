/**
 * Shared React-view day cell for the library-based calendar tabs.
 *
 * Renders one cell of a precomputed MonthScene with the exact metrics the
 * Tailtime Skia canvas paints: day number baseline, today circle, span bars
 * (drawn once at their start cell, overflowing across neighbours), timed chip
 * stacks and the "+N more" chip. Cells are transparent — the month page
 * provides the white background — so overflowing span bars stay visible.
 */
import React, { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  CHIP_AREA_TOP,
  CHIP_BORDER_RADIUS,
  CHIP_FONT_SIZE,
  CHIP_GAP,
  CHIP_HEIGHT,
  CHIP_INSET,
  CHIP_PADDING_H,
  COLOR_CURRENT_MONTH,
  COLOR_GRID_LINE,
  COLOR_OTHER_MONTH,
  COLOR_TODAY_CIRCLE,
  COLOR_TODAY_LABEL,
  compactChipTitle,
  DAY_NUMBER_FONT_SIZE,
  getEventChipChrome,
  getSpanChipChrome,
  MORE_CHIP_BG,
  MORE_CHIP_TEXT,
  type MonthScene,
  type MonthSpanSegment,
  TODAY_CIRCLE_RADIUS,
  TODAY_CIRCLE_Y_OFFSET,
} from '@/calendar-core'

const CHIP_ROW_STEP = CHIP_HEIGHT + CHIP_GAP

interface DayCellProps {
  scene: MonthScene
  cellIndex: number
  cellWidth: number
  cellHeight: number
}

function spanCorners(segment: MonthSpanSegment) {
  const roundLeft = !segment.continuesBeforeWeek && !segment.isStartClipped
  const roundRight = !segment.continuesAfterWeek && !segment.isEndClipped
  return {
    borderTopLeftRadius: roundLeft ? CHIP_BORDER_RADIUS : 0,
    borderBottomLeftRadius: roundLeft ? CHIP_BORDER_RADIUS : 0,
    borderTopRightRadius: roundRight ? CHIP_BORDER_RADIUS : 0,
    borderBottomRightRadius: roundRight ? CHIP_BORDER_RADIUS : 0,
  }
}

export const DayCell = memo(function DayCell({ scene, cellIndex, cellWidth, cellHeight }: DayCellProps) {
  const cell = scene.cells[cellIndex]
  if (!cell) return <View style={{ width: cellWidth, height: cellHeight }} />

  const weekRow = Math.floor(cellIndex / 7)
  const week = scene.spanLayout.weekRows[weekRow]
  const startingSegments = (week?.segments ?? []).filter(
    segment => segment.startCellIndex === cellIndex && segment.slotIndex < (week?.visibleSlotCount ?? 0),
  )

  const dayColor = cell.isToday ? COLOR_TODAY_LABEL : cell.isCurrentMonth ? COLOR_CURRENT_MONTH : COLOR_OTHER_MONTH

  return (
    <View style={{ width: cellWidth, height: cellHeight }}>
      {/* Grid line at the row top (Skia draws one inside every row, row 0 included). */}
      <View style={styles.gridLine} />

      {/* Day number (+ today circle) centered on the Skia circle center. */}
      <View style={styles.dayNumberBox}>
        {cell.isToday ? <View style={styles.todayCircle} /> : null}
        <Text style={[styles.dayNumber, { color: dayColor }]}>{String(cell.day.getDate())}</Text>
      </View>

      {/* Span bars starting in this cell — overflow across neighbour cells. */}
      {startingSegments.map(segment => {
        const spanDays = segment.endCellIndex - segment.startCellIndex + 1
        const chrome = getSpanChipChrome(segment.event)
        return (
          <View
            key={`${segment.eventId}-${segment.startCellIndex}`}
            style={[
              styles.spanBar,
              spanCorners(segment),
              {
                top: CHIP_AREA_TOP + segment.slotIndex * CHIP_ROW_STEP,
                width: spanDays * cellWidth - 2 * CHIP_INSET,
                backgroundColor: chrome.backgroundColor,
              },
            ]}>
            <Text numberOfLines={1} style={[styles.chipText, { color: chrome.color }]}>
              {compactChipTitle(segment.event.titleSnapshot, segment.event.petCount)}
            </Text>
          </View>
        )
      })}

      {/* Timed chips below the reserved span slots. */}
      {cell.visibleEvents.map((event, index) => {
        const chrome = getEventChipChrome(event)
        return (
          <View
            key={event.id}
            style={[
              styles.chip,
              {
                top: CHIP_AREA_TOP + (cell.spanSlotCount + index) * CHIP_ROW_STEP,
                backgroundColor: chrome.backgroundColor,
              },
            ]}>
            <Text numberOfLines={1} style={[styles.chipText, { color: chrome.color }]}>
              {compactChipTitle(event.titleSnapshot, event.petCount)}
            </Text>
          </View>
        )
      })}

      {/* "+N more" chip. */}
      {cell.hiddenCount > 0 ? (
        <View
          style={[
            styles.chip,
            {
              top: CHIP_AREA_TOP + (cell.spanSlotCount + cell.visibleEvents.length) * CHIP_ROW_STEP,
              backgroundColor: MORE_CHIP_BG,
            },
          ]}>
          <Text numberOfLines={1} style={[styles.chipText, styles.moreChipText]}>
            {`+${cell.hiddenCount} more`}
          </Text>
        </View>
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  gridLine: {
    backgroundColor: COLOR_GRID_LINE,
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  dayNumberBox: {
    alignItems: 'center',
    height: TODAY_CIRCLE_RADIUS * 2,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: TODAY_CIRCLE_Y_OFFSET - TODAY_CIRCLE_RADIUS,
  },
  todayCircle: {
    backgroundColor: COLOR_TODAY_CIRCLE,
    borderRadius: TODAY_CIRCLE_RADIUS,
    height: TODAY_CIRCLE_RADIUS * 2,
    position: 'absolute',
    width: TODAY_CIRCLE_RADIUS * 2,
  },
  dayNumber: {
    fontFamily: 'Poppins',
    fontSize: DAY_NUMBER_FONT_SIZE,
    lineHeight: 14,
    textAlign: 'center',
  },
  chip: {
    borderRadius: CHIP_BORDER_RADIUS,
    height: CHIP_HEIGHT,
    justifyContent: 'center',
    left: CHIP_INSET,
    position: 'absolute',
    right: CHIP_INSET,
  },
  spanBar: {
    height: CHIP_HEIGHT,
    justifyContent: 'center',
    left: CHIP_INSET,
    position: 'absolute',
    zIndex: 10,
  },
  chipText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: CHIP_FONT_SIZE,
    lineHeight: 13,
    paddingHorizontal: CHIP_PADDING_H,
    textAlign: 'center',
  },
  moreChipText: {
    color: MORE_CHIP_TEXT,
    fontFamily: 'Poppins-Medium',
  },
})
