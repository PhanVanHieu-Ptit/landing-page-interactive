import type { ImageSequenceSource } from '@/image-sequence'

/**
 * Whether the page loads and plays the product image sequence. Off, because the
 * repo ships no frames: the story draws the procedural lens, and the loading
 * screen waits only for the webfonts, so a visit makes no failed requests.
 * Turn it on after adding the frames (see "Asset preparation" in README.md):
 * the loading screen then waits for the opening frames and the story plays the
 * sequence on its stage, from one shared loader.
 */
export const heroSequenceEnabled = false

/**
 * The 240 frames of the product sequence: `frame-0001.webp` through
 * `frame-0240.webp` in `public/sequences/aurelle-50/`. See
 * `src/image-sequence/README.md` for how to produce them. Only read when
 * `heroSequenceEnabled` is true.
 */
export const heroSequence: ImageSequenceSource = {
  frameCount: 240,
  baseUrl: `${import.meta.env.BASE_URL}sequences/aurelle-50`,
}

/** What the sequence shows, for assistive technology: a canvas has no content of its own. */
export const heroSequenceLabel =
  'The Aurelle 50 cinema lens, turning and coming apart frame by frame as the chapters advance.'

/**
 * What the loading screen waits for. `criticalFrames` is the opening of the
 * sequence (5% of it): once those are in, the page opens and the other frames
 * keep arriving behind it. The loader caps it at its decode window.
 */
export const heroSequenceLoading = {
  criticalFrames: 12,
} as const
