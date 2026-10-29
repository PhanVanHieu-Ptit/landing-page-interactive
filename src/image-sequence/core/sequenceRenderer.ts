import { drawCoverImage } from '../drawCoverImage'
import type { SequenceRenderer, SequenceRendererOptions } from '../imageSequence.types'
import { drawFallbackBadge } from './devFallback'
import { progressToFrameIndex } from './sequenceMath'

/**
 * Paints an image sequence onto a canvas: the one place that decides what is on
 * it and when it changes.
 *
 *   progress source ─► frame index ─► loader.getFrame ─► drawCoverImage
 *
 * Painting is demand-driven, never a loop. There are three reasons to paint,
 * and only the first can happen on every frame:
 *
 * - The progress changed. The source already notifies from inside an animation
 *   frame, so this paints synchronously, with no second frame of latency.
 * - A frame finished decoding while the picture on screen is not the exact one
 *   wanted (a neighbor stood in for it). That arrives from a promise, so it only
 *   schedules one animation frame, however many decodes land before it.
 * - The canvas was resized or the loader failed, which are the same: schedule.
 *
 * Painting is skipped whenever the pixels on screen would not change: the same
 * frame is already drawn and the canvas has not been cleared since. That also
 * holds when only a neighbor of the wanted frame exists, so waiting for a slow
 * frame costs nothing per tick. The renderer remembers which frame is on
 * screen, never the bitmap itself, which the loader may close at any time.
 *
 * Returns null when the browser refuses a 2D context.
 */
export function createSequenceRenderer(options: SequenceRendererOptions): SequenceRenderer | null {
  const { canvas, sequence, progress, fallback, labelFallback = false } = options
  const fit = options.fit ?? 'cover'
  const focal = options.focal
  const context = canvas.getContext('2d')
  if (!context) return null
  // Narrowing does not reach the nested functions below, so they get a name that is typed as non-null.
  const ctx: CanvasRenderingContext2D = context
  ctx.imageSmoothingQuality = 'high'

  const count = sequence.frameCount
  // Size of the box in CSS pixels and the ratio it is drawn at; the canvas's own size is the product, in device pixels.
  let cssWidth = 0
  let cssHeight = 0
  let dpr = 1
  let deviceWidth = 0
  let deviceHeight = 0

  let latest = progress.get()
  // The frame whose pixels are on the canvas, or -1. A neighbor can stand in, so this is not always the wanted one.
  let drawnFrame = -1
  // The wanted index the fallback was last drawn for, or -1.
  let drawnFallback = -1
  // True once the canvas was cleared (a resize) or never painted: the next paint must happen even for the same frame.
  let dirty = true
  let frameId = 0
  let disposed = false

  const wantedIndex = () => progressToFrameIndex(latest, count)

  function drawFallbackFor(wanted: number): void {
    if (!fallback) return
    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssWidth, cssHeight)
    try {
      fallback(ctx, {
        width: cssWidth,
        height: cssHeight,
        dpr,
        frameIndex: wanted,
        frameCount: count,
        progress: latest,
        error: sequence.getState().error,
      })
    } catch (error) {
      // A broken stand-in must not take the scroll listener down with it. Drawn once per frame index, so this logs at most that often.
      console.error('[image-sequence] The fallback threw:', error)
    }
    if (labelFallback) drawFallbackBadge(ctx)
    ctx.restore()
  }

  function render(): void {
    if (disposed || deviceWidth < 1) return
    const wanted = wantedIndex()
    // Reorders downloads and decodes around the playhead; it returns at once when the index has not changed.
    sequence.focus(wanted)

    const frame = sequence.getFrame(wanted)
    if (frame) {
      if (!dirty && drawnFrame === frame.index) return
      drawCoverImage(ctx, frame.bitmap, deviceWidth, deviceHeight, { fit, focal })
      drawnFrame = frame.index
      drawnFallback = -1
      dirty = false
      return
    }

    // Nothing decoded yet is just loading: leave the page's own background showing. Only a loader that gave up gets a stand-in.
    if (sequence.getState().status !== 'error') return
    if (!dirty && drawnFallback === wanted) return
    drawnFallback = wanted
    drawnFrame = -1
    dirty = false
    drawFallbackFor(wanted)
  }

  function schedule(): void {
    if (frameId !== 0 || disposed) return
    frameId = requestAnimationFrame(() => {
      frameId = 0
      render()
    })
  }

  let lastStatus = sequence.getState().status

  const unsubscribeProgress = progress.subscribe((next) => {
    latest = next
    render()
  })
  const unsubscribeFrames = sequence.subscribeFrames(() => {
    if (dirty || drawnFrame !== wantedIndex()) schedule()
  })
  const unsubscribeState = sequence.subscribeState(() => {
    const status = sequence.getState().status
    const changed = status !== lastStatus
    lastStatus = status
    // Only the transitions into and out of `error` change the picture; ordinary loading progress does not.
    if (changed && (status === 'error' || drawnFallback !== -1)) schedule()
  })

  // Tell the loader where the playhead is before the first resize arrives, so the right frame is the first one requested.
  sequence.focus(wantedIndex())

  return {
    resize(nextCssWidth, nextCssHeight, nextDpr) {
      if (disposed) return
      cssWidth = nextCssWidth
      cssHeight = nextCssHeight
      dpr = nextDpr
      if (!(cssWidth >= 1 && cssHeight >= 1)) {
        // Hidden or collapsed: keep the old backing store and paint nothing until the box has a size again.
        deviceWidth = 0
        deviceHeight = 0
        return
      }
      const width = Math.max(1, Math.round(cssWidth * dpr))
      const height = Math.max(1, Math.round(cssHeight * dpr))
      // Assigning either dimension clears the bitmap and resets the context, even to the same value, so only do it on a real change.
      if (width !== canvas.width || height !== canvas.height) {
        canvas.width = width
        canvas.height = height
        ctx.imageSmoothingQuality = 'high'
      }
      deviceWidth = width
      deviceHeight = height
      dirty = true
      schedule()
    },

    dispose() {
      disposed = true
      cancelAnimationFrame(frameId)
      frameId = 0
      unsubscribeProgress()
      unsubscribeFrames()
      unsubscribeState()
    },
  }
}
