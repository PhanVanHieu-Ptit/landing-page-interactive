import { useEffect, useRef } from 'react'
import { fitCanvas } from '@/animation/canvas'
import { drawLens, readLensPalette } from '@/animation/lens'
import { useElementSize } from '@/hooks/useElementSize'
import { cx } from '@/lib/cx'
import styles from './ProductStage.module.css'

interface ProductStageProps {
  /** `| undefined` because CSS Module lookups are typed `string | undefined`. */
  className?: string | undefined
}

/**
 * The hero product, drawn on a canvas: one static frame for now. The renderer
 * is parametric (see `LensParams`), so a later scroll-driven scene can animate
 * it without pre-rendered assets. The artwork is described by `aria-label`;
 * everything it says is also in the page text.
 */
export function ProductStage({ className }: ProductStageProps) {
  const [wrapperRef, size] = useElementSize<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.width < 1 || size.height < 1) return undefined

    let cancelled = false
    const paint = () => {
      if (cancelled) return
      const fitted = fitCanvas(canvas, size.width, size.height)
      if (!fitted) return
      drawLens(fitted.ctx, size.width, size.height, readLensPalette(canvas))
    }

    paint()
    // The engraved scale uses the mono webfont; repaint once it has loaded.
    document.fonts.load('500 12px "JetBrains Mono"').then(paint, () => undefined)

    return () => {
      cancelled = true
    }
  }, [size.width, size.height])

  return (
    <div ref={wrapperRef} className={cx(styles.stage, className)}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        // A <canvas> has no semantic stand-in: <img> cannot host drawing code, so role="img" is the right pattern here.
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="img"
        aria-label="A 50 mm cinema lens seen from the front, lit from the upper left, with an engraved aperture scale and a ring of fifteen iris blades visible deep in the glass."
      >
        The Aurelle 50 cinema lens.
      </canvas>
    </div>
  )
}
