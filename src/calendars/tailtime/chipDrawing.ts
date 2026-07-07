/**
 * chipDrawing.ts — Tailtime port.
 *
 * Pure Skia drawing module for event chips. Zero React dependencies.
 * Called inside `createPicture` (SkiaMonthGrid) to draw chip backgrounds and
 * titles imperatively. Drag hit-area emission stripped for the bench.
 */
import {
  ClipOp,
  FontWeight,
  matchFont,
  type SkCanvas,
  type SkFontMgr,
  Skia,
  type SkPaint,
  type SkTypefaceFontProvider,
  TextAlign,
} from '@shopify/react-native-skia'
import { Platform } from 'react-native'
import {
  CHIP_AREA_TOP,
  CHIP_BORDER_RADIUS,
  CHIP_FONT_SIZE,
  CHIP_GAP,
  CHIP_HEIGHT,
  CHIP_INSET,
  CHIP_PADDING_H,
  CHIP_PADDING_V,
  type ChipStackSlot,
  compactChipTitle,
  getEventChipChrome,
  getSpanChipChrome,
  MORE_CHIP_BG,
  MORE_CHIP_TEXT,
  type MonthSpanSegment,
  spanChipTitleCandidates,
} from '@/calendar-core'

const GRID_COLS = 7
const ELLIPSIS = '…'

// ─── Lazy Skia Resources ───────────────────────────────────────────────────

const fontFamily = Platform.select({ ios: 'Poppins', default: 'Poppins' })

let chipFont: ReturnType<typeof matchFont>
let moreChipBgColor: ReturnType<typeof Skia.Color>
let moreChipTextColor: ReturnType<typeof Skia.Color>
/** Font provider for ParagraphBuilder (Android only; empty on iOS → uses system). */
let chipFontProvider: SkTypefaceFontProvider | undefined

/** Module-level SkColor cache: hex string → SkColor. */
const skColorCache = new Map<string, ReturnType<typeof Skia.Color>>()

function getSkColor(hex: string): ReturnType<typeof Skia.Color> {
  let c = skColorCache.get(hex)
  if (!c) {
    c = Skia.Color(hex)
    skColorCache.set(hex, c)
  }
  return c
}

function getChipRowStep(): number {
  return CHIP_HEIGHT + CHIP_GAP
}

/** Call once before first use (deferred so importing this file never touches native Skia). */
export function initChipResources(fontMgr?: SkFontMgr | null): void {
  if (chipFont) return
  // ParagraphBuilder.Make requires a SkTypefaceFontProvider (not optional).
  // On Android: use the custom provider with Poppins loaded.
  // On iOS: create an empty provider — Paragraph resolves system-registered fonts.
  chipFontProvider = (fontMgr as SkTypefaceFontProvider) ?? Skia.TypefaceFontProvider.Make()
  chipFont = matchFont(
    {
      fontFamily: fontFamily!,
      fontSize: CHIP_FONT_SIZE,
      fontWeight: '600',
    },
    fontMgr ?? undefined,
  )

  moreChipBgColor = Skia.Color(MORE_CHIP_BG)
  moreChipTextColor = Skia.Color(MORE_CHIP_TEXT)
}

// ─── Text Drawing Helpers ──────────────────────────────────────────────────

/**
 * Measure the natural (unwrapped) width of a chip-text string using the
 * same ParagraphBuilder pipeline as drawChipText. Returns pixel width.
 */
function measureChipText(text: string): number {
  const builder = Skia.ParagraphBuilder.Make(
    {
      maxLines: 1,
      textStyle: {
        fontSize: CHIP_FONT_SIZE,
        fontFamilies: [fontFamily!],
        fontStyle: { weight: FontWeight.SemiBold },
      },
    },
    chipFontProvider,
  )
  builder.addText(text)
  const paragraph = builder.build()
  paragraph.layout(1e6)
  return paragraph.getLongestLine()
}

/** First span-title candidate whose measured width fits `availableWidth`. */
export function widthAwareChipTitle(titleSnapshot: string, petCount: number, availableWidth: number): string {
  const candidates = spanChipTitleCandidates(titleSnapshot, petCount)
  // Small buffer prevents the Paragraph ellipsis from clipping the last
  // glyph when measured and rendered widths differ by sub-pixel amounts.
  const safeWidth = availableWidth - 1

  for (const candidate of candidates) {
    if (measureChipText(candidate) <= safeWidth) {
      return candidate
    }
  }

  return candidates[candidates.length - 1]!
}

/**
 * Draw a single line of text inside a chip using the Paragraph API.
 *
 * ParagraphBuilder uses HarfBuzz for text shaping — this avoids glyph-spacing
 * issues that canvas.drawText exhibits on Android with custom TypefaceFontProvider
 * fonts. The paragraph handles truncation (ellipsis) and centering natively.
 */
function drawChipText(
  canvas: SkCanvas,
  paint: SkPaint,
  text: string,
  clipX: number,
  clipWidth: number,
  cursorY: number,
  weight: FontWeight = FontWeight.SemiBold,
  textAlign: TextAlign = TextAlign.Center,
): void {
  const builder = Skia.ParagraphBuilder.Make(
    {
      maxLines: 1,
      ellipsis: ELLIPSIS,
      textAlign,
      textStyle: {
        fontSize: CHIP_FONT_SIZE,
        fontFamilies: [fontFamily!],
        fontStyle: { weight },
        color: paint.getColor(),
      },
    },
    chipFontProvider,
  )
  builder.addText(text)
  const paragraph = builder.build()
  paragraph.layout(clipWidth)

  canvas.save()
  canvas.clipRect(Skia.XYWHRect(clipX, cursorY, clipWidth, CHIP_HEIGHT), ClipOp.Intersect, true)
  paragraph.paint(canvas, clipX, cursorY + CHIP_PADDING_V)
  canvas.restore()
}

function drawRoundedHorizontalChip(
  canvas: SkCanvas,
  paint: SkPaint,
  x: number,
  y: number,
  width: number,
  height: number,
  roundLeft: boolean,
  roundRight: boolean,
) {
  if (roundLeft === roundRight) {
    if (roundLeft) {
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, width, height), CHIP_BORDER_RADIUS, CHIP_BORDER_RADIUS), paint)
    } else {
      canvas.drawRect(Skia.XYWHRect(x, y, width, height), paint)
    }
    return
  }

  const leftRadius = roundLeft ? CHIP_BORDER_RADIUS : 0
  const rightRadius = roundRight ? CHIP_BORDER_RADIUS : 0
  const path = Skia.Path.Make()
  path.moveTo(x + leftRadius, y)
  path.lineTo(x + width - rightRadius, y)
  if (rightRadius > 0) {
    path.quadTo(x + width, y, x + width, y + rightRadius)
  } else {
    path.lineTo(x + width, y)
  }
  path.lineTo(x + width, y + height - rightRadius)
  if (rightRadius > 0) {
    path.quadTo(x + width, y + height, x + width - rightRadius, y + height)
  } else {
    path.lineTo(x + width, y + height)
  }
  path.lineTo(x + leftRadius, y + height)
  if (leftRadius > 0) {
    path.quadTo(x, y + height, x, y + height - leftRadius)
  } else {
    path.lineTo(x, y + height)
  }
  path.lineTo(x, y + leftRadius)
  if (leftRadius > 0) {
    path.quadTo(x, y, x + leftRadius, y)
  } else {
    path.lineTo(x, y)
  }
  path.close()
  canvas.drawPath(path, paint)
}

// ─── Core Drawing ──────────────────────────────────────────────────────────

function getChipAreaLayout(cellIndex: number, cellWidth: number, cellHeight: number, topOffsetRows = 0) {
  const col = cellIndex % GRID_COLS
  const row = Math.floor(cellIndex / GRID_COLS)
  const areaX = col * cellWidth + CHIP_INSET
  const areaWidth = cellWidth - 2 * CHIP_INSET
  const areaY = row * cellHeight + CHIP_AREA_TOP + topOffsetRows * getChipRowStep()

  return {
    areaWidth,
    areaX,
    areaY,
  }
}

export function drawChipStack(
  canvas: SkCanvas,
  paint: SkPaint,
  cellIndex: number,
  cellWidth: number,
  cellHeight: number,
  visibleSlots: ChipStackSlot[],
  hiddenCount: number,
  topOffsetRows = 0,
): void {
  if (visibleSlots.length === 0 && hiddenCount === 0) return

  const { areaWidth, areaX, areaY } = getChipAreaLayout(cellIndex, cellWidth, cellHeight, topOffsetRows)
  let cursorY = areaY

  // ── Draw each visible chip ───────────────────────────────────────────
  for (const slot of visibleSlots) {
    if (slot.hidden) {
      // Reserve vertical space but don't draw (matches opacity-0 behaviour).
      cursorY += CHIP_HEIGHT + CHIP_GAP
      continue
    }

    const { event } = slot
    const chrome = getEventChipChrome(event)

    // Background rounded rect
    paint.setStyle(0) // Fill
    paint.setColor(getSkColor(chrome.backgroundColor))
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(areaX, cursorY, areaWidth, CHIP_HEIGHT), CHIP_BORDER_RADIUS, CHIP_BORDER_RADIUS),
      paint,
    )

    // Text — truncated with ellipsis, centered (matches numberOfLines={1} + textAlign:'center')
    paint.setColor(getSkColor(chrome.color))
    const clipX = areaX + CHIP_PADDING_H
    const clipWidth = areaWidth - 2 * CHIP_PADDING_H
    if (clipWidth > 0) {
      drawChipText(canvas, paint, compactChipTitle(event.titleSnapshot, event.petCount), clipX, clipWidth, cursorY)
    }

    cursorY += CHIP_HEIGHT + CHIP_GAP
  }

  // ── "+N more" chip ───────────────────────────────────────────────────
  if (hiddenCount > 0) {
    paint.setStyle(0)
    paint.setColor(moreChipBgColor)
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(areaX, cursorY, areaWidth, CHIP_HEIGHT), CHIP_BORDER_RADIUS, CHIP_BORDER_RADIUS),
      paint,
    )

    paint.setColor(moreChipTextColor)
    const moreClipX = areaX + CHIP_PADDING_H
    const moreClipWidth = areaWidth - 2 * CHIP_PADDING_H
    if (moreClipWidth > 0) {
      drawChipText(canvas, paint, `+${hiddenCount} more`, moreClipX, moreClipWidth, cursorY, FontWeight.Medium)
    }
  }
}

export function drawSpanSegment(
  canvas: SkCanvas,
  paint: SkPaint,
  segment: MonthSpanSegment,
  cellWidth: number,
  cellHeight: number,
): void {
  const startCol = segment.startCellIndex % GRID_COLS
  const spanDays = segment.endCellIndex - segment.startCellIndex + 1
  const x = startCol * cellWidth + CHIP_INSET
  const y = segment.weekRow * cellHeight + CHIP_AREA_TOP + segment.slotIndex * (CHIP_HEIGHT + CHIP_GAP)
  const width = spanDays * cellWidth - 2 * CHIP_INSET

  if (width <= 0) return

  const roundLeft = !segment.continuesBeforeWeek && !segment.isStartClipped
  const roundRight = !segment.continuesAfterWeek && !segment.isEndClipped
  const chrome = getSpanChipChrome(segment.event)

  paint.setStyle(0)
  paint.setColor(getSkColor(chrome.backgroundColor))
  drawRoundedHorizontalChip(canvas, paint, x, y, width, CHIP_HEIGHT, roundLeft, roundRight)

  paint.setColor(getSkColor(chrome.color))
  const clipX = x + CHIP_PADDING_H
  const clipWidth = width - 2 * CHIP_PADDING_H
  if (clipWidth > 0) {
    drawChipText(
      canvas,
      paint,
      widthAwareChipTitle(segment.event.titleSnapshot, segment.event.petCount, clipWidth),
      clipX,
      clipWidth,
      y,
      FontWeight.SemiBold,
      TextAlign.Center,
    )
  }
}

