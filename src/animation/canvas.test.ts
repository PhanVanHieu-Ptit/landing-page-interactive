import { describe, expect, it } from 'vitest'
import { DEFAULT_MAX_PIXELS, resolveDpr } from './canvas'

const base = { cssWidth: 1000, cssHeight: 800, devicePixelRatio: 2, maxDpr: 2, maxPixels: 10_000_000 }

describe('resolveDpr', () => {
  it('takes the screen ratio when neither cap bites', () => {
    expect(resolveDpr(base)).toBe(2)
    expect(resolveDpr({ ...base, devicePixelRatio: 1.5 })).toBe(1.5)
  })

  it('caps the ratio at maxDpr, because the extra pixels cannot be seen', () => {
    expect(resolveDpr({ ...base, devicePixelRatio: 3 })).toBe(2)
    expect(resolveDpr({ ...base, devicePixelRatio: 3, maxDpr: 1.5 })).toBe(1.5)
  })

  it('lowers the ratio until the backing store fits the pixel budget', () => {
    // 1440 x 900 is 1.296 MP of CSS pixels, so 4 MP affords sqrt(4 / 1.296) = 1.757x.
    const dpr = resolveDpr({ ...base, cssWidth: 1440, cssHeight: 900, maxPixels: 4_000_000 })
    expect(dpr).toBeCloseTo(1.757, 3)
    expect(1440 * dpr * (900 * dpr)).toBeLessThanOrEqual(4_000_000 + 1)
  })

  it('spends less on a bigger canvas, which is the point: a 5K display does not get 4x the work of a 2.5K one', () => {
    const small = resolveDpr({ ...base, cssWidth: 1440, cssHeight: 900, maxPixels: 6_000_000 })
    const large = resolveDpr({ ...base, cssWidth: 2560, cssHeight: 1440, maxPixels: 6_000_000 })
    expect(small).toBe(2)
    expect(large).toBeLessThan(small)
    expect(2560 * large * (1440 * large)).toBeLessThanOrEqual(6_000_000 + 1)
  })

  it('never goes below 1, however small the budget: a soft canvas is a worse trade than a slow one', () => {
    expect(resolveDpr({ ...base, cssWidth: 4000, cssHeight: 3000, maxPixels: 1_000_000 })).toBe(1)
  })

  it('leaves a screen that is itself under 1 alone', () => {
    expect(resolveDpr({ ...base, devicePixelRatio: 0.75 })).toBe(0.75)
    expect(resolveDpr({ ...base, cssWidth: 4000, cssHeight: 3000, devicePixelRatio: 0.75, maxPixels: 1_000_000 })).toBe(0.75)
  })

  it('falls back to 1 for a missing or nonsensical screen ratio', () => {
    expect(resolveDpr({ ...base, devicePixelRatio: 0 })).toBe(1)
    expect(resolveDpr({ ...base, devicePixelRatio: Number.NaN })).toBe(1)
  })

  it('does not divide by zero for a collapsed canvas', () => {
    expect(resolveDpr({ ...base, cssWidth: 0, cssHeight: 0 })).toBe(2)
    expect(resolveDpr({ ...base, cssWidth: 300, cssHeight: 0 })).toBe(2)
  })

  it('has a default budget that keeps a laptop-sized canvas sharp', () => {
    // The Hero's lens at 1440 x 900 is a 666px square: well inside the default, so no loss there.
    expect(resolveDpr({ ...base, cssWidth: 666, cssHeight: 666, maxPixels: DEFAULT_MAX_PIXELS })).toBe(2)
  })
})
