import { useEffect, useMemo, useRef } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cx } from '@/lib/cx'
import styles from './CanvasSequence.module.css'
import { watchCanvasSize } from './core/canvasSize'
import { devFallback } from './core/devFallback'
import { constantProgress } from './core/scrollProgress'
import { clampFrameIndex } from './core/sequenceMath'
import { createSequenceRenderer } from './core/sequenceRenderer'
import type { FitMode, FocalPoint, ImageSequence, ProgressSource, SequenceFallback } from './imageSequence.types'

export interface CanvasSequenceProps {
  /** From `useImageSequence`. */
  sequence: ImageSequence
  /** From `useScrollProgress`, or any 0..1 source. */
  progress: ProgressSource
  /** What the sequence shows, for assistive technology: a canvas has no content of its own. */
  label: string
  /** Defaults to `'cover'`. */
  fit?: FitMode | undefined
  /** Where the frame sits when it overflows or leaves bars. Defaults to the center. */
  focal?: FocalPoint | undefined
  /** Cap on canvas pixels per CSS pixel. Defaults to 2. */
  maxDpr?: number | undefined
  /**
   * Drawn when the sequence has failed to load. Defaults to a labeled
   * development stand-in in dev builds and to nothing in production, where a
   * failed sequence leaves the canvas empty so the page's own background (or a
   * poster behind the canvas) shows. `false` turns it off in dev too.
   */
  fallback?: SequenceFallback | false | undefined
  /** Hold one frame instead of scrubbing. Defaults to the visitor's `prefers-reduced-motion` setting. */
  reducedMotion?: boolean | undefined
  /** The frame to hold under reduced motion. Defaults to the last, which is usually the finished shot. */
  staticFrame?: number | undefined
  /** `| undefined` because CSS Module lookups are typed `string | undefined`. */
  className?: string | undefined
}

/**
 * A canvas that shows one frame of an image sequence for the current scroll
 * progress. It fills its parent, so the page decides the size and where it sits;
 * the engine knows nothing about layout.
 *
 * This component renders once. Scrolling, loading and resizing all go straight
 * from the progress source and the loader to the canvas (see
 * `core/sequenceRenderer.ts`), so no frame costs a React render. For loading
 * progress, read `useSequenceState` in a sibling component.
 */
export function CanvasSequence({
  sequence,
  progress,
  label,
  fit,
  focal,
  maxDpr = 2,
  fallback,
  reducedMotion,
  staticFrame,
  className,
}: CanvasSequenceProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const still = reducedMotion ?? prefersReducedMotion
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const focalX = focal?.x ?? 0.5
  const focalY = focal?.y ?? 0.5
  const resolvedFallback = fallback === false ? undefined : (fallback ?? (import.meta.env.DEV ? devFallback : undefined))

  // Under reduced motion a source that never moves holds the chosen frame; its middle, so it lands in that frame's slice.
  const source = useMemo(() => {
    if (!still) return progress
    const frame = clampFrameIndex(staticFrame ?? sequence.frameCount - 1, sequence.frameCount)
    return constantProgress((frame + 0.5) / sequence.frameCount)
  }, [still, progress, staticFrame, sequence.frameCount])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const renderer = createSequenceRenderer({
      canvas,
      sequence,
      progress: source,
      fit,
      focal: { x: focalX, y: focalY },
      fallback: resolvedFallback,
      labelFallback: import.meta.env.DEV,
    })
    if (!renderer) return undefined

    const stopWatching = watchCanvasSize(canvas, maxDpr, renderer.resize)
    return () => {
      stopWatching()
      renderer.dispose()
    }
  }, [sequence, source, fit, focalX, focalY, resolvedFallback, maxDpr])

  return (
    <canvas
      ref={canvasRef}
      className={cx(styles.canvas, className)}
      // A <canvas> has no semantic stand-in: <img> cannot host drawing code, so role="img" is the right pattern here.
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="img"
      aria-label={label}
    >
      {label}
    </canvas>
  )
}
