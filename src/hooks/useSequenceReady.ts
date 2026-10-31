import { useCallback, useSyncExternalStore } from 'react'
import { readiness, type ImageSequence } from '@/image-sequence'

const subscribeNothing = () => () => undefined
const never = () => false

/**
 * Whether a sequence's opening is loaded and drawable (see `readiness`). False
 * for `null`, while it is still loading, and when nothing could be loaded: in
 * every one of those the page draws the procedural lens, never an empty stage,
 * and switches to the sequence only once there is something to show.
 *
 * The snapshot is a boolean, so the caller re-renders when the answer changes
 * and not each time a frame arrives, however often the loader reports.
 */
export function useSequenceReady(sequence: ImageSequence | null): boolean {
  const getSnapshot = useCallback(
    () => (sequence ? readiness(sequence.getState()).outcome === 'ready' : false),
    [sequence],
  )
  return useSyncExternalStore(sequence ? sequence.subscribeState : subscribeNothing, getSnapshot, never)
}
