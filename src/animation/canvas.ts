/** Acquires a 2D context, or null when the browser refuses one. */
export function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  return canvas.getContext('2d')
}

export interface FittedCanvas {
  ctx: CanvasRenderingContext2D
  /** Backing-store pixels per CSS pixel actually used. */
  dpr: number
}

/**
 * Sizes the canvas backing store for the device pixel ratio and returns a
 * context whose coordinate system is CSS pixels. The ratio is capped (default
 * 2): beyond that the extra pixels cost memory and are not visible.
 */
export function fitCanvas(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
  maxDpr = 2,
): FittedCanvas | null {
  const ctx = get2dContext(canvas)
  if (!ctx) return null

  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
  canvas.width = Math.max(1, Math.round(cssWidth * dpr))
  canvas.height = Math.max(1, Math.round(cssHeight * dpr))
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, dpr }
}

/**
 * Calls `onChange` each time the screen's pixel ratio changes while the page
 * stays put: the window moves to another display, or the page is zoomed on a
 * layout that does not reflow. A `ResizeObserver` never hears about that, so a
 * canvas sized for the old ratio would go soft (or oversized) until the next
 * resize. The media query matches only the current ratio, so it re-arms itself
 * for the new one on every change. Returns a function that removes it.
 */
export function watchDevicePixelRatio(onChange: () => void): () => void {
  let stop = () => {}
  const arm = () => {
    const query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    const handle = () => {
      stop()
      arm()
      onChange()
    }
    query.addEventListener('change', handle)
    stop = () => query.removeEventListener('change', handle)
  }
  arm()
  return () => stop()
}

/**
 * Reads a CSS custom property, so canvas artwork draws from the same design
 * tokens as the stylesheet. Throws when the token is missing: a silent empty
 * string would make canvas ignore the color and paint something wrong.
 */
export function readToken(element: Element, name: `--${string}`): string {
  const value = getComputedStyle(element).getPropertyValue(name).trim()
  if (!value) throw new Error(`Design token ${name} is not defined`)
  return value
}

/** Reads a duration token (`1200ms` or `1.2s`) as milliseconds. */
export function readDurationMs(element: Element, name: `--${string}`): number {
  const value = readToken(element, name)
  const number = Number.parseFloat(value)
  return value.endsWith('ms') ? number : number * 1000
}
