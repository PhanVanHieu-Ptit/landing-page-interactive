import { readDurationMs, readToken } from './canvas'
import { DEFAULT_LENS_PARAMS, type LensParams } from './lens'
import { tween } from './tween'

/** The lens opens from nearly stopped down, with its aperture scale turned slightly off its resting position. */
const FROM = { irisOpen: 0.15, ringRotation: -0.6 } as const
const IRIS_MS = 1600

const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress

/** Lens parameters `progress` (0 to 1) of the way from the opening pose to the resting one. */
export function lensParamsAt(progress: number): LensParams {
  return {
    ...DEFAULT_LENS_PARAMS,
    irisOpen: lerp(FROM.irisOpen, DEFAULT_LENS_PARAMS.irisOpen, progress),
    ringRotation: lerp(FROM.ringRotation, DEFAULT_LENS_PARAMS.ringRotation, progress),
  }
}

/** The frame to show before the first tick, so the resting lens never flashes. */
export const LENS_INTRO_START: LensParams = lensParamsAt(0)

/**
 * Opens the iris over ~1.6 s, calling `onFrame` with the parameters for each
 * frame. It begins when `start` resolves (immediately by default); until then
 * the caller's start pose stays on the canvas. Returns a cancel function.
 */
export function playLensIntro(
  onFrame: (params: LensParams) => void,
  onComplete: () => void,
  start: Promise<void> = Promise.resolve(),
): () => void {
  let cancelled = false
  let cancelTween: (() => void) | undefined
  start.then(() => {
    if (cancelled) return
    cancelTween = tween({ duration: IRIS_MS, onUpdate: (progress) => onFrame(lensParamsAt(progress)), onComplete })
  })
  return () => {
    cancelled = true
    cancelTween?.()
  }
}

/**
 * Fades the product in while it settles from a slight scale-up, using the Web
 * Animations API. It is created paused, which holds the start pose, and plays
 * when `start` resolves (immediately by default); `fill: 'backwards'` releases
 * the element afterwards. Returns a cancel function.
 */
export function playStageEntrance(element: HTMLElement, start: Promise<void> = Promise.resolve()): () => void {
  const animation = element.animate(
    [
      { opacity: 0, transform: 'scale(1.06)' },
      { opacity: 1, transform: 'scale(1)' },
    ],
    {
      duration: readDurationMs(element, '--duration-cinematic'),
      easing: readToken(element, '--ease-out-expo'),
      fill: 'backwards',
    },
  )
  animation.pause()
  start.then(() => {
    // A cancelled animation is idle, and playing an idle one would restart it.
    if (animation.playState === 'paused') animation.play()
  })
  return () => animation.cancel()
}
