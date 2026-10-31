import type { StoryView } from './story-timeline'

/*
 * Which composition the page uses. Width alone cannot say: a phone turned on
 * its side is wider than a tablet in portrait but has a fraction of the
 * height, and the copy needs height. So the layout comes from three facts
 * about the viewport together, and each fact is a media query, which keeps it
 * in rem (it follows the user's default font size) and live (it flips when the
 * window is resized or the device rotated).
 *
 *   overlay  The product fills the stage and the copy sits over it, under a
 *            scrim. Needs room for both: a desktop-sized, landscape viewport.
 *   split    Landscape with little height: the copy takes one column and the
 *            product the other, so neither is squeezed vertically.
 *   stacked  Everything else (every portrait viewport, and landscape ones that
 *            have the height): the product above, the copy below.
 *
 * Only `overlay` lets text and product share pixels; the other two give each
 * their own box, so they cannot overlap.
 */

/**
 * The literals `Hero.module.css` and `ScrollStory.module.css` repeat in their
 * own `@media` rules (CSS cannot read these). Keep them in step.
 */
export const LAYOUT_QUERIES = {
  wide: '(min-width: 64rem)',
  tall: '(min-height: 40rem)',
  landscape: '(orientation: landscape)',
} as const

/**
 * Below this height the pinned stage cannot hold a chapter's copy: a phone on
 * its side at its smallest, or a window zoomed to 400% (WCAG 1.4.10 asks a page
 * to survive that, at 320 by 256 CSS pixels). The story is then shown unpinned,
 * the way reduced motion shows it, so nothing is ever cut off.
 */
export const CRAMPED_QUERY = '(max-height: 20rem)'

export type StoryLayout = 'overlay' | 'stacked' | 'split'

export interface LayoutSignals {
  /** `LAYOUT_QUERIES.wide` matches. */
  readonly wide: boolean
  /** `LAYOUT_QUERIES.tall` matches. */
  readonly tall: boolean
  /** `LAYOUT_QUERIES.landscape` matches. */
  readonly landscape: boolean
}

export function resolveStoryLayout({ wide, tall, landscape }: LayoutSignals): StoryLayout {
  if (wide && tall && landscape) return 'overlay'
  if (landscape && !tall) return 'split'
  return 'stacked'
}

export interface StoryLayoutConfig {
  /** How the poses adapt: `offsetY` lifts the lens to leave room for copy under it, which only `overlay` needs. */
  readonly view: StoryView
  /** Time constant, in ms, of the ease between the scroll position and what is shown. 0 follows the scroll exactly. */
  readonly smoothingMs: number
  /** Cap on canvas pixels per CSS pixel. */
  readonly maxDpr: number
  /** Cap on the canvas's total backing-store pixels: the whole canvas is redrawn every frame, so this is the cost knob. */
  readonly maxPixels: number
}

export const STORY_LAYOUTS: Readonly<Record<StoryLayout, StoryLayoutConfig>> = {
  overlay: {
    view: { zoomGain: 1, offsetY: 0.1 },
    smoothingMs: 90,
    maxDpr: 2,
    maxPixels: 6_000_000,
  },
  // The canvas is only the lens's own zone, so it is already small; the lens is centered in it and not lifted.
  stacked: {
    view: { zoomGain: 1, offsetY: 0 },
    smoothingMs: 70,
    maxDpr: 2,
    maxPixels: 2_500_000,
  },
  split: {
    view: { zoomGain: 1, offsetY: 0 },
    smoothingMs: 70,
    maxDpr: 2,
    maxPixels: 2_000_000,
  },
}
