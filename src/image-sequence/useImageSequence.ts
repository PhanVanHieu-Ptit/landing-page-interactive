import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { createFrameLoader } from './core/frameLoader'
import type { FrameLoaderOptions, ImageSequence, ImageSequenceSource, SequenceState } from './imageSequence.types'

/**
 * Loads an image sequence for as long as the calling component is mounted, and
 * returns the handle a `CanvasSequence` (and any preloader) reads from. The
 * handle never changes while the source stays the same, and nothing about it
 * causes a render: pass it down freely.
 *
 * `source` and `options` may be inline objects. They are compared by value, so a
 * new literal on every render does not restart the download; changing any
 * field does, and discards what was loaded. Frames are requested nearest the
 * playhead first, a few at a time, and only a window of them is kept decoded
 * (see `createFrameLoader`).
 *
 * With reduced motion the sequence never scrubs, so unless `options.preload`
 * says otherwise only the frames around the one on screen are downloaded.
 */
export function useImageSequence(source: ImageSequenceSource, options: FrameLoaderOptions = {}): ImageSequence {
  const { frameCount, baseUrl, prefix, digits, firstFrameNumber, step, extension } = source
  const {
    fetchConcurrency,
    decodeConcurrency,
    maxDecodedFrames,
    retries,
    retryDelayMs,
    initialFrame,
    criticalFrames,
    requestTimeoutMs,
  } = options
  const reducedMotion = usePrefersReducedMotion()
  const preload = options.preload ?? (reducedMotion ? 'focus' : 'all')

  // Pure: creating a loader requests nothing, so it is safe for React to rebuild or discard this.
  const loader = useMemo(
    () =>
      createFrameLoader(
        { frameCount, baseUrl, prefix, digits, firstFrameNumber, step, extension },
        {
          fetchConcurrency,
          decodeConcurrency,
          maxDecodedFrames,
          retries,
          retryDelayMs,
          initialFrame,
          criticalFrames,
          requestTimeoutMs,
        },
      ),
    [
      frameCount,
      baseUrl,
      prefix,
      digits,
      firstFrameNumber,
      step,
      extension,
      fetchConcurrency,
      decodeConcurrency,
      maxDecodedFrames,
      retries,
      retryDelayMs,
      initialFrame,
      criticalFrames,
      requestTimeoutMs,
    ],
  )

  // Before `start`, so the very first request already follows the right mode.
  useEffect(() => {
    loader.setPreload(preload)
  }, [loader, preload])

  // The loader defers its first request by a microtask, which is what lets StrictMode's mount, unmount, mount fetch each frame once.
  useEffect(() => {
    loader.start()
    return () => loader.stop()
  }, [loader])

  return loader
}

/**
 * Real loading progress: how many frames arrived, how many failed for good, and
 * whether the sequence is usable (`status`). Re-renders at most once per
 * animation frame while frames arrive, so use it for a preloader or an error
 * message, never to drive the picture.
 */
export function useSequenceState(sequence: ImageSequence): SequenceState {
  return useSyncExternalStore(sequence.subscribeState, sequence.getState, sequence.getState)
}
