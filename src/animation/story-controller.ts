import type { LensParams } from './lens'
import { isMidStory, scrollTopForProgress, shouldCarryProgress } from './story-scroll'
import type { StoryTimeline } from './story-timeline'

/*
 * Turns native scrolling into story progress and plays it out, outside React.
 *
 *   scroll event (passive) ─► schedule a frame
 *   frame: read scrollY ─► target progress ─► ease `shown` toward it
 *          ─► write CSS variables + paint the lens (or tell `progress`'s
 *             listeners, e.g. an image sequence) + report the active chapter
 *
 * The scroll listener never computes anything; every frame re-reads the latest
 * scroll position, so a burst of scroll events (or a flick, or a jump to the
 * end) collapses into the newest target and nothing queues up. `shown` follows
 * the target with a short exponential ease: it softens a jump into a glide and
 * drives the canvas and the copy together, so they cannot disagree. The loop
 * stops itself once `shown` reaches the target.
 *
 * Layout is measured once (and again when the track or the document resizes),
 * not on every frame, and everything written per frame is a custom property or
 * canvas pixels: no write here can invalidate layout.
 */

export interface StoryAttachment {
  /** The tall element whose height sets the scroll distance. */
  track: HTMLElement
  /** The sticky child that stays pinned while the track scrolls past. */
  stage: HTMLElement
  /** Receives `--story-progress`. */
  root: HTMLElement
  /** One per chapter, in order. Each receives `--chapter-presence` and `--chapter-shift`. */
  chapters: readonly (HTMLElement | null)[]
  /** Draws a lens pose. May do nothing before the canvas exists; `refresh` repaints once it does. Left out when something else (an image sequence, following `progress`) draws the stage. */
  paint?: ((pose: LensParams) => void) | undefined
  /** Time constant of the ease toward the scroll position, in milliseconds. 0 follows the scroll exactly. */
  smoothingMs: number
  /**
   * Where in the story the reader was before the layout changed under them and this controller replaced
   * another (a rotation across a layout boundary). When partway through, the page is scrolled to the same
   * place in the new track instead of the same pixel offset; see `story-scroll.ts`.
   */
  restoreProgress?: number | undefined
}

/**
 * A 0 to 1 value that changes over time. Structurally the same as the image-sequence engine's
 * `ProgressSource`, which is how the two meet without this module importing the engine.
 * Listeners run inside the story's animation frame, and only when the value changed.
 */
export interface ProgressFeed {
  get: () => number
  subscribe: (listener: (progress: number) => void) => () => void
}

export interface StoryController {
  /**
   * The story's progress as it is shown (eased), for anything that should move with the copy:
   * it updates in the same animation frame as the chapter variables. `subscribe` does not call
   * the listener on subscription; read `get()` for the starting value.
   */
  progress: ProgressFeed
  /** Starts driving the story. Returns a function that stops it and clears everything it wrote. */
  attach: (attachment: StoryAttachment) => () => void
  /** Repaints the current frame, e.g. after the canvas has been created or resized. */
  refresh: () => void
  /** Index of the chapter whose turn it is. Changes a few times per pass, so it is safe to render from. */
  getActive: () => number
  subscribe: (onChange: () => void) => () => void
}

/** Below this distance from the target, the ease snaps shut so the loop can end exactly on it. */
const SETTLE = 5e-4
/** Progress changes smaller than this are invisible (under half a pixel of scroll on a long story), so they cost no repaint. */
const REPAINT_EPSILON = 1e-4
/** After a stall (a hidden tab, a long task) the ease advances by at most this much time. */
const MAX_FRAME_MS = 100
const FIRST_FRAME_MS = 1000 / 60

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
/** Four decimals are plenty for opacity and offsets, and keep exponent notation out of the CSS. */
const format = (value: number) => String(Math.round(value * 1e4) / 1e4)

export function createStoryController(timeline: StoryTimeline): StoryController {
  let active = 0
  /** The progress last rendered, which is what `progress.get` answers. */
  let current = 0
  let refreshCurrent: (() => void) | undefined
  const listeners = new Set<() => void>()
  const progressListeners = new Set<(progress: number) => void>()

  const setActive = (next: number) => {
    if (next === active) return
    active = next
    for (const listener of listeners) listener()
  }

  return {
    progress: {
      get: () => current,
      subscribe(listener) {
        progressListeners.add(listener)
        return () => {
          progressListeners.delete(listener)
        }
      },
    },

    getActive: () => active,

    subscribe(onChange) {
      listeners.add(onChange)
      return () => {
        listeners.delete(onChange)
      }
    },

    refresh: () => refreshCurrent?.(),

    attach({ track, stage, root, chapters, paint, smoothingMs, restoreProgress }) {
      let top = 0
      let distance = 1
      let target = 0
      let shown = 0
      let drawn = Number.NaN
      let frame = 0
      let lastTime = 0
      let snap = true
      let visible = true
      const presence: string[] = []
      const shift: string[] = []

      /** The only layout reads. Run on attach and when the track or the document changes size, never while scrolling. */
      const measure = () => {
        top = track.getBoundingClientRect().top + window.scrollY
        distance = Math.max(1, track.offsetHeight - stage.offsetHeight)
      }

      const readTarget = () => {
        target = clamp01((window.scrollY - top) / distance)
      }

      const render = (progress: number) => {
        const settled = progress === target
        if (!Number.isNaN(drawn) && Math.abs(progress - drawn) <= REPAINT_EPSILON && !(settled && progress !== drawn)) return
        drawn = progress

        root.style.setProperty('--story-progress', format(progress))
        for (const [index, element] of chapters.entries()) {
          if (!element) continue
          const frameOf = timeline.frameOf(progress, index)
          const nextPresence = format(frameOf.presence)
          const nextShift = format(frameOf.shift)
          if (presence[index] !== nextPresence) {
            presence[index] = nextPresence
            element.style.setProperty('--chapter-presence', nextPresence)
          }
          if (shift[index] !== nextShift) {
            shift[index] = nextShift
            element.style.setProperty('--chapter-shift', nextShift)
          }
        }
        if (paint) paint(timeline.poseAt(progress))
        current = progress
        for (const listener of progressListeners) listener(progress)
        setActive(timeline.chapterAt(progress))
      }

      const tick = (now: number) => {
        frame = 0
        readTarget()

        const elapsed = lastTime === 0 ? FIRST_FRAME_MS : Math.min(MAX_FRAME_MS, now - lastTime)
        lastTime = now
        const delta = target - shown
        if (snap || smoothingMs <= 0 || Math.abs(delta) < SETTLE) {
          shown = target
          snap = false
        } else {
          shown += delta * (1 - Math.exp(-elapsed / smoothingMs))
        }

        render(shown)

        if (shown === target) {
          lastTime = 0
        } else {
          schedule()
        }
      }

      function schedule() {
        if (frame === 0 && visible) frame = requestAnimationFrame(tick)
      }

      /** Scrolls so that `progress` is where the reader is, in the track as it is now. The page's one scroll write: instant, because the document may be `scroll-behavior: smooth`. */
      const scrollToProgress = (progress: number) => {
        window.scrollTo({ top: scrollTopForProgress(top, distance, progress), behavior: 'instant' })
      }

      /**
       * Jumps straight to the real scroll position, with no ease: for the first frame, a resize, a page restored from cache.
       * If the resize changed how far the story pins (a rotation, a resized window) while the reader was partway through,
       * the same scroll offset would be a different place in the story, so it carries them to the place they were at. Only
       * while the story is on screen: its last-read progress is stale after a long absence.
       */
      const jump = () => {
        const previousDistance = distance
        const place = target
        measure()
        if (visible && shouldCarryProgress(previousDistance, distance, place)) scrollToProgress(place)
        snap = true
        schedule()
      }

      const forceRepaint = () => {
        drawn = Number.NaN
        render(shown)
      }

      measure()
      if (restoreProgress !== undefined && isMidStory(restoreProgress)) scrollToProgress(restoreProgress)
      readTarget()
      shown = target
      snap = false
      render(shown)
      refreshCurrent = forceRepaint

      const onScroll = () => schedule()
      const onPageShow = () => jump()
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('pageshow', onPageShow)

      const resizeObserver = new ResizeObserver(jump)
      resizeObserver.observe(track)
      // The track can also move without resizing, when content above it grows (a webfont arrives, an image loads).
      resizeObserver.observe(document.documentElement)

      // Nothing to animate while the story is more than a screen away. Re-enter with a jump: the scroll position moved on without us.
      const visibility = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return
          visible = entry.isIntersecting
          if (visible) jump()
        },
        { rootMargin: '100% 0px' },
      )
      visibility.observe(track)

      return () => {
        cancelAnimationFrame(frame)
        frame = 0
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('pageshow', onPageShow)
        resizeObserver.disconnect()
        visibility.disconnect()
        if (refreshCurrent === forceRepaint) refreshCurrent = undefined

        root.style.removeProperty('--story-progress')
        for (const element of chapters) {
          element?.style.removeProperty('--chapter-presence')
          element?.style.removeProperty('--chapter-shift')
        }
      }
    },
  }
}
