import type { ImageSequenceSource, ProgressRange, ResolvedImageSequenceSource } from '../imageSequence.types'

/** Frames behind the playhead count this many times as far as frames ahead: scrolling usually continues forward. */
const BEHIND_PENALTY = 2.5

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Truncates to a valid frame index. NaN becomes 0. */
export function clampFrameIndex(index: number, frameCount: number): number {
  return Math.min(frameCount - 1, Math.max(0, Math.trunc(index) || 0))
}

/** Applies the naming defaults and rejects values that could never address a frame. */
export function resolveSource(source: ImageSequenceSource): ResolvedImageSequenceSource {
  const digits = source.digits ?? 4
  const firstFrameNumber = source.firstFrameNumber ?? 1
  const step = source.step ?? 1
  if (!Number.isInteger(source.frameCount) || source.frameCount < 1) {
    throw new RangeError(`frameCount must be a positive integer, got ${source.frameCount}`)
  }
  if (!Number.isInteger(step) || step < 1) {
    throw new RangeError(`step must be a positive integer, got ${step}`)
  }
  if (!Number.isInteger(digits) || digits < 1) {
    throw new RangeError(`digits must be a positive integer, got ${digits}`)
  }
  if (!Number.isInteger(firstFrameNumber) || firstFrameNumber < 0) {
    throw new RangeError(`firstFrameNumber must be a non-negative integer, got ${firstFrameNumber}`)
  }
  return {
    frameCount: source.frameCount,
    baseUrl: source.baseUrl.replace(/\/+$/, ''),
    prefix: source.prefix ?? 'frame-',
    digits,
    firstFrameNumber,
    step,
    extension: (source.extension ?? 'webp').replace(/^\./, ''),
  }
}

/** URL of the frame at zero-based `index`, following the naming convention in `ImageSequenceSource`. */
export function buildFrameUrl(source: ResolvedImageSequenceSource, index: number): string {
  const number = String(source.firstFrameNumber + index * source.step).padStart(source.digits, '0')
  return `${source.baseUrl}/${source.prefix}${number}.${source.extension}`
}

/**
 * Maps progress to a frame so that each frame owns an equal slice of the range
 * and the last one is reached just before progress hits 1. Out-of-range and NaN
 * input clamp to the ends.
 */
export function progressToFrameIndex(progress: number, frameCount: number): number {
  if (!(progress > 0)) return 0
  return Math.min(frameCount - 1, Math.floor(progress * frameCount))
}

/**
 * How expensive it is to not have frame `index` ready, given where the
 * playhead is and which way it is travelling. Lower is more urgent. One
 * function orders downloads, decodes and evictions, so they can never disagree
 * about what matters.
 */
export function frameCost(index: number, playhead: number, direction: 1 | -1): number {
  const ahead = (index - playhead) * direction
  return ahead >= 0 ? ahead : -ahead * BEHIND_PENALTY
}

/**
 * Progress of an element through the viewport, from its viewport-relative
 * `top` and its `height`. See `ProgressRange`. A `pinned` track no taller than
 * the viewport has no travel to divide by, so it degrades to `pass` instead.
 */
export function rangeProgress(range: ProgressRange, top: number, height: number, viewportHeight: number): number {
  if (!(height > 0) || !(viewportHeight > 0)) return 0
  if (range === 'pinned') {
    const travel = height - viewportHeight
    if (travel >= 1) return clamp01(-top / travel)
  }
  return clamp01((viewportHeight - top) / (viewportHeight + height))
}
