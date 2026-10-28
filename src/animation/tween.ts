/** Easing functions take and return 0 to 1. */
export type Easing = (t: number) => number

/** Quick start, long soft landing: the JS counterpart of `--ease-out-quint`. */
export const easeOutQuint: Easing = (t) => 1 - (1 - t) ** 5

interface TweenOptions {
  /** Milliseconds. */
  duration: number
  ease?: Easing
  /** Called every frame with the eased progress, ending on exactly 1. */
  onUpdate: (progress: number) => void
  onComplete?: () => void
}

/**
 * A one-shot, requestAnimationFrame-driven tween, for values CSS and the Web
 * Animations API cannot reach (canvas parameters). Returns a function that
 * cancels it; a cancelled tween never calls `onUpdate` or `onComplete` again.
 */
export function tween({ duration, ease = easeOutQuint, onUpdate, onComplete }: TweenOptions): () => void {
  let frame = 0
  let start: number | undefined

  const step = (now: number) => {
    start ??= now
    const raw = Math.min(1, (now - start) / duration)
    onUpdate(ease(raw))
    if (raw < 1) {
      frame = requestAnimationFrame(step)
    } else {
      onComplete?.()
    }
  }

  frame = requestAnimationFrame(step)
  return () => cancelAnimationFrame(frame)
}
