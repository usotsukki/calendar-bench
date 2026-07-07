/**
 * Tailtime monthly calendar — FlashList pages one month per viewport height,
 * each page painted by a single Skia Picture. Scenes are cached per month
 * index and pruned around the focused month. Drag-to-reschedule and the
 * server-backed query layer from the original are stripped; events come from
 * the shared persisted store.
 */
import { FlashList, type FlashListRef } from '@shopify/flash-list'
import { type DataModule, useFonts } from '@shopify/react-native-skia'
import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'
import {
  type CalendarEvent,
  DEFAULT_MAX_VISIBLE_CHIPS,
  getMonthRows,
  getOrCreateMonthScene,
  HEADER_TOTAL_HEIGHT,
  type MonthEventRow,
  type MonthSceneCacheEntry,
  MONTHS_BEFORE,
  addMonths,
  pruneMonthSceneCache,
  resolveMaxVisibleChips,
  startOfMonth,
  TOTAL_MONTHS,
  useEventsStore,
} from '@/calendar-core'
import { initChipResources } from './chipDrawing'
import { MonthHeader } from './MonthHeader'
import { MonthPage } from './MonthPage'
import { MonthPageSkeleton } from './MonthPageSkeleton'
import { useCalendarViewport } from './useCalendarViewport'

// ─── Android Skia Font Sources ──────────────────────────────────────────────
// On Android, Skia's system FontMgr can't see Expo-registered fonts.
// Load Poppins into a TypefaceFontProvider so matchFont finds it.
const SKIA_FONT_SOURCES: Record<string, DataModule[]> =
  Platform.OS === 'android'
    ? {
        Poppins: [
          require('@expo-google-fonts/poppins/400Regular/Poppins_400Regular.ttf'),
          require('@expo-google-fonts/poppins/500Medium/Poppins_500Medium.ttf'),
          require('@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf'),
        ],
      }
    : {}

/** How many months around the focused month keep cached scenes. */
const SCENE_CACHE_RADIUS = 5

const listFillStyle = StyleSheet.create({ fill: { flex: 1 } }).fill

export default function TailtimeMonthlyCalendar() {
  const listRef = useRef<FlashListRef<number>>(null)
  const scrollOffsetRef = useRef(0)
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Android Skia font loading ───────────────────────────────────────────
  // useFonts({}) on iOS returns an empty TypefaceFontProvider that can't see
  // Expo-registered fonts. Pass null so matchFont falls back to the system
  // FontMgr (which sees Poppins via Core Text).
  const skiaFontMgrRaw = useFonts(SKIA_FONT_SOURCES)
  const skiaFontMgr = Platform.OS === 'android' ? skiaFontMgrRaw : null
  const skiaFontsReady = Platform.OS !== 'android' || skiaFontMgr !== null

  // ── Paging state ─────────────────────────────────────────────────────────
  const anchorMonth = useMemo(() => startOfMonth(new Date()), [])
  const months = useMemo(() => Array.from({ length: TOTAL_MONTHS }, (_, index) => index), [])
  const [focusedMonthIndex, setFocusedMonthIndex] = useState(MONTHS_BEFORE)
  const focusedMonthIndexRef = useRef(MONTHS_BEFORE)

  // ── Viewport measurement ─────────────────────────────────────────────────
  const { pageHeight, pageWidth, isViewportReady, handleViewportLayout } = useCalendarViewport()
  // The header is an absolutely positioned overlay — page height is the full viewport.
  const gridWidth = pageWidth
  const gridHeight = pageHeight > 0 ? pageHeight - HEADER_TOTAL_HEIGHT : 0

  // ── Scroll shared values (drive the header label on the UI thread) ──────
  const scrollY = useSharedValue(0)
  const scrollInitialized = useSharedValue(false)
  const scrollInitializedRef = useRef(false)

  // ── Events ───────────────────────────────────────────────────────────────
  const events = useEventsStore(state => state.events)

  // ── Grid layout ──────────────────────────────────────────────────────────
  // Resolve max visible chips from the measured grid height. initChipResources
  // is idempotent; calling it here ensures chip resources are available before
  // the first scene build.
  const resolvedMaxChips = useMemo(() => {
    if (gridHeight <= 0 || !skiaFontsReady) return 0
    initChipResources(skiaFontMgr)
    return resolveMaxVisibleChips(gridHeight / 6, DEFAULT_MAX_VISIBLE_CHIPS)
  }, [gridHeight, skiaFontMgr, skiaFontsReady])

  // ── Month date cache (stable Date refs for MonthPage memo) ───────────────
  const monthDateCacheRef = useRef(new Map<number, Date>())
  const getMonthDate = useCallback(
    (monthIndex: number): Date => {
      let d = monthDateCacheRef.current.get(monthIndex)
      if (!d) {
        d = addMonths(anchorMonth, monthIndex - MONTHS_BEFORE)
        monthDateCacheRef.current.set(monthIndex, d)
      }
      return d
    },
    [anchorMonth],
  )

  // ── Per-month rows + scene caches ────────────────────────────────────────
  const monthRowsCacheRef = useRef(new Map<number, { source: CalendarEvent[]; rows: MonthEventRow[] }>())
  const sceneCacheRef = useRef(new Map<number, MonthSceneCacheEntry>())

  const getRowsForMonth = useCallback(
    (monthIndex: number, monthDate: Date): MonthEventRow[] => {
      const cached = monthRowsCacheRef.current.get(monthIndex)
      if (cached && cached.source === events) return cached.rows
      const rows = getMonthRows(events, monthDate)
      monthRowsCacheRef.current.set(monthIndex, { source: events, rows })
      return rows
    },
    [events],
  )

  const getMonthScene = useCallback(
    (monthIndex: number, monthDate: Date) =>
      getOrCreateMonthScene({
        cache: sceneCacheRef.current,
        events: getRowsForMonth(monthIndex, monthDate),
        maxVisibleChipsPerCell: resolvedMaxChips || DEFAULT_MAX_VISIBLE_CHIPS,
        monthDate,
        monthIndex,
      }),
    [getRowsForMonth, resolvedMaxChips],
  )

  // ── Render item ──────────────────────────────────────────────────────────
  const listExtraData = useMemo(() => ({ events, skiaFontsReady }), [events, skiaFontsReady])

  const renderMonth = useCallback(
    ({ item, target }: { item: number; target?: 'Cell' | 'Measurement' | 'StickyHeader' }) => {
      if (target !== 'Cell') {
        return <View style={{ height: pageHeight }} />
      }

      const monthDate = getMonthDate(item)
      const loading = !skiaFontsReady
      return (
        <MonthPage
          fontMgr={skiaFontMgr}
          gridHeight={gridHeight}
          gridWidth={gridWidth}
          loading={loading}
          monthDate={monthDate}
          monthIndex={item}
          pageHeight={pageHeight}
          scene={loading ? null : getMonthScene(item, monthDate)}
        />
      )
    },
    [getMonthDate, getMonthScene, gridHeight, gridWidth, pageHeight, skiaFontMgr, skiaFontsReady],
  )

  // ── Focused month derivation (scroll settle) ─────────────────────────────
  const deriveFocusedMonth = useCallback(
    (contentOffsetY: number) => {
      if (pageHeight <= 0) return
      const idx = Math.round(contentOffsetY / pageHeight)
      if (idx < 0 || idx >= TOTAL_MONTHS || focusedMonthIndexRef.current === idx) return

      focusedMonthIndexRef.current = idx
      startTransition(() => {
        setFocusedMonthIndex(idx)
      })
    },
    [pageHeight],
  )

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const offsetY = event.nativeEvent.contentOffset.y
      // eslint-disable-next-line react-hooks/immutability -- Reanimated SharedValue writes from handlers are the intended API
      scrollY.value = offsetY
      if (!scrollInitializedRef.current) {
        scrollInitializedRef.current = true
        // eslint-disable-next-line react-hooks/immutability -- Reanimated SharedValue writes from handlers are the intended API
        scrollInitialized.value = true
      }
      scrollOffsetRef.current = offsetY

      if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current)
      scrollSettleTimerRef.current = setTimeout(() => {
        scrollSettleTimerRef.current = null
        deriveFocusedMonth(scrollOffsetRef.current)
      }, 100)
    },
    [deriveFocusedMonth, scrollInitialized, scrollY],
  )

  // ── Cache pruning around the focused month ───────────────────────────────
  useEffect(() => {
    const lo = focusedMonthIndex - SCENE_CACHE_RADIUS
    const hi = focusedMonthIndex + SCENE_CACHE_RADIUS
    pruneMonthSceneCache(sceneCacheRef.current, lo, hi)
    for (const monthIndex of Array.from(monthRowsCacheRef.current.keys())) {
      if (monthIndex < lo || monthIndex > hi) {
        monthRowsCacheRef.current.delete(monthIndex)
      }
    }
  }, [focusedMonthIndex])

  useEffect(() => {
    return () => {
      if (scrollSettleTimerRef.current) {
        clearTimeout(scrollSettleTimerRef.current)
        scrollSettleTimerRef.current = null
      }
    }
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View onLayout={handleViewportLayout} style={listFillStyle}>
      <MonthHeader
        anchorMonth={anchorMonth}
        pageHeight={pageHeight}
        scrollInitialized={scrollInitialized}
        scrollY={scrollY}
      />
      {isViewportReady ? (
        <FlashList
          data={months}
          decelerationRate="fast"
          drawDistance={pageHeight * 3}
          extraData={listExtraData}
          initialScrollIndex={MONTHS_BEFORE}
          keyExtractor={item => String(item)}
          onScroll={handleScroll}
          ref={listRef}
          renderItem={renderMonth}
          scrollEventThrottle={16}
          scrollsToTop={false}
          showsVerticalScrollIndicator={false}
          snapToInterval={pageHeight}
          style={listFillStyle}
        />
      ) : (
        <MonthPageSkeleton monthDate={anchorMonth} />
      )}
    </View>
  )
}
