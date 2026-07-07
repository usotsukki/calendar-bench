/**
 * Monthly calendar composed with @marceloterreiro/flash-calendar.
 *
 * Uses the library's documented composable path: `useCalendarList` drives the
 * month list (backed by FlashList, same as the library's own Calendar.List)
 * and `useCalendar` produces each month's week/day metadata. Day cells render
 * through the shared DayCell + MonthScene so the output is identical to the
 * other tabs.
 *
 * Library-specific glue:
 * - flash-calendar emits 5 or 6 week rows depending on the month; 5-week
 *   months are padded with the scene's final row to hold the fixed 6-row grid.
 */
import { toDateId, useCalendar, useCalendarList } from '@marceloterreiro/flash-calendar'
import { FlashList } from '@shopify/flash-list'
import React, { memo, useCallback, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  COLOR_IN_PAGE_LABEL,
  formatMonthLabel,
  fromDateKey,
  HEADER_TOTAL_HEIGHT,
  DEFAULT_MAX_VISIBLE_CHIPS,
  type MonthScene,
  MONTHS_AFTER,
  MONTHS_BEFORE,
  resolveMaxVisibleChips,
} from '@/calendar-core'
import { DayCell } from '@/components/day-cell'
import { MonthChrome } from '@/components/month-chrome'
import { useMonthScenes } from '@/components/use-month-scenes'

interface FlashMonthPageProps {
  monthId: string
  monthDate: Date
  scene: MonthScene
  pageHeight: number
  cellWidth: number
  cellHeight: number
}

const FlashMonthPage = memo(function FlashMonthPage({
  monthId,
  monthDate,
  scene,
  pageHeight,
  cellWidth,
  cellHeight,
}: FlashMonthPageProps) {
  const { weeksList } = useCalendar({ calendarMonthId: monthId, calendarFirstDayOfWeek: 'monday' })

  // flash-calendar yields the month's natural week count (5 or 6); pad with
  // the scene's trailing row to keep the fixed 6-row grid.
  const weekRows: { key: string; cellIndexes: number[] }[] = weeksList.map((week, weekIndex) => ({
    key: `w${weekIndex}`,
    cellIndexes: week.map(day => scene.cellIndexByDayKey.get(day.id) ?? -1),
  }))
  while (weekRows.length < 6) {
    const startIndex = weekRows.length * 7
    weekRows.push({
      key: `w${weekRows.length}`,
      cellIndexes: Array.from({ length: 7 }, (_, i) => startIndex + i),
    })
  }

  return (
    <View style={{ height: pageHeight, backgroundColor: '#FFFFFF' }}>
      <View style={styles.inPageHeader}>
        <Text style={styles.inPageLabel}>{formatMonthLabel(monthDate)}</Text>
      </View>
      <View style={styles.grid}>
        {weekRows.map(week => (
          <View key={week.key} style={styles.weekRow}>
            {week.cellIndexes.map((cellIndex, dayIdx) => (
              <DayCell
                cellHeight={cellHeight}
                cellIndex={cellIndex}
                cellWidth={cellWidth}
                key={`${week.key}-${dayIdx}`}
                scene={scene}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  )
})

export default function FlashMonthlyCalendar() {
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const pageHeight = viewport.height
  const gridHeight = pageHeight > 0 ? pageHeight - HEADER_TOTAL_HEIGHT : 0
  const cellWidth = viewport.width > 0 ? viewport.width / 7 : 0
  const cellHeight = gridHeight > 0 ? gridHeight / 6 : 0

  const maxVisibleChips = resolveMaxVisibleChips(cellHeight, DEFAULT_MAX_VISIBLE_CHIPS)
  const { anchorMonth, getScene } = useMonthScenes(maxVisibleChips)
  const [label, setLabel] = useState(() => formatMonthLabel(anchorMonth))

  const { monthList, initialMonthIndex } = useCalendarList({
    calendarFirstDayOfWeek: 'monday',
    calendarFutureScrollRangeInMonths: MONTHS_AFTER,
    calendarPastScrollRangeInMonths: MONTHS_BEFORE,
  })

  const scrollOffsetRef = useRef(0)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout
    if (width > 0 && height > 0) {
      setViewport(prev => (prev.width === width && prev.height === height ? prev : { width, height }))
    }
  }, [])

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.y
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
      settleTimerRef.current = setTimeout(() => {
        settleTimerRef.current = null
        if (pageHeight <= 0) return
        const index = Math.max(0, Math.min(monthList.length - 1, Math.round(scrollOffsetRef.current / pageHeight)))
        const month = monthList[index]
        if (month) setLabel(formatMonthLabel(month.date))
      }, 100)
    },
    [monthList, pageHeight],
  )

  const renderMonth = useCallback(
    ({ item }: { item: (typeof monthList)[number] }) => {
      const monthDate = fromDateKey(toDateId(item.date))
      return (
        <FlashMonthPage
          cellHeight={cellHeight}
          cellWidth={cellWidth}
          monthDate={monthDate}
          monthId={item.id}
          pageHeight={pageHeight}
          scene={getScene(monthDate)}
        />
      )
    },
    [cellHeight, cellWidth, getScene, pageHeight],
  )

  return (
    <View onLayout={handleLayout} style={styles.root}>
      <MonthChrome label={label} />
      {pageHeight > 0 ? (
        <FlashList
          data={monthList}
          decelerationRate="fast"
          drawDistance={pageHeight * 3}
          initialScrollIndex={initialMonthIndex}
          keyExtractor={item => item.id}
          onScroll={handleScroll}
          renderItem={renderMonth}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          snapToInterval={pageHeight}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#FFFFFF', flex: 1 },
  inPageHeader: { height: HEADER_TOTAL_HEIGHT, justifyContent: 'center', paddingHorizontal: 22 },
  inPageLabel: {
    color: COLOR_IN_PAGE_LABEL,
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  grid: { flex: 1, overflow: 'hidden' },
  weekRow: { flex: 1, flexDirection: 'row' },
})
