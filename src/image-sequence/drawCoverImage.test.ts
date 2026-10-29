import { describe, expect, it, vi } from 'vitest'
import { drawCoverImage, fitRect } from './drawCoverImage'

describe('fitRect: cover', () => {
  it('fills the whole box by cropping the source, never distorting it', () => {
    // A 1920×1080 frame in a 1000×1000 box: the height fits, the width is cropped.
    const rect = fitRect(1920, 1080, 1000, 1000, 'cover')
    expect(rect).not.toBeNull()
    if (!rect) return
    expect(rect).toMatchObject({ dx: 0, dy: 0, dw: 1000, dh: 1000 })
    expect(rect.sy).toBeCloseTo(0)
    expect(rect.sh).toBeCloseTo(1080)
    expect(rect.sw / rect.sh).toBeCloseTo(1) // sampled region has the box's aspect ratio
    expect(rect.sx).toBeCloseTo((1920 - 1080) / 2)
  })

  it('crops the height when the box is wider than the frame', () => {
    const rect = fitRect(1000, 1000, 2000, 1000, 'cover')
    expect(rect).toMatchObject({ sx: 0, sw: 1000, dw: 2000, dh: 1000 })
    expect(rect?.sh).toBeCloseTo(500)
    expect(rect?.sy).toBeCloseTo(250)
  })

  it('moves the crop with the focal point', () => {
    const start = fitRect(2000, 1000, 1000, 1000, 'cover', { x: 0, y: 0 })
    const end = fitRect(2000, 1000, 1000, 1000, 'cover', { x: 1, y: 1 })
    expect(start?.sx).toBe(0)
    expect(end?.sx).toBeCloseTo(1000)
  })

  it('never samples outside the source', () => {
    for (const [srcW, srcH, dstW, dstH] of [
      [1920, 1080, 1366, 768],
      [1080, 1920, 390, 844],
      [3, 7, 1001, 13],
    ] as const) {
      const rect = fitRect(srcW, srcH, dstW, dstH, 'cover', { x: 1, y: 1 })
      expect(rect).not.toBeNull()
      if (!rect) continue
      expect(rect.sx + rect.sw).toBeLessThanOrEqual(srcW + 1e-9)
      expect(rect.sy + rect.sh).toBeLessThanOrEqual(srcH + 1e-9)
    }
  })
})

describe('fitRect: contain', () => {
  it('letterboxes a wide frame in a square box, centered', () => {
    const rect = fitRect(1920, 1080, 960, 960, 'contain')
    expect(rect).toEqual({ sx: 0, sy: 0, sw: 1920, sh: 1080, dx: 0, dy: 210, dw: 960, dh: 540 })
  })

  it('pillarboxes a tall frame in a wide box', () => {
    const rect = fitRect(1000, 2000, 1000, 500, 'contain')
    expect(rect).toMatchObject({ dh: 500, dw: 250, dy: 0, dx: 375 })
  })

  it('keeps the aspect ratio to within a pixel', () => {
    const rect = fitRect(1920, 1080, 1333, 777, 'contain')
    expect(rect).not.toBeNull()
    if (!rect) return
    const expectedHeight = (rect.dw * 1080) / 1920
    expect(Math.abs(rect.dh - expectedHeight)).toBeLessThanOrEqual(1)
  })

  it('anchors the bars with the focal point', () => {
    expect(fitRect(1920, 1080, 960, 960, 'contain', { x: 0.5, y: 0 })?.dy).toBe(0)
    expect(fitRect(1920, 1080, 960, 960, 'contain', { x: 0.5, y: 1 })?.dy).toBe(420)
  })

  it('draws the whole source', () => {
    expect(fitRect(640, 480, 100, 100, 'contain')).toMatchObject({ sx: 0, sy: 0, sw: 640, sh: 480 })
  })
})

describe('fitRect: bad input', () => {
  it('returns null when there is nothing to draw', () => {
    expect(fitRect(0, 100, 100, 100)).toBeNull()
    expect(fitRect(100, 100, 0, 100)).toBeNull()
    expect(fitRect(100, 100, 100, Number.NaN)).toBeNull()
  })

  it('falls back to the center for a focal point that is not a number', () => {
    expect(fitRect(2000, 1000, 1000, 1000, 'cover', { x: Number.NaN, y: 0.5 })?.sx).toBeCloseTo(500)
  })
})

describe('drawCoverImage', () => {
  const bitmap = (width: number, height: number) => ({ width, height }) as ImageBitmap
  const context = () => {
    const ctx = { clearRect: vi.fn(), drawImage: vi.fn() }
    return { ctx, as: ctx as unknown as CanvasRenderingContext2D }
  }

  it('overwrites everything with a cover draw, so it does not clear first', () => {
    const { ctx, as } = context()
    drawCoverImage(as, bitmap(1920, 1080), 800, 600)
    expect(ctx.clearRect).not.toHaveBeenCalled()
    expect(ctx.drawImage).toHaveBeenCalledTimes(1)
    expect(ctx.drawImage.mock.calls[0]?.slice(5)).toEqual([0, 0, 800, 600])
  })

  it('clears the canvas first when contain leaves bars, so an earlier frame cannot show through', () => {
    const { ctx, as } = context()
    drawCoverImage(as, bitmap(1920, 1080), 800, 800, { fit: 'contain' })
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 800)
    expect(ctx.clearRect.mock.invocationCallOrder[0]).toBeLessThan(ctx.drawImage.mock.invocationCallOrder[0] ?? 0)
  })

  it('does not clear when contain happens to fit exactly', () => {
    const { ctx, as } = context()
    drawCoverImage(as, bitmap(1600, 900), 800, 450, { fit: 'contain' })
    expect(ctx.clearRect).not.toHaveBeenCalled()
  })

  it('draws nothing for an empty box or image', () => {
    const { ctx, as } = context()
    drawCoverImage(as, bitmap(1920, 1080), 0, 600)
    drawCoverImage(as, bitmap(0, 0), 800, 600)
    expect(ctx.drawImage).not.toHaveBeenCalled()
  })
})
