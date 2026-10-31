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

/**
 * How far down the page the viewport has scrolled: 0 at the top, 1 when the
 * bottom of the page is in view. A page that fits the viewport has nowhere to
 * scroll and reads 0. Clamped, so overscroll (rubber-banding) cannot leave 0..1.
 */
export function pageProgress(scrollY: number, scrollHeight: number, viewportHeight: number): number {
  const scrollable = scrollHeight - viewportHeight
  return scrollable > 0 ? clamp01(scrollY / scrollable) : 0
}

/**
 * Reports `pageProgress` while the page scrolls, with the same discipline as
 * `trackScrollProgress`: passive listeners, one measurement per frame, and a
 * callback only when the value changes. The document's height is observed too,
 * because it changes without a scroll or a resize (fonts arriving, the story
 * switching layouts). Returns a cleanup function.
 */
export function trackPageProgress(onProgress: (progress: number) => void): () => void {
  const root = document.documentElement
  let frame = 0
  let last = Number.NaN

  const measure = () => {
    frame = 0
    const progress = pageProgress(window.scrollY, root.scrollHeight, root.clientHeight)
    if (progress === last) return
    last = progress
    onProgress(progress)
  }

  const schedule = () => {
    if (frame === 0) frame = requestAnimationFrame(measure)
  }

  const resizeObserver = new ResizeObserver(schedule)
  resizeObserver.observe(root)

  measure()
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)

  return () => {
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    resizeObserver.disconnect()
    cancelAnimationFrame(frame)
  }
}
