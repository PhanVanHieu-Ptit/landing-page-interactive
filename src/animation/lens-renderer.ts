import { fitCanvas } from './canvas'
import { drawLens, readLensPalette, type LensParams } from './lens'

export interface LensRenderer {
  /** Draws one pose. The pose is remembered, so a late webfont repaints what is on screen. */
  paint: (params: LensParams) => void
  dispose: () => void
}

interface LensRendererOptions {
  /** Cap on backing-store pixels per CSS pixel. Lower it where fill rate is scarce. */
  maxDpr: number
  /** Cap on the backing store's total pixels (see `fitCanvas`). `undefined` takes its default. */
  maxPixels?: number | undefined
}

/**
 * A long-lived painter for a scrubbed lens: it owns the context and the palette
 * so a scroll-driven loop can call `paint` every frame without re-reading the
 * tokens or re-fitting the canvas. It is made for one canvas size; when the
 * size changes, dispose it and create another. Returns null when the browser
 * refuses a 2D context.
 */
export function createLensRenderer(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  { maxDpr, maxPixels }: LensRendererOptions,
): LensRenderer | null {
  const fitted = fitCanvas(canvas, width, height, maxDpr, maxPixels)
  if (!fitted) return null

  const palette = readLensPalette(canvas)
  // Undefined until the first `paint`, so the font repaint below never draws a pose nobody asked for.
  let current: LensParams | undefined
  let disposed = false

  const draw = (params: LensParams) => drawLens(fitted.ctx, width, height, palette, params)

  // The engraved scale uses the mono webfont; repaint once it has loaded.
  document.fonts.load('500 12px "JetBrains Mono"').then(
    () => {
      if (!disposed && current) draw(current)
    },
    () => undefined,
  )

  return {
    paint(params) {
      current = params
      draw(params)
    },
    dispose() {
      disposed = true
    },
  }
}
