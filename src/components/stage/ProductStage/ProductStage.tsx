import { useEffect, useLayoutEffect, useRef } from 'react'
import { fitCanvas } from '@/animation/canvas'
import { DEFAULT_LENS_PARAMS, drawLens, readLensPalette, type LensParams } from '@/animation/lens'
import { LENS_INTRO_START, playLensIntro, playStageEntrance } from '@/animation/stage-intro'
import { useElementSize } from '@/hooks/useElementSize'
import { useIntroGate } from '@/hooks/useIntroGate'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cx } from '@/lib/cx'
import styles from './ProductStage.module.css'

interface ProductStageProps {
  /** `| undefined` because CSS Module lookups are typed `string | undefined`. */
  className?: string | undefined
  /** Play the entrance once: the lens fades in as its iris opens. Skipped under reduced motion. */
  introduce?: boolean
}

/**
 * The hero product, drawn on a canvas. The renderer is parametric (see
 * `LensParams`), so it can be animated without pre-rendered assets: today by
 * the one-shot entrance (held until the preloader hands over), later by a
 * scroll-driven scene. The artwork is described by `aria-label`; everything it
 * says is also in the page text.
 */
export function ProductStage({ className, introduce = false }: ProductStageProps) {
  const [wrapperRef, size] = useElementSize<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const gate = useIntroGate()
  // Set when the iris has finished opening, so a later resize repaints the resting lens instead of replaying it.
  const introduced = useRef(false)
  const animate = introduce && !reducedMotion

  // Before first paint, so the lens never shows at full strength for a frame.
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current
    if (!animate || !wrapper) return undefined
    return playStageEntrance(wrapper, gate.released)
  }, [animate, wrapperRef, gate])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.width < 1 || size.height < 1) return undefined

    const fitted = fitCanvas(canvas, size.width, size.height)
    if (!fitted) return undefined

    const palette = readLensPalette(canvas)
    let current: LensParams = DEFAULT_LENS_PARAMS
    const paint = (params: LensParams) => {
      current = params
      drawLens(fitted.ctx, size.width, size.height, palette, params)
    }

    let cancelIntro: (() => void) | undefined
    if (animate && !introduced.current) {
      paint(LENS_INTRO_START)
      cancelIntro = playLensIntro(
        paint,
        () => {
          introduced.current = true
        },
        gate.released,
      )
    } else {
      paint(DEFAULT_LENS_PARAMS)
    }

    // The engraved scale uses the mono webfont; repaint once it has loaded.
    let cancelled = false
    document.fonts.load('500 12px "JetBrains Mono"').then(
      () => {
        if (!cancelled) paint(current)
      },
      () => undefined,
    )

    return () => {
      cancelled = true
      cancelIntro?.()
    }
  }, [size.width, size.height, animate, gate])

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
