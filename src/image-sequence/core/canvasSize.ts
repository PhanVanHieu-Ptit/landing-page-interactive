/**
 * Reports a canvas's size in CSS pixels and the pixel ratio to draw it at, once
 * at the start and again whenever either changes. The ratio is capped at
 * `maxDpr`: beyond 2 the extra pixels cost memory and fill rate for detail
 * nobody can see.
 *
 * A box can keep its CSS size while its pixel ratio changes (the window moves
 * to another display, the page is zoomed on a layout that doesn't reflow), and
 * a `ResizeObserver` doesn't hear about that. So this also listens for the
 * current ratio to stop matching, and re-arms itself for the new one.
 *
 * Calls `onSize` outside React and outside any animation frame; the caller
 * decides when to paint. Returns a function that removes everything.
 */
export function watchCanvasSize(
  canvas: HTMLCanvasElement,
  maxDpr: number,
  onSize: (cssWidth: number, cssHeight: number, dpr: number) => void,
): () => void {
  let width = -1
  let height = -1
  let dpr = -1

  const report = (nextWidth: number, nextHeight: number) => {
    const nextDpr = Math.min(window.devicePixelRatio || 1, maxDpr)
    if (nextWidth === width && nextHeight === height && nextDpr === dpr) return
    width = nextWidth
    height = nextHeight
    dpr = nextDpr
    onSize(width, height, dpr)
  }

  const observer = new ResizeObserver(([entry]) => {
    if (entry) report(entry.contentRect.width, entry.contentRect.height)
  })
  observer.observe(canvas)

  let stopWatchingRatio = () => {}
  const watchRatio = () => {
    const query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    const onChange = () => {
      query.removeEventListener('change', onChange)
      watchRatio()
      // Nothing to report until the observer has measured the box once.
      if (width >= 0) report(width, height)
    }
    query.addEventListener('change', onChange)
    stopWatchingRatio = () => query.removeEventListener('change', onChange)
  }
  watchRatio()

  return () => {
    observer.disconnect()
    stopWatchingRatio()
  }
}
