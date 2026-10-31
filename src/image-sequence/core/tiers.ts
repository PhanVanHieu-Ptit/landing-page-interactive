import type { FrameLoaderOptions, ImageSequenceSource } from '../imageSequence.types'

/**
 * How much of the sequence a device is given:
 *
 * - `full`: the whole set at full resolution. A desktop or laptop on a good connection.
 * - `balanced`: a phone, or a device with little memory. Smaller frames if a set exists, and less held at once.
 * - `lite`: the visitor asked to save data, the connection is slow, or the device is very short of memory.
 *
 * The thresholds in `chooseTier` and the budgets in `loaderOptionsForTier` are starting points, chosen from what a
 * decoded frame costs and not from measurements on real frames, because none exist yet. Tune them once they do.
 */
export type SequenceTier = 'full' | 'balanced' | 'lite'

/** What the device and the connection say about themselves. The optional fields are not available in every browser. */
export interface DeviceSignals {
  /** CSS pixels. */
  viewportWidth: number
  viewportHeight: number
  /** `navigator.connection.saveData`: the visitor turned on a data-saving mode. */
  saveData?: boolean | undefined
  /** `navigator.connection.effectiveType`: `slow-2g`, `2g`, `3g` or `4g`. */
  effectiveType?: string | undefined
  /** `navigator.deviceMemory`, in GB, rounded down to a power of two and capped at 8. Chromium only. */
  deviceMemory?: number | undefined
}

const SLOW_CONNECTIONS = new Set(['slow-2g', '2g', '3g'])

/** The short side of a phone, in either orientation, is at most this many CSS pixels; a small tablet's is wider. */
const PHONE_SHORT_SIDE = 500

/** Picks a tier from what the device reports. Pure: the same signals always pick the same tier. */
export function chooseTier(signals: DeviceSignals): SequenceTier {
  const { saveData, effectiveType, deviceMemory } = signals
  if (saveData === true) return 'lite'
  if (effectiveType !== undefined && SLOW_CONNECTIONS.has(effectiveType)) return 'lite'
  if (deviceMemory !== undefined && deviceMemory <= 2) return 'lite'

  if (Math.min(signals.viewportWidth, signals.viewportHeight) <= PHONE_SHORT_SIDE) return 'balanced'
  if (deviceMemory !== undefined && deviceMemory <= 4) return 'balanced'
  return 'full'
}

const MIB = 1024 * 1024

/**
 * Loader settings for a tier. `full` takes the engine's defaults. The others hold fewer decoded frames and fewer
 * files at once: on a phone a 1080p frame is 8 MB decoded, and a page that is also running a canvas, an
 * image decoder and the compositor has little to spare.
 */
export function loaderOptionsForTier(tier: SequenceTier): FrameLoaderOptions {
  switch (tier) {
    case 'full':
      return {}
    case 'balanced':
      return { maxDecodedBytes: 64 * MIB, maxCachedBytes: 64 * MIB, lookahead: 120 }
    case 'lite':
      return { maxDecodedBytes: 32 * MIB, maxCachedBytes: 32 * MIB, lookahead: 48, fetchConcurrency: 2 }
  }
}

/**
 * The frame sets on offer, richest first. Only `full` is required: a tier without a set of its own uses the
 * nearest richer one, with the tier's smaller budgets still applied, so a phone given only the full set is kept
 * inside its memory even though it downloads bigger files than it needs.
 */
export interface TierSources {
  full: ImageSequenceSource
  balanced?: ImageSequenceSource | undefined
  lite?: ImageSequenceSource | undefined
}

export function sourceForTier(tier: SequenceTier, sources: TierSources): ImageSequenceSource {
  if (tier === 'lite') return sources.lite ?? sources.balanced ?? sources.full
  if (tier === 'balanced') return sources.balanced ?? sources.full
  return sources.full
}

/** The signals of the current browser. Call it once, at startup: the tier is not meant to change while the page is open. */
export function readDeviceSignals(): DeviceSignals {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    saveData: connection?.saveData,
    effectiveType: connection?.effectiveType,
    deviceMemory: memory,
  }
}
