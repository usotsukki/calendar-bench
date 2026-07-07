/**
 * MonthHeader — Tailtime port. Derives the focused month from the scroll
 * offset on the UI thread and bridges label updates to JS via scheduleOnRN.
 * Renders the shared MonthChrome so all tabs share identical fixed chrome.
 */
import React, { useCallback, useRef, useState } from 'react'
import { type SharedValue, useAnimatedReaction, useDerivedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { addMonths, formatMonthLabel, MONTHS_BEFORE, TOTAL_MONTHS } from '@/calendar-core'
import { MonthChrome } from '@/components/month-chrome'

interface MonthHeaderProps {
  scrollY: SharedValue<number>
  scrollInitialized: SharedValue<boolean>
  pageHeight: number
  anchorMonth: Date
}

export function MonthHeader({ scrollY, scrollInitialized, pageHeight, anchorMonth }: MonthHeaderProps) {
  const [label, setLabel] = useState(() => formatMonthLabel(anchorMonth))
  const lastIndexRef = useRef(MONTHS_BEFORE)

  const updateLabel = useCallback(
    (index: number) => {
      if (index === lastIndexRef.current) return
      lastIndexRef.current = index
      setLabel(formatMonthLabel(addMonths(anchorMonth, index - MONTHS_BEFORE)))
    },
    [anchorMonth],
  )

  // Swap at the midpoint — whichever page occupies more than half the
  // viewport owns the label.
  const labelIndex = useDerivedValue(() => {
    if (pageHeight <= 0 || !scrollInitialized.value) return MONTHS_BEFORE
    return Math.max(0, Math.min(TOTAL_MONTHS - 1, Math.round(scrollY.value / pageHeight)))
  })

  useAnimatedReaction(
    () => labelIndex.value,
    (current, previous) => {
      if (previous !== null && current !== previous) {
        scheduleOnRN(updateLabel, current)
      }
    },
  )

  return <MonthChrome label={label} />
}
