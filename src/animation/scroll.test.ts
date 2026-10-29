import { describe, expect, it } from 'vitest'
import { pageProgress } from './scroll'

describe('pageProgress', () => {
  // A 5000px page seen through a 1000px viewport can scroll 4000px.
  const progress = (scrollY: number) => pageProgress(scrollY, 5000, 1000)

  it('is 0 at the top and 1 once the bottom of the page is in view', () => {
    expect(progress(0)).toBe(0)
    expect(progress(4000)).toBe(1)
  })

  it('measures the scrollable distance, not the page height', () => {
    expect(progress(2000)).toBe(0.5)
    expect(progress(1000)).toBe(0.25)
  })

  it('stays within 0 to 1 when the browser overscrolls', () => {
    expect(progress(-60)).toBe(0)
    expect(progress(4120)).toBe(1)
  })

  it('reads 0 for a page that fits the viewport, instead of dividing by zero', () => {
    expect(pageProgress(0, 800, 800)).toBe(0)
    expect(pageProgress(0, 600, 800)).toBe(0)
  })
})
