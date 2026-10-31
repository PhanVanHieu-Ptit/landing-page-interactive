import { useSyncExternalStore } from 'react'
import { watchDevicePixelRatio } from '@/animation/canvas'

const getRatio = () => window.devicePixelRatio

/**
 * The screen's pixel ratio, live: it changes when the window is dragged to a
 * display with a different density, or when the page is zoomed. A canvas that
 * sizes its backing store from it should list it as a dependency, so it is
 * rebuilt at the new ratio instead of staying soft or oversized.
 */
export function useDevicePixelRatio(): number {
  return useSyncExternalStore(watchDevicePixelRatio, getRatio, () => 1)
}
