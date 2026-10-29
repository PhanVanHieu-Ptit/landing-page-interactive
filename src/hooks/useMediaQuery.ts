import { useCallback, useSyncExternalStore } from 'react'

/**
 * True while a media query matches, and live: it updates when the window is
 * resized or the device rotated. Pass literal widths that match a `--bp-*`
 * token (CSS cannot read tokens inside `@media`, and neither can this).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  const getSnapshot = () => window.matchMedia(query).matches

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
