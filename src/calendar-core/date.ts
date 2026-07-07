export function startOfDay(date: Date): Date {
  const clone = new Date(date.getTime())
  clone.setHours(0, 0, 0, 0)
  return clone
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

export function addDays(date: Date, days: number): Date {
  const clone = new Date(date.getTime())
  clone.setDate(clone.getDate() + days)
  return clone
}

/** YYYY-MM-DD in the device's local calendar (avoids UTC day skew from `toISOString`). */
export function toDateKey(date: Date): string {
  const local = startOfDay(date)
  const y = local.getFullYear()
  const m = String(local.getMonth() + 1).padStart(2, '0')
  const d = String(local.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromDateKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1)
}

/** Locale-stable id segment (e.g. `2026-05`). */
export function toMonthKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleString(undefined, { month: 'short', year: 'numeric' })
}
