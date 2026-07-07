/**
 * Monthly calendar composed with react-native-calendars (wix).
 *
 * CalendarList drives the vertically scrolling month pages; every visual
 * decision inside a day cell is delegated to the shared DayCell + MonthScene
 * so the result renders identically to the Tailtime Skia implementation.
 *
 * Library-specific glue:
 * - `showSixWeeks` keeps every month at the fixed 6-row grid.
 * - Theme stylesheet overrides zero out wix's own paddings/margins so the
 *   page height math (header + 6 rows) holds.
 * - `dayComponent` receives the date + `state`; the page's month is inferred
 *   from `state === 'disabled'` (extra days) to pick the right scene.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { CalendarList, type DateData } from 'react-native-calendars'
import type { DayProps } from 'react-native-calendars/src/calendar/day'
import {
  COLOR_IN_PAGE_LABEL,
  DEFAULT_MAX_VISIBLE_CHIPS,
  formatMonthLabel,
  fromDateKey,
  HEADER_TOTAL_HEIGHT,
  resolveMaxVisibleChips,
  startOfMonth,
  toDateKey,
} from '@/calendar-core'

import { DayCell } from '@/components/day-cell'
import { MonthChrome } from '@/components/month-chrome'
import { useMonthScenes } from '@/components/use-month-scenes'

// wix's CalendarList degrades with very large ranges (it materialises every
// month row up front); ±60 months is the pragmatic bench range here, unlike
// the Tailtime/Flash tabs which run the full 2000–2199 window.
const SCROLL_RANGE_MONTHS = 60

function pageMonthForDay(day: Date, isExtraDay: boolean): Date {
  if (!isExtraDay) return startOfMonth(day)
  // Extra days > mid-month sit in the leading week of the next month's page;
  // early ones sit in the trailing week of the previous month's page.
  return new Date(day.getFullYear(), day.getMonth() + (day.getDate() > 15 ? 1 : -1), 1)
}

export default function WixMonthlyCalendar() {
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const pageHeight = viewport.height
  const gridHeight = pageHeight > 0 ? pageHeight - HEADER_TOTAL_HEIGHT : 0
  const cellWidth = viewport.width > 0 ? viewport.width / 7 : 0
  const cellHeight = gridHeight > 0 ? gridHeight / 6 : 0

  const maxVisibleChips = resolveMaxVisibleChips(cellHeight, DEFAULT_MAX_VISIBLE_CHIPS)
  const { anchorMonth, getScene } = useMonthScenes(maxVisibleChips)
  const [label, setLabel] = useState(() => formatMonthLabel(anchorMonth))

  // CalendarList's public ref type does not expose scrollToMonth.
  const listRef = useRef<{ scrollToMonth?: (m: string) => void } | null>(null)

  // Re-anchor when the measured page height settles (safe-area/tab bar) —
  // CalendarList's initial position is computed against the stale height.
  const lastPageHeightRef = useRef(0)
  useEffect(() => {
    if (pageHeight <= 0 || lastPageHeightRef.current === pageHeight) return
    lastPageHeightRef.current = pageHeight
    requestAnimationFrame(() => {
      listRef.current?.scrollToMonth?.(toDateKey(anchorMonth))
    })
  }, [anchorMonth, pageHeight])

  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout
    if (width > 0 && height > 0) {
      setViewport(prev => (prev.width === width && prev.height === height ? prev : { width, height }))
    }
  }, [])

  const handleVisibleMonthsChange = useCallback((months: DateData[]) => {
    const first = months[0]
    if (first) {
      setLabel(formatMonthLabel(new Date(first.year, first.month - 1, 1)))
    }
  }, [])

  const renderDay = useCallback(
    (props: DayProps & { date?: DateData }) => {
      if (!props.date || cellWidth <= 0 || cellHeight <= 0) {
        return <View style={{ width: cellWidth, height: cellHeight }} />
      }
      const day = fromDateKey(props.date.dateString)
      const scene = getScene(pageMonthForDay(day, props.state === 'disabled'))
      const cellIndex = scene.cellIndexByDayKey.get(toDateKey(day)) ?? -1
      return <DayCell cellHeight={cellHeight} cellIndex={cellIndex} cellWidth={cellWidth} scene={scene} />
    },
    [cellHeight, cellWidth, getScene],
  )

  const renderHeader = useCallback((date?: string | { toString(): string }) => {
    const monthDate = date ? new Date(date.toString()) : new Date()
    return (
      <View style={styles.inPageHeader}>
        <Text style={styles.inPageLabel}>{formatMonthLabel(monthDate)}</Text>
      </View>
    )
  }, [])

  const theme = useMemo(
    () =>
      ({
        calendarBackground: '#FFFFFF',
        // Zero out wix's own paddings/margins so header + 6 rows fill the page exactly.
        'stylesheet.calendar.main': {
          container: { backgroundColor: '#FFFFFF', paddingLeft: 0, paddingRight: 0 },
          monthView: { backgroundColor: '#FFFFFF' },
          week: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 0 },
          dayContainer: { flex: 1, alignItems: 'center' },
        },
        'stylesheet.calendar.header': {
          header: { alignItems: 'stretch', flexDirection: 'row', justifyContent: 'flex-start', margin: 0, padding: 0 },
        },
      }) as const,
    [],
  )

  return (
    <View onLayout={handleLayout} style={styles.root}>
      <MonthChrome label={label} />
      {pageHeight > 0 ? (
        <CalendarList
          // Remount on viewport changes: CalendarList captures calendarHeight in
          // a deps-less getItemLayout closure, so a post-mount height change
          // (tab bar settling) leaves stale spacer math and misaligned landing.
          key={`wix-${pageHeight}`}
          calendarHeight={pageHeight}
          // Hard-cap each month item: wix only applies minHeight, so any chrome
          // it adds would grow items past calendarHeight and break the
          // index * height scroll math (snap + initial position drift).
          calendarStyle={{ height: pageHeight, overflow: 'hidden', padding: 0 }}
          current={toDateKey(anchorMonth)}
          dayComponent={renderDay}
          hideArrows
          ref={listRef}
          firstDay={1}
          futureScrollRange={SCROLL_RANGE_MONTHS}
          hideDayNames
          hideExtraDays={false}
          onVisibleMonthsChange={handleVisibleMonthsChange}
          pastScrollRange={SCROLL_RANGE_MONTHS}
          // CalendarList only forwards a subset of ScrollView props — snapToInterval
          // is not among them, but pagingEnabled is (and equals the item height here).
          pagingEnabled
          renderHeader={renderHeader}
          showsVerticalScrollIndicator={false}
          showSixWeeks
          theme={theme}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#FFFFFF', flex: 1 },
  inPageHeader: {
    height: HEADER_TOTAL_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 22,
    alignSelf: 'stretch',
    width: '100%',
  },
  inPageLabel: {
    color: COLOR_IN_PAGE_LABEL,
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
})
