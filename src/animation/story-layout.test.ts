import { describe, expect, it } from 'vitest'
import { LAYOUT_QUERIES, resolveStoryLayout, STORY_LAYOUTS, type StoryLayout } from './story-layout'

describe('resolveStoryLayout', () => {
  // [wide, tall, landscape] -> layout, over all eight combinations.
  const cases: [boolean, boolean, boolean, StoryLayout][] = [
    [true, true, true, 'overlay'], // laptop, desktop, tablet in landscape with room
    [true, false, true, 'split'], // a wide window with little height
    [false, false, true, 'split'], // a phone on its side
    [false, true, true, 'stacked'], // a small landscape window with height to spare
    [true, true, false, 'stacked'], // a 1024px-wide tablet held upright: tall enough that an overlay would collide
    [true, false, false, 'stacked'],
    [false, true, false, 'stacked'], // a phone or tablet in portrait
    [false, false, false, 'stacked'],
  ]

  it.each(cases)('wide %s, tall %s, landscape %s gives %s', (wide, tall, landscape, expected) => {
    expect(resolveStoryLayout({ wide, tall, landscape })).toBe(expected)
  })

  it('only lets the copy share pixels with the product in the overlay layout', () => {
    const layouts = new Set<StoryLayout>()
    for (const wide of [true, false]) {
      for (const tall of [true, false]) {
        for (const landscape of [true, false]) layouts.add(resolveStoryLayout({ wide, tall, landscape }))
      }
    }
    expect([...layouts].sort()).toEqual(['overlay', 'split', 'stacked'])
    // Only the overlay needs the lens lifted out of the copy's way.
    expect(STORY_LAYOUTS.stacked.view.offsetY).toBe(0)
    expect(STORY_LAYOUTS.split.view.offsetY).toBe(0)
    expect(STORY_LAYOUTS.overlay.view.offsetY).toBeGreaterThan(0)
  })
})

describe('STORY_LAYOUTS', () => {
  it('gives every layout a positive pixel budget and a sane density cap', () => {
    for (const config of Object.values(STORY_LAYOUTS)) {
      expect(config.maxPixels).toBeGreaterThan(0)
      expect(config.maxDpr).toBeGreaterThanOrEqual(1)
      expect(config.smoothingMs).toBeGreaterThanOrEqual(0)
    }
  })

  it('spends the most pixels where the canvas is biggest', () => {
    expect(STORY_LAYOUTS.overlay.maxPixels).toBeGreaterThan(STORY_LAYOUTS.stacked.maxPixels)
    expect(STORY_LAYOUTS.stacked.maxPixels).toBeGreaterThan(STORY_LAYOUTS.split.maxPixels)
  })
})

describe('LAYOUT_QUERIES', () => {
  it('stays in rem, so the layout follows the user’s default font size', () => {
    expect(LAYOUT_QUERIES.wide).toContain('rem')
    expect(LAYOUT_QUERIES.tall).toContain('rem')
  })
})
