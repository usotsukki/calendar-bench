/**
 * SkiaMonthGrid — Tailtime port, static layer.
 *
 * One Skia Picture draws the whole month: opaque background, today circle,
 * horizontal grid lines, day numbers, multi-day span chips and per-day chip
 * stacks. The drag overlay layer is stripped for the bench.
 */
import { Canvas, createPicture, matchFont, Picture, type SkFontMgr, Skia } from '@shopify/react-native-skia'
import React, { useMemo } from 'react'
import { Platform, StyleSheet } from 'react-native'
import {
  COLOR_CURRENT_MONTH,
  COLOR_GRID_LINE,
  COLOR_OTHER_MONTH,
  COLOR_PAGE_BG,
  COLOR_TODAY_CIRCLE,
  COLOR_TODAY_LABEL,
  DAY_NUMBER_FONT_SIZE,
  DAY_NUMBER_Y_OFFSET,
  type MonthScene,
  TODAY_CIRCLE_RADIUS,
  TODAY_CIRCLE_Y_OFFSET,
} from '@/calendar-core'
import { drawChipStack, drawSpanSegment, initChipResources } from './chipDrawing'

const GRID_ROWS = 6
const GRID_COLS = 7

const fontFamily = Platform.select({ ios: 'Poppins', default: 'Poppins' })

const styles = StyleSheet.create({
  fill: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
})

// Lazy-init: Skia APIs (matchFont, measureText, Skia.Color) require the
// native module; deferring to first render avoids import-time crashes.
let font: ReturnType<typeof matchFont>
let DAY_LABEL_METRICS: Record<string, { x: number; width: number }>
let skColors: {
  current: ReturnType<typeof Skia.Color>
  grid: ReturnType<typeof Skia.Color>
  other: ReturnType<typeof Skia.Color>
  pageBackground: ReturnType<typeof Skia.Color>
  todayCircle: ReturnType<typeof Skia.Color>
  todayLabel: ReturnType<typeof Skia.Color>
}

function initSkiaResources(fontMgr?: SkFontMgr | null) {
  if (font) return
  font = matchFont(
    { fontFamily: fontFamily!, fontSize: DAY_NUMBER_FONT_SIZE, fontWeight: 'normal', fontStyle: 'normal' },
    fontMgr ?? undefined,
  )
  DAY_LABEL_METRICS = {}
  for (let d = 1; d <= 31; d++) {
    const label = String(d)
    const rect = font.measureText(label)
    DAY_LABEL_METRICS[label] = { x: rect.x ?? 0, width: rect.width }
  }
  skColors = {
    current: Skia.Color(COLOR_CURRENT_MONTH),
    grid: Skia.Color(COLOR_GRID_LINE),
    other: Skia.Color(COLOR_OTHER_MONTH),
    pageBackground: Skia.Color(COLOR_PAGE_BG),
    todayCircle: Skia.Color(COLOR_TODAY_CIRCLE),
    todayLabel: Skia.Color(COLOR_TODAY_LABEL),
  }
}

interface SkiaMonthGridStaticProps {
  fontMgr?: SkFontMgr | null
  height: number
  scene: MonthScene
  width: number
}

export function SkiaMonthGridStatic({ fontMgr, height, scene, width }: SkiaMonthGridStaticProps) {
  initSkiaResources(fontMgr)
  initChipResources(fontMgr)
  const cellWidth = width / GRID_COLS
  const cellHeight = height / GRID_ROWS

  const picture = useMemo(() => {
    let todayCol = -1
    let todayRow = -1
    const items: {
      isCurrentMonth: boolean
      isToday: boolean
      label: string
      x: number
      y: number
    }[] = []

    for (let i = 0; i < scene.cells.length; i++) {
      const col = i % GRID_COLS
      const row = Math.floor(i / GRID_COLS)
      const cell = scene.cells[i]!
      const dayStr = String(cell.day.getDate())

      if (cell.isToday) {
        todayCol = col
        todayRow = row
      }

      items.push({
        x: col * cellWidth + cellWidth / 2,
        y: row * cellHeight + DAY_NUMBER_Y_OFFSET,
        label: dayStr,
        isCurrentMonth: cell.isCurrentMonth,
        isToday: cell.isToday,
      })
    }

    return createPicture(
      canvas => {
        const paint = Skia.Paint()

        // Opaque background — prevents stale pixels from FlashList view recycling on Android.
        paint.setStyle(0)
        paint.setColor(skColors.pageBackground)
        canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint)

        if (todayCol >= 0) {
          paint.setStyle(0)
          paint.setColor(skColors.todayCircle)
          canvas.drawCircle(
            todayCol * cellWidth + cellWidth / 2,
            todayRow * cellHeight + TODAY_CIRCLE_Y_OFFSET,
            TODAY_CIRCLE_RADIUS,
            paint,
          )
        }

        paint.setStyle(1)
        paint.setColor(skColors.grid)
        paint.setStrokeWidth(1)
        for (let row = 0; row < GRID_ROWS; row++) {
          const y = row * cellHeight
          canvas.drawLine(0, y, width, y, paint)
        }

        paint.setStyle(0)
        for (const item of items) {
          const labelColor = item.isToday
            ? skColors.todayLabel
            : item.isCurrentMonth
              ? skColors.current
              : skColors.other
          paint.setColor(labelColor)
          const metrics = DAY_LABEL_METRICS[item.label]!
          canvas.drawText(item.label, item.x - metrics.x - metrics.width / 2, item.y, paint, font)
        }

        for (const week of scene.spanLayout.weekRows) {
          for (const segment of week.segments) {
            if (segment.slotIndex >= week.visibleSlotCount) continue
            drawSpanSegment(canvas, paint, segment, cellWidth, cellHeight)
          }
        }
        for (let i = 0; i < scene.cells.length; i++) {
          const cell = scene.cells[i]!
          if (cell.visibleEvents.length === 0 && cell.hiddenCount === 0) continue
          const visibleSlots = cell.visibleEvents.map(event => ({ event, hidden: false }))
          drawChipStack(canvas, paint, i, cellWidth, cellHeight, visibleSlots, cell.hiddenCount, cell.spanSlotCount)
        }
      },
      { width, height },
    )
  }, [scene, cellWidth, cellHeight, width, height])

  return (
    <Canvas androidWarmup style={styles.fill}>
      <Picture picture={picture} />
    </Canvas>
  )
}
