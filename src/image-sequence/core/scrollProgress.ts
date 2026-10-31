import type { ElementTarget, ProgressSource, ScrollProgressOptions } from '../imageSequence.types'
import { clamp01, rangeProgress } from './sequenceMath'

const noop = () => {}

/** A source stuck at `value`: it never notifies. Used to hold one frame, e.g. when motion is reduced. */
export function constantProgress(value: number): ProgressSource {
  const fixed = clamp01(value)
  return { get: () => fixed, subscribe: () => noop }
}

/**
 * Progress of an element through the viewport (see `ProgressRange`), as a
 * source a renderer can follow.
 *
 * Nothing is attached until the first listener subscribes, and everything is
 * released with the last one. While listening, scroll, resize and `pageshow`
 * only schedule a frame; the frame re-reads the element's rectangle once,
 * compares it with the last value and notifies only when it changed. So the
 * cost of a scroll is one layout read per animation frame (cheap, because
 * nothing here writes to layout), however many events fired, and listeners run
 * inside that animation frame.
 *
 * A `ResizeObserver` on the element and on the document covers the cases with
 * no scroll event: the track changing height, or content above it growing as a
 * webfont or an image arrives.
 *
 * `subscribe` does not call the listener on subscription; read `get()` for the
 * starting value. The element is looked up in `target` when the first listener
 * subscribes, so subscribe from an effect, after React has attached the ref.
 */
export function createScrollProgress(target: ElementTarget, options: ScrollProgressOptions = {}): ProgressSource {
  const range = options.range ?? 'pinned'
  const listeners = new Set<(progress: number) => void>()
  let attached: Element | null = null
  let detach: (() => void) | null = null
  let frame = 0
  let last = Number.NaN

  const read = (element: Element) => {
    const { top, height } = element.getBoundingClientRect()
    return rangeProgress(range, top, height, window.innerHeight)
  }

  const tick = () => {
    frame = 0
    if (!attached) return
    const next = read(attached)
    if (next === last) return
    last = next
    for (const listener of listeners) listener(next)
  }

  const schedule = () => {
    if (frame === 0) frame = requestAnimationFrame(tick)
  }

  const attach = (element: Element) => {
    attached = element
    last = read(element)

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('pageshow', schedule)
    const observer = new ResizeObserver(schedule)
    observer.observe(element)
    observer.observe(document.documentElement)

    detach = () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('pageshow', schedule)
      observer.disconnect()
      cancelAnimationFrame(frame)
      frame = 0
      attached = null
    }
  }

  return {
    get() {
      const element = attached ?? target.current
      return element ? read(element) : 0
    },

    subscribe(listener) {
      listeners.add(listener)
      if (!detach) {
        const element = target.current
        if (element) attach(element)
      }
      return () => {
        listeners.delete(listener)
        if (listeners.size > 0) return
        detach?.()
        detach = null
      }
    },
  }
}
