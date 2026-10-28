type ClassValue = string | false | null | undefined

/**
 * Joins class names and skips falsy values. CSS Module lookups are typed
 * `string | undefined` (noUncheckedIndexedAccess), so `undefined` is accepted.
 */
export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
