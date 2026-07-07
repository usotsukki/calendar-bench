import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  buildMonthCells,
  CHIP_BORDER_RADIUS,
  COLOR_GRID_LINE,
  COLOR_IN_PAGE_LABEL,
  formatMonthLabel,
  HEADER_TOTAL_HEIGHT,
  type MonthEventRow,
  toDateKey,
} from '@/calendar-core'

const EMPTY_DAY_EVENTS = new Map<string, MonthEventRow[]>()

interface MonthPageSkeletonProps {
  monthDate: Date
  /** Fixed height for paged FlashList rows. Omit (or ≤0) to fill the parent. */
  pageHeight?: number
}

export function MonthPageSkeleton({ monthDate, pageHeight }: MonthPageSkeletonProps) {
  const cells = useMemo(() => buildMonthCells(monthDate, EMPTY_DAY_EVENTS), [monthDate])

  const rootStyle = pageHeight != null && pageHeight > 0 ? { height: pageHeight } : styles.fillRoot

  return (
    <View style={rootStyle}>
      <View style={styles.headerSpacer}>
        <Text style={styles.inPageLabel}>{formatMonthLabel(monthDate)}</Text>
      </View>
      <View style={styles.grid}>
        {Array.from({ length: 6 }).map((_, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {cells.slice(weekIndex * 7, weekIndex * 7 + 7).map(cell => (
              <View key={toDateKey(cell.day)} style={styles.cell}>
                <Text style={[styles.dayNumber, cell.isCurrentMonth ? styles.dayCurrent : styles.dayOther]}>
                  {String(cell.day.getDate())}
                </Text>
                {cell.isCurrentMonth ? <View style={styles.chip} /> : null}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fillRoot: { flex: 1, minHeight: 0 },
  headerSpacer: { height: HEADER_TOTAL_HEIGHT, justifyContent: 'center', paddingHorizontal: 22 },
  inPageLabel: {
    color: COLOR_IN_PAGE_LABEL,
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  grid: { flex: 1 },
  weekRow: { borderTopColor: COLOR_GRID_LINE, borderTopWidth: 1, flex: 1, flexDirection: 'row' },
  cell: { alignItems: 'center', flex: 1, paddingTop: 4 },
  dayNumber: { fontFamily: 'Poppins', fontSize: 10 },
  dayCurrent: { color: '#D4D4D4' },
  dayOther: { color: '#E5E5E5' },
  chip: {
    alignSelf: 'stretch',
    backgroundColor: COLOR_GRID_LINE,
    borderRadius: CHIP_BORDER_RADIUS,
    height: 14,
    marginHorizontal: 1,
    opacity: 0.6,
  },
})
