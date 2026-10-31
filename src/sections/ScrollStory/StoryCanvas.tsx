import { useEffect, useRef } from 'react'
import { createLensRenderer, type LensRenderer } from '@/animation/lens-renderer'
import { useDevicePixelRatio } from '@/hooks/useDevicePixelRatio'
import { useElementSize } from '@/hooks/useElementSize'
import { cx } from '@/lib/cx'
import styles from './StoryCanvas.module.css'

interface StoryCanvasProps {
  /** `| undefined` because CSS Module lookups are typed `string | undefined`. */
  className?: string | undefined
  /** Cap on canvas pixels per CSS pixel. */
  maxDpr: number
<<<<<<< Updated upstream
=======
  /** The story is not scrubbing, so the canvas only ever shows the finished lens; the description says so. */
  still?: boolean
  /** Cap on the canvas's total pixels: it is redrawn in full every frame. `undefined` takes the default budget. */
  maxPixels?: number | undefined
>>>>>>> Stashed changes
  /**
   * Hands over the painter once the canvas has a size, and again whenever it
   * is replaced (a resize, a new cap); null when it goes away. The story
   * draws through it, so this component renders once and never again per frame.
   */
  onRenderer: (renderer: LensRenderer | null) => void
}

const SCRUBBED_LABEL =
  'A 50 mm cinema lens, lit and framed differently in each chapter: emerging from the dark, in silhouette, up close on its engraved scale, deep in its iris, and whole.'
const STILL_LABEL =
  'A 50 mm cinema lens seen from the front, with its engraved aperture scale and a ring of fifteen iris blades visible deep in the glass.'

/** The story's canvas. It fills its parent and only owns sizing; what to draw, and when, is decided elsewhere. */
<<<<<<< Updated upstream
export function StoryCanvas({ className, maxDpr, onRenderer }: StoryCanvasProps) {
=======
export function StoryCanvas({ className, maxDpr, maxPixels, still = false, onRenderer }: StoryCanvasProps) {
>>>>>>> Stashed changes
  const [wrapperRef, size] = useElementSize<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // The backing store is sized for this ratio, so a change (another display, a zoom) rebuilds the renderer.
  const pixelRatio = useDevicePixelRatio()
  // The latest callback, without making it a dependency: a new function must not rebuild the renderer.
  const onRendererRef = useRef(onRenderer)
  useEffect(() => {
    onRendererRef.current = onRenderer
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.width < 1 || size.height < 1) return undefined

    const renderer = createLensRenderer(canvas, size.width, size.height, { maxDpr })
    if (!renderer) return undefined

    onRendererRef.current(renderer)
    return () => {
      renderer.dispose()
      onRendererRef.current(null)
    }
<<<<<<< Updated upstream
  }, [size.width, size.height, maxDpr])
=======
  }, [size.width, size.height, pixelRatio, maxDpr, maxPixels])
>>>>>>> Stashed changes

  return (
    <div ref={wrapperRef} className={cx(styles.frame, className)}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        // A <canvas> has no semantic stand-in: <img> cannot host drawing code, so role="img" is the right pattern here.
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="img"
        aria-label={still ? STILL_LABEL : SCRUBBED_LABEL}
      >
        The Aurelle 50 cinema lens.
      </canvas>
    </div>
  )
}
