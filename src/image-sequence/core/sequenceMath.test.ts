import { describe, expect, it } from 'vitest'
import {
  buildFrameUrl,
  clampFrameIndex,
  frameCost,
  progressToFrameIndex,
  rangeProgress,
  resolveSource,
} from './sequenceMath'

describe('resolveSource', () => {
  it('applies the naming defaults and strips trailing slashes', () => {
    expect(resolveSource({ frameCount: 240, baseUrl: '/sequences/lens///' })).toEqual({
      frameCount: 240,
      baseUrl: '/sequences/lens',
      prefix: 'frame-',
      digits: 4,
      firstFrameNumber: 1,
      step: 1,
      extension: 'webp',
    })
  })

  it('accepts an extension written with its dot', () => {
    expect(resolveSource({ frameCount: 1, baseUrl: '/a', extension: '.avif' }).extension).toBe('avif')
  })

  it.each([
    [{ frameCount: 0, baseUrl: '/a' }, /frameCount/],
    [{ frameCount: 1.5, baseUrl: '/a' }, /frameCount/],
    [{ frameCount: 10, baseUrl: '/a', digits: 0 }, /digits/],
    [{ frameCount: 10, baseUrl: '/a', firstFrameNumber: -1 }, /firstFrameNumber/],
  ])('rejects %j', (source, message) => {
    expect(() => resolveSource(source)).toThrow(message)
  })
})

describe('buildFrameUrl', () => {
  const source = resolveSource({ frameCount: 240, baseUrl: '/sequences/lens' })

  it('names a 240-frame sequence frame-0001 through frame-0240', () => {
    expect(buildFrameUrl(source, 0)).toBe('/sequences/lens/frame-0001.webp')
    expect(buildFrameUrl(source, 9)).toBe('/sequences/lens/frame-0010.webp')
    expect(buildFrameUrl(source, 239)).toBe('/sequences/lens/frame-0240.webp')
  })

  it('is deterministic and gives every frame its own URL', () => {
    const urls = Array.from({ length: 240 }, (_, index) => buildFrameUrl(source, index))
    expect(new Set(urls).size).toBe(240)
    expect(urls).toEqual(Array.from({ length: 240 }, (_, index) => buildFrameUrl(source, index)))
  })

  it('honors a custom prefix, width, start and extension', () => {
    const custom = resolveSource({
      frameCount: 3,
      baseUrl: 'https://cdn.example/x/',
      prefix: 'lens_',
      digits: 3,
      firstFrameNumber: 0,
      extension: 'jpg',
    })
    expect(buildFrameUrl(custom, 0)).toBe('https://cdn.example/x/lens_000.jpg')
    expect(buildFrameUrl(custom, 2)).toBe('https://cdn.example/x/lens_002.jpg')
  })

  it('does not truncate a number wider than the padding', () => {
    const narrow = resolveSource({ frameCount: 2000, baseUrl: '/a', digits: 2 })
    expect(buildFrameUrl(narrow, 1234)).toBe('/a/frame-1235.webp')
  })
})

describe('progressToFrameIndex', () => {
  it('maps the ends of the range to the first and last frame', () => {
    expect(progressToFrameIndex(0, 240)).toBe(0)
    expect(progressToFrameIndex(1, 240)).toBe(239)
  })

  it('gives every frame an equal slice and reaches the last one just before 1', () => {
    expect(progressToFrameIndex(0.5, 240)).toBe(120)
    expect(progressToFrameIndex(0.999 / 240, 240)).toBe(0)
    expect(progressToFrameIndex(1.001 / 240, 240)).toBe(1)
    expect(progressToFrameIndex(239.001 / 240, 240)).toBe(239)
    expect(progressToFrameIndex(0.999999, 240)).toBe(239)
  })

  it('visits every frame, in order, as progress sweeps from 0 to 1', () => {
    const seen = new Set<number>()
    let previous = -1
    for (let step = 0; step <= 24000; step++) {
      const index = progressToFrameIndex(step / 24000, 240)
      expect(index).toBeGreaterThanOrEqual(previous)
      previous = index
      seen.add(index)
    }
    expect(seen.size).toBe(240)
  })

  it('clamps out-of-range and non-numeric input', () => {
    expect(progressToFrameIndex(-3, 240)).toBe(0)
    expect(progressToFrameIndex(7, 240)).toBe(239)
    expect(progressToFrameIndex(Number.NaN, 240)).toBe(0)
  })

  it('handles a single frame', () => {
    expect(progressToFrameIndex(0.9, 1)).toBe(0)
  })
})

describe('clampFrameIndex', () => {
  it('truncates and clamps to a valid index', () => {
    expect(clampFrameIndex(12.9, 240)).toBe(12)
    expect(clampFrameIndex(-5, 240)).toBe(0)
    expect(clampFrameIndex(999, 240)).toBe(239)
    expect(clampFrameIndex(Number.NaN, 240)).toBe(0)
  })
})

describe('frameCost', () => {
  it('is zero at the playhead and grows with distance', () => {
    expect(frameCost(50, 50, 1)).toBe(0)
    expect(frameCost(52, 50, 1)).toBeLessThan(frameCost(55, 50, 1))
  })

  it('makes frames behind the direction of travel dearer than frames ahead', () => {
    expect(frameCost(47, 50, 1)).toBeGreaterThan(frameCost(53, 50, 1))
    expect(frameCost(53, 50, -1)).toBeGreaterThan(frameCost(47, 50, -1))
  })
})

describe('rangeProgress', () => {
  const viewport = 800

  describe('pinned', () => {
    const height = 4000 // 3200 of travel

    it('is 0 until the track reaches the top, then 1 when its bottom reaches the bottom', () => {
      expect(rangeProgress('pinned', 500, height, viewport)).toBe(0)
      expect(rangeProgress('pinned', 0, height, viewport)).toBe(0)
      expect(rangeProgress('pinned', -1600, height, viewport)).toBe(0.5)
      expect(rangeProgress('pinned', -3200, height, viewport)).toBe(1)
      expect(rangeProgress('pinned', -9000, height, viewport)).toBe(1)
    })
  })

  describe('pass', () => {
    const height = 400

    it('is 0 as the element enters at the bottom and 1 as it leaves at the top', () => {
      expect(rangeProgress('pass', viewport, height, viewport)).toBe(0)
      expect(rangeProgress('pass', -height, height, viewport)).toBe(1)
      expect(rangeProgress('pass', (viewport - height) / 2, height, viewport)).toBeCloseTo(0.5)
    })
  })

  it('treats a pinned track no taller than the viewport as a pass, instead of dividing by zero', () => {
    const value = rangeProgress('pinned', 100, viewport, viewport)
    expect(Number.isFinite(value)).toBe(true)
    expect(value).toBe(rangeProgress('pass', 100, viewport, viewport))
  })

  it('returns 0 for an empty element or viewport', () => {
    expect(rangeProgress('pinned', 0, 0, viewport)).toBe(0)
    expect(rangeProgress('pass', 0, 100, 0)).toBe(0)
  })
})
