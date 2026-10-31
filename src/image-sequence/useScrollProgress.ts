import { useMemo } from 'react'
import { createScrollProgress } from './core/scrollProgress'
import type { ElementTarget, ProgressSource, ScrollProgressOptions } from './imageSequence.types'

/**
 * How far the element behind `ref` has scrolled through the viewport, as a
 * `ProgressSource` for `CanvasSequence`. The source has a stable identity and
 * holds no React state: scrolling never re-renders anything. It attaches its
 * listeners when something subscribes and removes them when the last one leaves.
 *
 * Attach `ref` to the tall element that sets the scroll distance and keep it
 * mounted; with the default `'pinned'` range that is the track around a
 * `position: sticky` stage (0 when the track reaches the top of the viewport,
 * 1 when its bottom reaches the bottom). Use `'pass'` for an element that simply
 * scrolls by.
 */
export function useScrollProgress(ref: ElementTarget, options: ScrollProgressOptions = {}): ProgressSource {
  const range = options.range ?? 'pinned'
  return useMemo(() => createScrollProgress(ref, { range }), [ref, range])
}
