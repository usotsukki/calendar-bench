const COMPACT_FIRST_NAME_MAX = 5

/**
 * Compact title for monthly chips (Tailtime behavior): comma-separated names
 * collapse to "Max + 2" when the first name is short, else "3 pets".
 * Plain single-name titles pass through untouched.
 */
export function compactChipTitle(titleSnapshot: string, petCount: number): string {
  const commaIdx = titleSnapshot.indexOf(',')
  const effectiveCount = petCount > 0 ? petCount : commaIdx >= 0 ? titleSnapshot.split(',').length : 1
  if (effectiveCount <= 1) return titleSnapshot
  const firstName = commaIdx >= 0 ? titleSnapshot.slice(0, commaIdx).trim() : titleSnapshot
  if (firstName.length <= COMPACT_FIRST_NAME_MAX) return `${firstName} + ${effectiveCount - 1}`
  return `${effectiveCount} pets`
}

/**
 * Width-aware title candidates for multi-day span chips, longest first.
 * The renderer measures each candidate and keeps the first that fits.
 */
export function spanChipTitleCandidates(titleSnapshot: string, petCount: number): string[] {
  const commaIdx = titleSnapshot.indexOf(',')
  const effectiveCount = petCount > 0 ? petCount : commaIdx >= 0 ? titleSnapshot.split(',').length : 1
  if (effectiveCount <= 1) return [titleSnapshot]

  const names = titleSnapshot
    .split(',')
    .map(n => n.trim())
    .filter(Boolean)
  const candidates: string[] = []

  if (names.length >= effectiveCount) {
    candidates.push(names.join(', '))
  }

  for (let show = Math.min(names.length, effectiveCount) - 1; show >= 2; show--) {
    candidates.push(`${names.slice(0, show).join(', ')} + ${effectiveCount - show}`)
  }

  const firstName = names[0] ?? titleSnapshot.slice(0, commaIdx).trim()
  if (firstName.length <= COMPACT_FIRST_NAME_MAX) {
    candidates.push(`${firstName} + ${effectiveCount - 1}`)
  }

  candidates.push(`${effectiveCount} pets`)
  return candidates
}
