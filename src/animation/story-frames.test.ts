import { describe, expect, it } from 'vitest'
import { progressToFrameIndex } from '@/image-sequence/core/sequenceMath'
import { createFrameMap, mapProgress } from './story-frames'
import type { ProgressFeed } from './story-controller'
import type { StoryChapterSpec } from './story-timeline'

const spec = (id: string, start: number, end: number, frames?: readonly [number, number]): StoryChapterSpec => ({
  id,
  range: [start, end],
  pose: { in: {} },
  ...(frames ? { frames } : {}),
})

/** Five contiguous chapters of the story's real shape. */
const RANGES = [
  [0, 0.2],
  [0.2, 0.4],
  [0.4, 0.6],
  [0.6, 0.82],
  [0.82, 1],
] as const

const undeclared = RANGES.map(([start, end], index) => spec(`c${index}`, start, end))

/** The frame the engine would show: the map's output run through its own progress-to-frame rounding. */
const frameShown = (map: (progress: number) => number, count: number, progress: number) =>
  progressToFrameIndex(map(progress), count)

const sweep = (steps: number) => Array.from({ length: steps + 1 }, (_, index) => index / steps)

describe('createFrameMap', () => {
  describe('with no frames declared', () => {
    const map = createFrameMap(undeclared, 240)

    it('plays the whole sequence at a constant pace', () => {
      for (const progress of sweep(100)) {
        expect(Math.abs(frameShown(map, 240, progress) - progress * 239)).toBeLessThanOrEqual(0.5 + 1e-9)
      }
    })

    it('starts on the first frame and ends on the last', () => {
      expect(frameShown(map, 240, 0)).toBe(0)
      expect(frameShown(map, 240, 1)).toBe(239)
    })

    it('holds the ends for progress outside 0 to 1', () => {
      expect(frameShown(map, 240, -0.5)).toBe(0)
      expect(frameShown(map, 240, 1.5)).toBe(239)
    })
  })

  describe('with every chapter declared', () => {
    const frames = [
      [0, 39],
      [40, 89],
      [90, 119],
      [120, 189],
      [190, 239],
    ] as const
    const specs = RANGES.map(([start, end], index) => spec(`c${index}`, start, end, frames[index]))
    const map = createFrameMap(specs, 240)

    it("lands on each chapter's first frame as it starts and its last as it ends", () => {
      for (const [index, [start, end]] of RANGES.entries()) {
        const [first, last] = frames[index] ?? [-1, -1]
        // Just inside the range on each side: the boundary itself belongs to both chapters.
        expect(frameShown(map, 240, end - 1e-9)).toBe(last)
        expect(frameShown(map, 240, start + 1e-9)).toBe(first)
      }
    })

    it('plays a chapter linearly between its frames', () => {
      // Craftsmanship: frames 90 to 119 over a fifth of the story, so its middle is about frame 104.5.
      const frame = frameShown(map, 240, 0.5)
      expect(frame).toBeGreaterThanOrEqual(104)
      expect(frame).toBeLessThanOrEqual(105)
    })

    it('never moves backward as progress grows', () => {
      let previous = -1
      for (const progress of sweep(1000)) {
        const frame = frameShown(map, 240, progress)
        expect(frame).toBeGreaterThanOrEqual(previous)
        previous = frame
      }
    })

    it('answers the same for a progress however it was reached', () => {
      const progresses = sweep(200)
      const forward = progresses.map((progress) => map(progress))
      const backward = [...progresses].reverse().map((progress) => map(progress))
      expect(backward.reverse()).toEqual(forward)
    })
  })

  describe('with some chapters left to fill', () => {
    it('gives an undeclared chapter the frames between its declared neighbors', () => {
      const specs = [spec('a', 0, 0.3, [0, 59]), spec('b', 0.3, 0.6), spec('c', 0.6, 1, [120, 179])]
      const map = createFrameMap(specs, 180)
      expect(frameShown(map, 180, 0.3 + 1e-9)).toBe(59)
      expect(frameShown(map, 180, 0.6 - 1e-9)).toBe(120)
    })

    it('splits a run of undeclared chapters by scroll length', () => {
      // Between frame 10 and frame 70: b owns a third of the run, c two thirds.
      const specs = [spec('a', 0, 0.2, [0, 10]), spec('b', 0.2, 0.4), spec('c', 0.4, 0.8), spec('d', 0.8, 1, [70, 99])]
      const map = createFrameMap(specs, 100)
      expect(frameShown(map, 100, 0.4)).toBe(30)
      expect(frameShown(map, 100, 0.8)).toBe(70)
    })

    it('fills from the first frame when the first chapter declares nothing', () => {
      const map = createFrameMap([spec('a', 0, 0.5), spec('b', 0.5, 1, [50, 60])], 100)
      expect(frameShown(map, 100, 0)).toBe(0)
      expect(frameShown(map, 100, 0.5 - 1e-9)).toBe(50)
    })

    it('fills to the last frame when the last chapter declares nothing', () => {
      const map = createFrameMap([spec('a', 0, 0.5, [0, 40]), spec('b', 0.5, 1)], 100)
      expect(frameShown(map, 100, 0.5 + 1e-9)).toBe(40)
      expect(frameShown(map, 100, 1)).toBe(99)
    })
  })

  it('interpolates across a gap between chapters, so the frame never jumps', () => {
    const map = createFrameMap([spec('a', 0, 0.3, [0, 30]), spec('b', 0.5, 1, [60, 99])], 100)
    expect(frameShown(map, 100, 0.4)).toBe(45)
  })

  it('holds a single frame for a one-frame sequence', () => {
    const map = createFrameMap(undeclared, 1)
    for (const progress of sweep(10)) expect(frameShown(map, 1, progress)).toBe(0)
  })

  describe('rejects', () => {
    it.each([
      ['a frame past the end', [spec('a', 0, 1, [0, 100])], /"a".*within 0 to 99/],
      ['a negative frame', [spec('a', 0, 1, [-1, 10])], /"a".*within 0 to 99/],
      ['a fractional frame', [spec('a', 0, 1, [0.5, 10])], /"a".*whole frames/],
      ['a chapter that runs backward', [spec('a', 0, 1, [50, 10])], /"a".*backward/],
      ['chapters that run backward across each other', [spec('a', 0, 0.5, [0, 60]), spec('b', 0.5, 1, [40, 99])], /"b".*before the previous/],
    ])('%s', (_name, specs, message) => {
      expect(() => createFrameMap(specs, 100)).toThrow(message)
    })

    it.each([0, -3, 2.5, Number.NaN])('a frame count of %s', (count) => {
      expect(() => createFrameMap(undeclared, count)).toThrow(/frameCount/)
    })
  })
})

describe('mapProgress', () => {
  function fakeFeed(initial: number): ProgressFeed & { emit: (value: number) => void; listeners: () => number } {
    let value = initial
    const listeners = new Set<(progress: number) => void>()
    return {
      get: () => value,
      subscribe(listener) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
      emit(next) {
        value = next
        for (const listener of listeners) listener(next)
      },
      listeners: () => listeners.size,
    }
  }

  it('passes the starting value and every update through the map', () => {
    const feed = fakeFeed(0.25)
    const mapped = mapProgress(feed, (progress) => progress * 2)
    const seen: number[] = []

    expect(mapped.get()).toBe(0.5)
    mapped.subscribe((progress) => seen.push(progress))
    feed.emit(0.1)
    feed.emit(0.4)
    expect(seen).toEqual([0.2, 0.8])
    expect(mapped.get()).toBe(0.8)
  })

  it('stops listening when unsubscribed', () => {
    const feed = fakeFeed(0)
    const unsubscribe = mapProgress(feed, (progress) => progress).subscribe(() => {})
    expect(feed.listeners()).toBe(1)
    unsubscribe()
    expect(feed.listeners()).toBe(0)
  })
})
