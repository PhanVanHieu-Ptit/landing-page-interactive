import { describe, expect, it } from 'vitest'
import type { SequenceState } from '../imageSequence.types'
import { readiness } from './readiness'

function state(overrides: Partial<SequenceState>): SequenceState {
  return {
    status: 'loading',
    total: 240,
    loaded: 0,
    failed: 0,
    decoded: 0,
    progress: 0,
    criticalTotal: 12,
    criticalSettled: 0,
    criticalLoaded: 0,
    frameSize: null,
    error: null,
    ...overrides,
  }
}

describe('readiness', () => {
  it('measures progress against the critical set, not the whole sequence', () => {
    expect(readiness(state({ criticalSettled: 3, criticalLoaded: 3, loaded: 3, progress: 3 / 240 }))).toEqual({
      outcome: 'pending',
      progress: 0.25,
    })
  })

  it('is ready once the critical set has settled and a frame is decoded, however much of the rest is missing', () => {
    const result = readiness(state({ status: 'ready', criticalSettled: 12, criticalLoaded: 12, loaded: 12, decoded: 8, progress: 0.05 }))
    expect(result).toEqual({ outcome: 'ready', progress: 1 })
  })

  it('is not ready while the critical set is complete but nothing is decoded yet, and never reads 100% then', () => {
    const result = readiness(state({ criticalSettled: 12, criticalLoaded: 12, loaded: 12, decoded: 0 }))
    expect(result.outcome).toBe('pending')
    expect(result.progress).toBeLessThan(1)
  })

  it('is not ready while a frame is decoded but the critical set is incomplete', () => {
    expect(readiness(state({ status: 'ready', criticalSettled: 11, criticalLoaded: 11, loaded: 11, decoded: 11 })).outcome).toBe('pending')
  })

  it('counts frames that failed for good as settled, so a missing opening still completes, but not as progress', () => {
    // 6 of the 12 critical frames failed; the loader still got some frames decoded.
    const partial = { criticalSettled: 6, criticalLoaded: 3, loaded: 3, failed: 3 }
    expect(readiness(state({ ...partial, status: 'ready', decoded: 3 }))).toEqual({ outcome: 'pending', progress: 0.25 })
    const done = { criticalSettled: 12, criticalLoaded: 6, loaded: 6, failed: 6 }
    expect(readiness(state({ ...done, status: 'ready', decoded: 6 }))).toEqual({ outcome: 'ready', progress: 1 })
  })

  it('without a critical set, is ready at the first decoded frame and follows overall progress before that', () => {
    expect(readiness(state({ criticalTotal: 0, progress: 0.25, loaded: 60 }))).toEqual({ outcome: 'pending', progress: 0.25 })
    expect(readiness(state({ criticalTotal: 0, progress: 0.25, loaded: 0, failed: 60 })).progress).toBe(0)
    expect(readiness(state({ criticalTotal: 0, status: 'ready', decoded: 1 })).outcome).toBe('ready')
  })

  it('is ready when everything has arrived', () => {
    expect(readiness(state({ status: 'complete', loaded: 240, progress: 1, criticalSettled: 12 }))).toEqual({
      outcome: 'ready',
      progress: 1,
    })
  })

  it('is unavailable once the whole opening has failed with nothing loaded, even if the loader has not given up', () => {
    // `preload: 'focus'` asks for only a few frames, so the loader's twelve-failure rule never trips.
    const result = readiness(state({ criticalTotal: 7, criticalSettled: 7, failed: 7 }))
    expect(result).toEqual({ outcome: 'unavailable', progress: 0 })
  })

  it('keeps waiting when the opening failed but other frames are arriving', () => {
    expect(readiness(state({ criticalSettled: 12, loaded: 3, failed: 12, decoded: 0 })).outcome).toBe('pending')
  })

  it('reports an unloadable sequence as unavailable, with progress for what arrived and not for what failed', () => {
    // Twelve failures settle the whole critical set, but nothing is on screen to show for it.
    const result = readiness(state({ status: 'error', failed: 12, criticalSettled: 12, error: 'No frames could be loaded' }))
    expect(result).toEqual({ outcome: 'unavailable', progress: 0 })
  })
})
