import type { ImageSequenceSource } from '@/image-sequence'

/**
 * The 240 frames of the product sequence: `frame-0001.webp` through
 * `frame-0240.webp` in `public/sequences/aurelle-50/`. See
 * `src/image-sequence/README.md` for how to produce them. Until they exist the
 * page loads without them.
 */
export const heroSequence: ImageSequenceSource = {
  frameCount: 240,
  baseUrl: `${import.meta.env.BASE_URL}sequences/aurelle-50`,
}

/**
 * What the loading screen waits for. `criticalFrames` is the opening of the
 * sequence (5% of it): once those are in, the page opens and the other frames
 * keep arriving behind it. The loader caps it at its decode window.
 */
export const heroSequenceLoading = {
  criticalFrames: 12,
} as const
