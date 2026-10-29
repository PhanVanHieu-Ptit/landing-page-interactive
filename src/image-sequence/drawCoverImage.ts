import type { FitMode, FocalPoint } from './imageSequence.types'

/** A source rectangle and a destination rectangle, in the argument order of nine-argument `drawImage`. */
export interface FitRect {
  sx: number
  sy: number
  sw: number
  sh: number
  dx: number
  dy: number
  dw: number
  dh: number
}

export interface DrawCoverOptions {
  /** Defaults to `'cover'`. */
  fit?: FitMode | undefined
  /** Defaults to the center. */
  focal?: FocalPoint | undefined
}

const CENTER: FocalPoint = { x: 0.5, y: 0.5 }

/** Clamps one focal coordinate; anything that is not a finite number falls back to the center. */
const axis = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5)

/**
 * Works out which part of a `srcW` × `srcH` image goes where in a `dstW` ×
 * `dstH` box, without ever distorting the image.
 *
 * - `cover` crops the source to the box's aspect ratio and fills the whole box.
 *   Cropping the source, rather than drawing past the canvas edge, keeps the
 *   sampled rectangle exact.
 * - `contain` draws the whole image at the largest size that fits. One
 *   destination axis equals the box exactly and the other is rounded to a
 *   whole pixel, so the bars have crisp edges and the aspect error stays under
 *   one pixel.
 *
 * `dstW` and `dstH` are expected in whole device pixels (a canvas backing
 * store). Returns null when either size is zero or not a number, since there is
 * nothing to draw.
 */
export function fitRect(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  fit: FitMode = 'cover',
  focal: FocalPoint = CENTER,
): FitRect | null {
  if (!(srcW > 0 && srcH > 0 && dstW > 0 && dstH > 0)) return null
  const fx = axis(focal.x)
  const fy = axis(focal.y)

  if (fit === 'cover') {
    const scale = Math.max(dstW / srcW, dstH / srcH)
    // Capped at the source size: dividing by a scale derived from the same numbers can land a hair above it.
    const sw = Math.min(srcW, dstW / scale)
    const sh = Math.min(srcH, dstH / scale)
    return { sx: (srcW - sw) * fx, sy: (srcH - sh) * fy, sw, sh, dx: 0, dy: 0, dw: dstW, dh: dstH }
  }

  const widthLimited = dstW / srcW <= dstH / srcH
  const scale = widthLimited ? dstW / srcW : dstH / srcH
  const dw = widthLimited ? dstW : Math.max(1, Math.round(srcW * scale))
  const dh = widthLimited ? Math.max(1, Math.round(srcH * scale)) : dstH
  return {
    sx: 0,
    sy: 0,
    sw: srcW,
    sh: srcH,
    dx: Math.round((dstW - dw) * fx),
    dy: Math.round((dstH - dh) * fy),
    dw,
    dh,
  }
}

/**
 * Natural pixel size. An `<img>`'s `width` is its rendered size, which is 0 until it is laid out. The
 * `typeof` guard keeps this callable where the class does not exist (workers, tests).
 */
function naturalSize(image: ImageBitmap | HTMLImageElement) {
  return typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement
    ? { width: image.naturalWidth, height: image.naturalHeight }
    : { width: image.width, height: image.height }
}

/**
 * Draws `image` into the top-left `dstW` × `dstH` device pixels of `ctx`, like
 * `object-fit` and `object-position` do for an `<img>`. The context transform
 * is expected to be the identity, so the rectangles land on whole pixels.
 * The canvas is only cleared when the image leaves bars; a `cover` draw
 * overwrites everything, which is why frames must be opaque.
 */
export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: ImageBitmap | HTMLImageElement,
  dstW: number,
  dstH: number,
  options: DrawCoverOptions = {},
): void {
  const { width, height } = naturalSize(image)
  const rect = fitRect(width, height, dstW, dstH, options.fit, options.focal)
  if (!rect) return
  if (rect.dw < dstW || rect.dh < dstH) ctx.clearRect(0, 0, dstW, dstH)
  ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, rect.dx, rect.dy, rect.dw, rect.dh)
}
