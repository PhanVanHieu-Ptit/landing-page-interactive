import { describe, expect, it } from 'vitest'
import { decideExit, fontsReadiness, limitsFor, nextDeadline, type PreloadInput } from './preloadPolicy'

const limits = limitsFor(false)

const input = (overrides: Partial<PreloadInput> = {}): PreloadInput => ({
  outcome: 'pending',
  fontsReady: true,
  elapsedMs: 0,
  idleMs: 0,
  readyForMs: null,
  skipped: false,
  ...overrides,
})

describe('decideExit', () => {
  it('waits while the sequence is loading', () => {
    expect(decideExit(input({ elapsedMs: 2000, idleMs: 100 }), limits)).toBeNull()
  })

  it('does not exit before the minimum visible time, even when everything is ready', () => {
    expect(decideExit(input({ outcome: 'ready', readyForMs: 1000, elapsedMs: limits.minVisibleMs - 1 }), limits)).toBeNull()
  })

  it('exits when frames and fonts are ready and the hold has passed', () => {
    const ready = { outcome: 'ready', elapsedMs: 1500 } as const
    expect(decideExit(input({ ...ready, readyForMs: limits.readyHoldMs }), limits)).toBe('ready')
    expect(decideExit(input({ ...ready, readyForMs: limits.readyHoldMs - 1 }), limits)).toBeNull()
  })

  it('does not call it ready while the fonts are still loading', () => {
    expect(decideExit(input({ outcome: 'ready', fontsReady: false, readyForMs: null, elapsedMs: 2000 }), limits)).toBeNull()
  })

  it('leaves as soon as the minimum has passed when the sequence cannot load', () => {
    expect(decideExit(input({ outcome: 'unavailable', elapsedMs: limits.minVisibleMs }), limits)).toBe('unavailable')
    expect(decideExit(input({ outcome: 'unavailable', elapsedMs: 100 }), limits)).toBeNull()
  })

  it('gives up after a stall, and after the hard ceiling even when frames keep arriving', () => {
    expect(decideExit(input({ elapsedMs: 5000, idleMs: limits.stallMs }), limits)).toBe('stalled')
    expect(decideExit(input({ elapsedMs: limits.maxWaitMs, idleMs: 10 }), limits)).toBe('timeout')
  })

  it('prefers ready over a stall that happens to coincide with it', () => {
    const result = decideExit(
      input({ outcome: 'ready', readyForMs: 500, elapsedMs: 6000, idleMs: limits.stallMs }),
      limits,
    )
    expect(result).toBe('ready')
  })

  it('lets a skip through at any time', () => {
    expect(decideExit(input({ skipped: true, elapsedMs: 10 }), limits)).toBe('skipped')
  })

  it('shortens only the minimum for reduced motion', () => {
    const reduced = limitsFor(true)
    expect(reduced.minVisibleMs).toBeLessThan(limits.minVisibleMs)
    expect({ ...reduced, minVisibleMs: limits.minVisibleMs }).toEqual(limits)
  })
})

describe('nextDeadline', () => {
  it('is zero when the answer is already to exit', () => {
    expect(nextDeadline(input({ skipped: true }), limits)).toBe(0)
  })

  it('points at the earliest moment time alone changes the answer', () => {
    expect(nextDeadline(input({ elapsedMs: 100, idleMs: 100 }), limits)).toBe(limits.minVisibleMs - 100)
    expect(nextDeadline(input({ elapsedMs: 1000, idleMs: 3000 }), limits)).toBe(limits.stallMs - 3000)
    expect(nextDeadline(input({ outcome: 'ready', elapsedMs: 2000, idleMs: 0, readyForMs: 100 }), limits)).toBe(
      limits.readyHoldMs - 100,
    )
  })

  it('is never negative or zero while the answer is to wait, so re-arming cannot spin', () => {
    for (const elapsedMs of [0, 899, 900, 3999, 7999]) {
      const wait = nextDeadline(input({ elapsedMs, idleMs: 0 }), limits)
      if (decideExit(input({ elapsedMs, idleMs: 0 }), limits) === null) expect(wait).toBeGreaterThan(0)
    }
  })
})

describe('fontsReadiness', () => {
  it('counts only the fonts that arrived, and never reads 100% before the wait is over', () => {
    expect(fontsReadiness({ loaded: 0, settled: 0, total: 4, ready: false })).toEqual({ outcome: 'pending', progress: 0 })
    expect(fontsReadiness({ loaded: 2, settled: 3, total: 4, ready: false })).toEqual({ outcome: 'pending', progress: 0.5 })
    expect(fontsReadiness({ loaded: 4, settled: 4, total: 4, ready: false }).progress).toBe(0.99)
  })

  it('is ready, at 100%, once the wait is over, even if a font failed or ran out of time', () => {
    expect(fontsReadiness({ loaded: 4, settled: 4, total: 4, ready: true })).toEqual({ outcome: 'ready', progress: 1 })
    expect(fontsReadiness({ loaded: 1, settled: 2, total: 4, ready: true })).toEqual({ outcome: 'ready', progress: 1 })
  })

  it('does not divide by zero with nothing to wait for', () => {
    expect(fontsReadiness({ loaded: 0, settled: 0, total: 0, ready: false })).toEqual({ outcome: 'pending', progress: 0 })
  })
})
