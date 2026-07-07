import { useCallback, useState } from 'react'

/**
 * Viewport measurement for the paged month list. Paging height must match
 * onLayout only — never windowHeight (full screen ≠ flex calendar area).
 * The drag-oriented window-origin SharedValues from Tailtime are stripped.
 */
export function useCalendarViewport() {
  const [layoutHeight, setLayoutHeight] = useState(0)
  const [layoutWidth, setLayoutWidth] = useState(0)

  const isViewportReady = layoutHeight > 0 && layoutWidth > 0

  const handleViewportLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number; width: number } } }) => {
      const { height: h, width: w } = event.nativeEvent.layout
      if (h > 0) setLayoutHeight(prev => (prev === h ? prev : h))
      if (w > 0) setLayoutWidth(prev => (prev === w ? prev : w))
    },
    [],
  )

  return {
    pageHeight: layoutHeight,
    pageWidth: layoutWidth,
    isViewportReady,
    handleViewportLayout,
  }
}
