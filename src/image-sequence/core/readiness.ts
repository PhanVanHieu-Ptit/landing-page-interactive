import type { SequenceState } from '../imageSequence.types'

/**
 * - `pending`: the opening scene is not usable yet.
 * - `ready`: it is, and the rest of the sequence can keep loading in the background.
 * - `unavailable`: nothing can be shown (the loader gave up, or the whole opening failed), so waiting longer is pointless.
 */
export type ReadinessOutcome = 'pending' | 'ready' | 'unavailable'

/** Progress never reads higher than this until the sequence is actually ready, so 100% means ready and nothing else. */
const UNFINISHED_CEILING = 0.99

export interface Readiness {
  readonly outcome: ReadinessOutcome
  /** 0 to 1, from real counts only. 1 only when `outcome` is `ready`. */
  readonly progress: number
}

/**
 * Whether a sequence has loaded enough to be shown, for a preloader to act on.
 * "Enough" is the critical set (see `FrameLoaderOptions.criticalFrames`) with at
 * least one frame decoded, so the first draw can happen. With no critical set it
 * is the first decoded frame. Frames that failed for good count as settled
 * (nothing more will arrive for them, and the canvas draws the nearest
 * neighbor) but not toward `progress`.
 */
export function readiness(state: SequenceState): Readiness {
  if (state.status === 'error') return { outcome: 'unavailable', progress: unfinished(state) }
  if (state.status === 'complete') return { outcome: 'ready', progress: 1 }

  const settled = state.criticalTotal === 0 || state.criticalSettled >= state.criticalTotal
  if (settled && state.decoded > 0) return { outcome: 'ready', progress: 1 }
  // The opening has settled and not one frame arrived, so there is nothing to show and nothing more coming for it.
  // The loader's own give-up rule would miss this when it only asks for a few frames (`preload: 'focus'`).
  if (settled && state.criticalTotal > 0 && state.loaded === 0) return { outcome: 'unavailable', progress: 0 }

  return { outcome: 'pending', progress: unfinished(state) }
}

/**
 * Frames that arrived over frames needed, held below 1. Frames that failed are not progress: they decide when to
 * stop waiting (see `readiness`), but they show nothing, so a run of failures must not fill the ring.
 */
function unfinished(state: SequenceState): number {
  const ratio = state.criticalTotal > 0 ? state.criticalLoaded / state.criticalTotal : state.loaded / state.total
  return Math.min(ratio, UNFINISHED_CEILING)
}
