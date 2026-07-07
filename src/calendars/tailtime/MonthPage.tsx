/**
 * MonthPage — Tailtime port. Skia canvas draws the static grid and event
 * chips; the interactive touch layers (tap → agenda, long-press → drag) are
 * stripped for the bench.
 */
import type { SkFontMgr } from '@shopify/react-native-skia'
import React, { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { COLOR_IN_PAGE_LABEL, formatMonthLabel, HEADER_TOTAL_HEIGHT, type MonthScene } from '@/calendar-core'
import { MonthPageSkeleton } from './MonthPageSkeleton'
import { SkiaMonthGridStatic } from './SkiaMonthGrid'

export interface MonthPageProps {
  monthDate: Date
  monthIndex: number
  fontMgr?: SkFontMgr | null
  gridHeight: number
  gridWidth: number
  pageHeight: number
  loading: boolean
  scene: MonthScene | null
}

function monthPageEqual(prev: MonthPageProps, next: MonthPageProps): boolean {
  return (
    prev.scene === next.scene &&
    prev.loading === next.loading &&
    prev.monthIndex === next.monthIndex &&
    prev.gridHeight === next.gridHeight &&
    prev.gridWidth === next.gridWidth &&
    prev.pageHeight === next.pageHeight &&
    prev.monthDate === next.monthDate
  )
}

export const MonthPage = memo(function MonthPage({
  monthDate,
  fontMgr,
  gridHeight,
  gridWidth,
  pageHeight,
  loading,
  scene,
}: MonthPageProps) {
  if (loading || !scene) {
    return <MonthPageSkeleton monthDate={monthDate} pageHeight={pageHeight} />
  }

  return (
    <View style={{ height: pageHeight }}>
      <View style={styles.headerSpacer}>
        <Text style={styles.inPageLabel}>{formatMonthLabel(monthDate)}</Text>
      </View>
      <View style={styles.gridClip}>
        {gridWidth > 0 && gridHeight > 0 ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <SkiaMonthGridStatic fontMgr={fontMgr} height={gridHeight} scene={scene} width={gridWidth} />
          </View>
        ) : null}
      </View>
    </View>
  )
}, monthPageEqual)

const styles = StyleSheet.create({
  headerSpacer: { height: HEADER_TOTAL_HEIGHT, justifyContent: 'center', paddingHorizontal: 22 },
  inPageLabel: {
    color: COLOR_IN_PAGE_LABEL,
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  gridClip: { flex: 1, overflow: 'hidden' },
})
