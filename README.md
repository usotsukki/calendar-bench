# calendar-bench

A comparison playground: the same vertically scrollable monthly calendar built three times with different composition tools, all rendering the same persisted events identically.

## Tabs

| Tab | Composition | What drives it |
| --- | --- | --- |
| **Tailtime** | Custom in-house solution ported from the Tailtime app | `FlashList` pages one month per viewport; each month is painted by a single Skia `Picture` (grid, day numbers, today circle, span bars, chip stacks) |
| **Wix** | [`react-native-calendars`](https://github.com/wix/react-native-calendars) | `CalendarList` with `showSixWeeks`, a custom `dayComponent`, and theme stylesheet overrides to zero out the library's own paddings |
| **Flash** | [`@marceloterreiro/flash-calendar`](https://github.com/MarceloPrado/flash-calendar) | The library's composable path: `useCalendarList` drives the month list, `useCalendar` provides week/day metadata per month |
| **Events** | — | Create/delete single or recurring events (daily/weekly/monthly, optional until-date). Persisted with zustand + AsyncStorage; every calendar tab renders from this store |

## How the views stay identical

All layout and visual math lives in `src/calendar-core/` and is shared by every implementation:

- **Scene builder** (`scene.ts`, `monthSpanLayout.ts`, `chipStack.ts`) — resolves each month's 6×7 grid into cells with sorted events, multi-day span slot assignment, visible chip stacks and `+N more` overflow counts. Ported from Tailtime.
- **Chip chrome** (`chipChrome.ts`, `colorContrast.ts`) — the tint/darken + WCAG-contrast color algorithm that turns an event color into chip background/text colors.
- **Metrics** (`constants.ts`) — chip height/gap/insets, day-number geometry, header heights, palette. `CHIP_HEIGHT` is pinned to the value Tailtime derives from Skia font metrics so React-view chips match the canvas pixel-for-pixel.
- **Recurrence expansion** (`recurrence.ts`) — expands recurring rules into occurrences per visible month grid (with fast-forward for distant ranges).

The Tailtime tab draws scenes onto a Skia canvas; the Wix and Flash tabs render the same scenes with the shared React `DayCell` (`src/components/day-cell.tsx`). The fixed chrome (month label + weekday bar) is one shared component (`month-chrome.tsx`) on every tab.

## Library-specific shims

- **Wix**: the page month for a day cell is inferred from `state === 'disabled'` (extra days); `showSixWeeks` keeps the fixed 6-row grid.
- **Wix, patched** (`patches/react-native-calendars+1.1314.0.patch`): the six-weeks heuristic in `page()` counts leading days Sunday-based regardless of `firstDay`, so Monday-first grids randomly get a 7th week row — which breaks CalendarList's fixed-height `getItemLayout` math (items only get `minHeight`). The patch counts leading days in the configured week system.
- **Wix, layout**: `CalendarList` captures `calendarHeight` in a deps-less `getItemLayout` closure and only forwards a subset of ScrollView props (`pagingEnabled` yes, `snapToInterval` no). The tab hard-caps item height via `calendarStyle`, uses `pagingEnabled`, and remounts the list when the measured viewport settles. Scroll range is ±60 months — wix materialises every month row up front, unlike the other two tabs which run the full 2000–2199 window.
- **Flash**: the library yields a month's natural week count (5 or 6); 5-week months are padded with the scene's trailing row to hold the 6-row grid. The list remounts when the measured viewport settles so `initialScrollIndex` uses the final page height.
- Multi-day span bars in the React `DayCell` are drawn once at their start cell and overflow across neighbour cells (cells are transparent; the page provides the background).

## Scope

Intentionally out of scope: drag-and-drop rescheduling and any server API. The Tailtime port strips the original's drag/reschedule machinery and swaps its query layer for the local store.

## Run

```bash
npm install
npx expo start
```

All native dependencies (Skia, FlashList, AsyncStorage, datetimepicker) are Expo Go-compatible on SDK 57, or use a dev build.
