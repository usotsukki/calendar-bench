/**
 * Shared month chrome: the absolute overlay with the month/year label and the
 * weekday bar. Every calendar tab renders this same component so the fixed
 * chrome is pixel-identical across implementations — only the scrolling month
 * grid underneath differs.
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  COLOR_MONTH_LABEL,
  COLOR_WEEKDAY_LABEL,
  getWeekdayLabels,
  HEADER_TOTAL_HEIGHT,
  MONTH_HEADER_HEIGHT,
  WEEKDAY_BAR_HEIGHT,
} from '@/calendar-core'

export const WEEKDAY_LABELS = getWeekdayLabels()

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_TOTAL_HEIGHT,
    backgroundColor: 'white',
    zIndex: 20,
  },
  labelRow: {
    justifyContent: 'center',
    paddingHorizontal: 22,
    height: MONTH_HEADER_HEIGHT,
  },
  label: {
    color: COLOR_MONTH_LABEL,
    fontFamily: 'Poppins-Medium',
    fontWeight: '500',
    fontSize: 18,
    lineHeight: 24,
  },
  weekdayRow: {
    flexDirection: 'row',
    height: WEEKDAY_BAR_HEIGHT,
  },
  weekdayCell: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  weekdayLabel: {
    color: COLOR_WEEKDAY_LABEL,
    fontFamily: 'Poppins',
    fontSize: 11,
    lineHeight: 16,
  },
})

export function MonthChrome({ label }: { label: string }) {
  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View pointerEvents="none" style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map(day => (
          <View key={day} style={styles.weekdayCell}>
            <Text style={styles.weekdayLabel}>{day}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
