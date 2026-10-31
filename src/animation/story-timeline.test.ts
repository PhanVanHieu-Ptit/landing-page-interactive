import { describe, expect, it } from 'vitest'
import { STORY_TIMING } from './story-config'
import { STORY_LAYOUTS } from './story-layout'
import { createStoryTimeline, type StoryChapterSpec } from './story-timeline'

const sweep = (steps: number) => Array.from({ length: steps + 1 }, (_, index) => index / steps)

const timeline = createStoryTimeline(STORY_TIMING)

describe('createStoryTimeline', () => {
  describe('the shipped story', () => {
    it('never shows two chapters at once, so copy cannot overlap', () => {
      // Fine enough to land on the boundaries (multiples of 0.01) as well as inside every fade.
      for (const progress of sweep(2000)) {
        const visible = STORY_TIMING.filter((_, index) => timeline.frameOf(progress, index).presence > 0)
        expect(visible.length, `at progress ${progress}`).toBeLessThanOrEqual(1)
      }
    })

    it('shows each chapter fully, and at rest, in the middle of its range', () => {
      for (const [index, spec] of STORY_TIMING.entries()) {
        const middle = (spec.range[0] + spec.range[1]) / 2
        expect(timeline.frameOf(middle, index)).toEqual({ presence: 1, shift: 0 })
      }
    })

    it('opens on the first chapter and ends on the last, with no fade in or out at the ends', () => {
      expect(timeline.frameOf(0, 0).presence).toBe(1)
      expect(timeline.frameOf(1, STORY_TIMING.length - 1).presence).toBe(1)
    })

    it('keeps presence and shift within their bounds', () => {
      for (const progress of sweep(500)) {
        for (const index of STORY_TIMING.keys()) {
          const { presence, shift } = timeline.frameOf(progress, index)
          expect(presence).toBeGreaterThanOrEqual(0)
          expect(presence).toBeLessThanOrEqual(1)
          expect(Math.abs(shift)).toBeLessThanOrEqual(1)
        }
      }
    })

    it('advances through the chapters in order and clamps outside 0 to 1', () => {
      let previous = 0
      for (const progress of sweep(1000)) {
        const chapter = timeline.chapterAt(progress)
        expect(chapter).toBeGreaterThanOrEqual(previous)
        previous = chapter
      }
      expect(timeline.chapterAt(-1)).toBe(0)
      expect(timeline.chapterAt(2)).toBe(STORY_TIMING.length - 1)
    })

    it('answers the same for a progress whichever way it was reached, which is what makes reverse scrolling work', () => {
      const progresses = sweep(300)
      const snapshot = (progress: number) => ({
        chapter: timeline.chapterAt(progress),
        frames: STORY_TIMING.map((_, index) => timeline.frameOf(progress, index)),
        pose: timeline.poseAt(progress),
      })
      const forward = progresses.map(snapshot)
      const backward = [...progresses].reverse().map(snapshot).reverse()
      expect(backward).toEqual(forward)
    })

    it.each(Object.entries(STORY_LAYOUTS))('moves the lens smoothly in the %s layout', (_name, { view }) => {
      const framed = createStoryTimeline(STORY_TIMING, view)
      const steps = 2000
      let previous = framed.poseAt(0)
      for (const progress of sweep(steps).slice(1)) {
        const pose = framed.poseAt(progress)
        // A fade lasts 0.07 of the story and the largest zoom change is under 2, so one 1/2000 step may move well under this.
        expect(Math.abs(pose.zoom - previous.zoom), `zoom at ${progress}`).toBeLessThan(0.05)
        expect(Math.abs(pose.panX - previous.panX), `panX at ${progress}`).toBeLessThan(0.02)
        expect(Math.abs(pose.panY - previous.panY), `panY at ${progress}`).toBeLessThan(0.05)
        previous = pose
      }
    })
  })

  describe('rejects a config that would make the story inconsistent', () => {
    const chapter = (id: string, start: number, end: number, extra: Partial<StoryChapterSpec> = {}): StoryChapterSpec => ({
      id,
      range: [start, end],
      pose: { in: {} },
      ...extra,
    })

    it('with no chapters', () => {
      expect(() => createStoryTimeline([])).toThrow(/at least one chapter/)
    })

    it('with a range that is empty, backward or off the ends', () => {
      expect(() => createStoryTimeline([chapter('a', 0.5, 0.5)])).toThrow(/"a".*range/)
      expect(() => createStoryTimeline([chapter('a', 0.6, 0.4)])).toThrow(/"a".*range/)
      expect(() => createStoryTimeline([chapter('a', -0.1, 0.4)])).toThrow(/"a".*range/)
      expect(() => createStoryTimeline([chapter('a', 0.5, 1.1)])).toThrow(/"a".*range/)
    })

    it('with chapters whose ranges overlap', () => {
      expect(() => createStoryTimeline([chapter('a', 0, 0.6), chapter('b', 0.5, 1)])).toThrow(/"b" starts before "a" ends/)
    })

    it('with a fade longer than its chapter', () => {
      // `b` is not the last chapter, so both of its fades count.
      const chapters = [chapter('a', 0, 0.5), chapter('b', 0.5, 0.6, { enter: 0.08, exit: 0.05 }), chapter('c', 0.6, 1)]
      expect(() => createStoryTimeline(chapters)).toThrow(/"b".*must fit/)
    })
  })
})
