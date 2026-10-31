import { describe, expect, it } from 'vitest'
import type { ImageSequenceSource } from '../imageSequence.types'
import { chooseTier, loaderOptionsForTier, sourceForTier, type DeviceSignals } from './tiers'

const desktop: DeviceSignals = { viewportWidth: 1440, viewportHeight: 900 }
const phone: DeviceSignals = { viewportWidth: 390, viewportHeight: 844 }

describe('chooseTier', () => {
  it('gives a desktop, and a device that reports nothing, the full set', () => {
    expect(chooseTier(desktop)).toBe('full')
    expect(chooseTier({ ...desktop, deviceMemory: 8, effectiveType: '4g', saveData: false })).toBe('full')
  })

  it('gives a phone the balanced set, in either orientation', () => {
    expect(chooseTier(phone)).toBe('balanced')
    expect(chooseTier({ viewportWidth: 844, viewportHeight: 390 })).toBe('balanced')
  })

  it('gives a tablet the full set, and a tablet short of memory the balanced one', () => {
    const tablet = { viewportWidth: 1024, viewportHeight: 768 }
    expect(chooseTier(tablet)).toBe('full')
    expect(chooseTier({ ...tablet, deviceMemory: 4 })).toBe('balanced')
  })

  it('gives the lite set to a visitor who asked to save data, whatever the screen', () => {
    expect(chooseTier({ ...desktop, saveData: true })).toBe('lite')
  })

  it('gives the lite set on a slow connection, and not on a fast one', () => {
    for (const effectiveType of ['slow-2g', '2g', '3g']) expect(chooseTier({ ...desktop, effectiveType })).toBe('lite')
    expect(chooseTier({ ...desktop, effectiveType: '4g' })).toBe('full')
  })

  it('gives the lite set to a device with 2 GB of memory or less', () => {
    expect(chooseTier({ ...phone, deviceMemory: 2 })).toBe('lite')
    expect(chooseTier({ ...phone, deviceMemory: 0.5 })).toBe('lite')
    expect(chooseTier({ ...phone, deviceMemory: 3 })).toBe('balanced')
  })
})

describe('loaderOptionsForTier', () => {
  it('leaves the full tier on the engine defaults, and bounds the others harder the leaner they are', () => {
    expect(loaderOptionsForTier('full')).toEqual({})
    const balanced = loaderOptionsForTier('balanced')
    const lite = loaderOptionsForTier('lite')
    expect(balanced.maxDecodedBytes).toBeGreaterThan(lite.maxDecodedBytes ?? 0)
    expect(balanced.lookahead).toBeGreaterThan(lite.lookahead ?? 0)
    expect(balanced.maxCachedBytes).toBeGreaterThan(lite.maxCachedBytes ?? 0)
  })
})

describe('sourceForTier', () => {
  const full: ImageSequenceSource = { frameCount: 240, baseUrl: '/seq' }
  const balanced: ImageSequenceSource = { frameCount: 240, baseUrl: '/seq/m' }
  const lite: ImageSequenceSource = { frameCount: 120, baseUrl: '/seq/m', step: 2 }

  it('uses the set made for the tier', () => {
    const sources = { full, balanced, lite }
    expect(sourceForTier('full', sources)).toBe(full)
    expect(sourceForTier('balanced', sources)).toBe(balanced)
    expect(sourceForTier('lite', sources)).toBe(lite)
  })

  it('falls back to the nearest richer set when a tier has none of its own', () => {
    expect(sourceForTier('balanced', { full })).toBe(full)
    expect(sourceForTier('lite', { full })).toBe(full)
    expect(sourceForTier('lite', { full, balanced })).toBe(balanced)
  })

  it('never hands a richer tier a leaner set', () => {
    expect(sourceForTier('full', { full, balanced, lite })).toBe(full)
    expect(sourceForTier('balanced', { full, lite })).toBe(full)
  })
})
