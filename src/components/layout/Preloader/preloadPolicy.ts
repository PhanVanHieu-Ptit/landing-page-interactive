import type { ReadinessOutcome } from '@/image-sequence'

/** Why the preloader let go. Only `ready` means everything it was waiting for arrived. */
export type ExitReason = 'ready' | 'unavailable' | 'stalled' | 'timeout' | 'skipped'

/** Every number that decides how long the loading screen may stay. Milliseconds. */
export interface PreloadLimits {
  /** The overlay stays at least this long, so a fast load never reads as a flash. */
  minVisibleMs: number
  /** After everything is ready, hold this long so the ring is seen to complete. */
  readyHoldMs: number
  /** Give up waiting when no frame has settled for this long. */
  stallMs: number
  /** Give up waiting this long after mount, however well loading is going. */
  maxWaitMs: number
  /** The Skip control becomes visible (it is focusable from the start). */
  skipRevealMs: number
}

const LIMITS: PreloadLimits = {
  minVisibleMs: 900,
  readyHoldMs: 280,
  stallMs: 4000,
  maxWaitMs: 8000,
  skipRevealMs: 2500,
}

/** Unmounts the overlay this long after the exit starts even if no transition ever reports its end (a hidden tab, say). */
export const EXIT_FALLBACK_MS = 2500

/** Reduced motion keeps the real percentage but not the dwell: there is no entrance worth waiting for. */
export function limitsFor(reducedMotion: boolean): PreloadLimits {
  return reducedMotion ? { ...LIMITS, minVisibleMs: 300 } : LIMITS
}

/** How many of the page's critical webfonts have been waited for. */
export interface FontLoad {
  /** Fonts that loaded. */
  loaded: number
  /** Fonts that loaded or failed: nothing more will arrive for them. */
  settled: number
  total: number
  /** Every font settled, or the wait for the rest ran out. */
  ready: boolean
}

/**
 * What the loading screen waits for when no image sequence is configured: the
 * webfonts the first screen is set in, which are the only thing the page
 * downloads before it can open. Progress is the share of them that arrived,
 * held below 1 until the wait is over (so 100% means ready and nothing else);
 * a font that failed or ran out of time shows nothing, so it is not progress,
 * but the page still opens in its fallback face.
 */
export function fontsReadiness({ loaded, total, ready }: FontLoad): { outcome: ReadinessOutcome; progress: number } {
  if (ready) return { outcome: 'ready', progress: 1 }
  return { outcome: 'pending', progress: total > 0 ? Math.min(loaded / total, 0.99) : 0 }
}

export interface PreloadInput {
  /** From `readiness(sequenceState)`. */
  outcome: ReadinessOutcome
  /** The webfonts the first screen needs have loaded, or their wait ran out. */
  fontsReady: boolean
  /** Since the preloader mounted. */
  elapsedMs: number
  /** Since a frame last settled (or since mount, before any did). */
  idleMs: number
  /** Since frames and fonts were both ready, or null while either is not. */
  readyForMs: number | null
  skipped: boolean
}

/**
 * Whether the loading screen should end now, and why. It never waits forever:
 * past `maxWaitMs`, or `stallMs` without progress, it lets go and the rest of the
 * sequence keeps loading behind the page.
 */
export function decideExit(input: PreloadInput, limits: PreloadLimits): ExitReason | null {
  // Someone asked to leave, so the minimum no longer applies.
  if (input.skipped) return 'skipped'
  if (input.elapsedMs < limits.minVisibleMs) return null

  if (input.outcome === 'unavailable') return 'unavailable'
  if (
    input.outcome === 'ready' &&
    input.fontsReady &&
    input.readyForMs !== null &&
    input.readyForMs >= limits.readyHoldMs
  ) {
    return 'ready'
  }
  if (input.elapsedMs >= limits.maxWaitMs) return 'timeout'
  if (input.idleMs >= limits.stallMs) return 'stalled'
  return null
}

/**
 * How long until time alone could change the answer of `decideExit`: 0 when it
 * already says to exit, null when only new input could. It may be early, never
 * late, so the caller waits that long, asks again and re-arms.
 */
export function nextDeadline(input: PreloadInput, limits: PreloadLimits): number | null {
  if (decideExit(input, limits) !== null) return 0

  const waits = [
    limits.minVisibleMs - input.elapsedMs,
    limits.maxWaitMs - input.elapsedMs,
    limits.stallMs - input.idleMs,
    input.readyForMs === null ? 0 : limits.readyHoldMs - input.readyForMs,
  ].filter((wait) => wait > 0)

  return waits.length > 0 ? Math.min(...waits) : null
}
