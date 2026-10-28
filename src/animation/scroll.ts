const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/**
 * Reports how far `element` has scrolled out of the top of the viewport: 0 while
 * it sits at the top of the page, 1 once its bottom edge reaches the top of the
 * viewport. Scroll events are passive and coalesced to one callback per frame,
 * and the callback only fires when the value changes. Returns a cleanup function.
 */
export function trackScrollProgress(element: HTMLElement, onProgress: (progress: number) => void): () => void {
  let frame = 0
  let last = Number.NaN

  const measure = () => {
    frame = 0
    const { top, height } = element.getBoundingClientRect()
    const progress = height > 0 ? clamp01(-top / height) : 0
    if (progress === last) return
    last = progress
    onProgress(progress)
  }

  const schedule = () => {
    if (frame === 0) frame = requestAnimationFrame(measure)
  }

  measure()
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)

  return () => {
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    cancelAnimationFrame(frame)
  }
}
