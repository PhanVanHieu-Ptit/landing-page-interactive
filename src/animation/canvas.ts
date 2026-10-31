/** Acquires a 2D context, or null when the browser refuses one. */
export function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  return canvas.getContext('2d')
}

export interface FittedCanvas {
  ctx: CanvasRenderingContext2D
  /** Backing-store pixels per CSS pixel actually used. */
  dpr: number
}

/** Default cap on a canvas's backing store, in pixels (4 MP: 1440 x 900 at 1.75x). */
export const DEFAULT_MAX_PIXELS = 4_000_000

export interface DprInputs {
  cssWidth: number
  cssHeight: number
  devicePixelRatio: number
  /** Cap on pixels per CSS pixel: beyond it the extra pixels are not visible. */
  maxDpr: number
  /** Cap on the backing store's total pixels. */
  maxPixels: number
}

/**
 * Pixels per CSS pixel for a canvas: the screen's own ratio, held down by two
 * caps. `maxDpr` is about what the eye can see; `maxPixels` is about what the
 * device can afford, because these canvases are redrawn in full every frame, so
 * the cost is the area times the ratio squared, and a big screen (a 5K display,
 * a tablet in landscape) can ask for several times what a phone does. The
 * budget never pushes the ratio below 1 (or below the screen's own, if that is
 * under 1): a soft canvas is a worse trade than a slow one.
 */
export function resolveDpr({ cssWidth, cssHeight, devicePixelRatio, maxDpr, maxPixels }: DprInputs): number {
  const screen = devicePixelRatio > 0 ? devicePixelRatio : 1
  const wanted = Math.min(screen, maxDpr)

  const area = cssWidth * cssHeight
  if (!(area > 0)) return wanted

  const affordable = Math.sqrt(maxPixels / area)
  return Math.min(wanted, Math.max(affordable, Math.min(1, wanted)))
}

/**
 * Sizes the canvas backing store for the device pixel ratio and returns a
 * context whose coordinate system is CSS pixels. The ratio is capped twice (see
 * `resolveDpr`): `maxDpr` (default 2) for what is visible, `maxPixels` for what
 * is affordable.
 */
export function fitCanvas(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
  maxDpr = 2,
  maxPixels = DEFAULT_MAX_PIXELS,
): FittedCanvas | null {
  const ctx = get2dContext(canvas)
  if (!ctx) return null

  const dpr = resolveDpr({ cssWidth, cssHeight, devicePixelRatio: window.devicePixelRatio, maxDpr, maxPixels })
  canvas.width = Math.max(1, Math.round(cssWidth * dpr))
  canvas.height = Math.max(1, Math.round(cssHeight * dpr))
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, dpr }
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
