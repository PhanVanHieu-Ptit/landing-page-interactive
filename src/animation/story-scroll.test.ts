import { describe, expect, it } from 'vitest'
import { isMidStory, scrollTopForProgress, shouldCarryProgress } from './story-scroll'

describe('scrollTopForProgress', () => {
  it('starts at the track and ends a pinned distance later', () => {
    expect(scrollTopForProgress(1200, 2000, 0)).toBe(1200)
    expect(scrollTopForProgress(1200, 2000, 1)).toBe(3200)
    expect(scrollTopForProgress(1200, 2000, 0.5)).toBe(2200)
  })

  it('inverts how the controller reads progress from the scroll position', () => {
    const top = 880
    const distance = 2077
    for (const progress of [0.05, 0.2, 0.37, 0.6, 0.93]) {
      const scrollY = scrollTopForProgress(top, distance, progress)
      // The controller: (scrollY - top) / distance. Whole-pixel scrolling costs under one pixel of precision.
      expect(Math.abs((scrollY - top) / distance - progress)).toBeLessThan(1 / distance)
    }
  })

  it('stays inside the story whatever it is asked for', () => {
    expect(scrollTopForProgress(500, 1000, -0.3)).toBe(500)
    expect(scrollTopForProgress(500, 1000, 1.7)).toBe(1500)
    expect(scrollTopForProgress(500, -40, 0.5)).toBe(500)
  })

  it('lands on a whole pixel', () => {
    expect(Number.isInteger(scrollTopForProgress(333.4, 1234.5, 0.4321))).toBe(true)
  })
})

describe('isMidStory', () => {
  it('is false at both ends, where the page position is already the right one, and true between', () => {
    expect(isMidStory(0)).toBe(false)
    expect(isMidStory(1)).toBe(false)
    expect(isMidStory(0.0001)).toBe(true)
    expect(isMidStory(0.5)).toBe(true)
    expect(isMidStory(0.9999)).toBe(true)
  })
})

describe('shouldCarryProgress', () => {
  it('carries the place when a rotation changes the pinned distance mid-story', () => {
    expect(shouldCarryProgress(2100, 2700, 0.4)).toBe(true)
  })

  it('does nothing when the distance is unchanged, as when only a browser bar came or went', () => {
    expect(shouldCarryProgress(2100, 2100, 0.4)).toBe(false)
  })

  it('ignores a pixel of rounding', () => {
    expect(shouldCarryProgress(2100, 2101, 0.4)).toBe(false)
    expect(shouldCarryProgress(2100, 2101.5, 0.4)).toBe(true)
  })

  it('does nothing before the story starts or after it has let go', () => {
    expect(shouldCarryProgress(2100, 2700, 0)).toBe(false)
    expect(shouldCarryProgress(2100, 2700, 1)).toBe(false)
  })
})
