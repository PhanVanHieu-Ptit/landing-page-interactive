import type { ProgressFeed } from './story-controller'
import type { StoryChapterSpec } from './story-timeline'

/*
 * Which frame of an image sequence the story shows at a given progress. Like the
 * timeline, it is a pure function: nothing here knows about the DOM, scrolling
 * or time, so scrolling forward, backward and in jumps agree by construction.
 *
 * Each chapter may declare `frames: [first, last]`, the stretch of the sequence
 * that plays across its scroll range, linearly. That is how the art and the
 * copy are kept in step: a slow macro chapter claims a few frames over a long
 * range, a fast one claims many. A chapter that declares nothing takes an even
 * share (in proportion to its scroll length) of whatever frames its declared
 * neighbors leave over, so with nothing declared the whole sequence plays at a
 * constant pace: frame = progress * (frameCount - 1).
 *
 * The sequence only ever plays forward as the story advances; scrolling back
 * plays it back. Between chapters, and before the first or after the last, the
 * frame is interpolated or held, so it never jumps.
 */

interface FrameKey {
  /** Story progress. */
  at: number
  /** Position in the sequence, in frames (fractional while between two). */
  frame: number
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/**
 * Builds the map from story progress to *sequence* progress, in the form the
 * image-sequence engine takes: the middle of the wanted frame's slice, so the
 * engine's own progress-to-frame rounding lands exactly on the declared frames.
 * Throws when the config would make the sequence run backward or off its ends.
 * The ranges themselves must be ones `createStoryTimeline` accepts; it is the
 * one that checks them.
 */
export function createFrameMap(specs: readonly StoryChapterSpec[], frameCount: number): (progress: number) => number {
  if (!Number.isInteger(frameCount) || frameCount < 1) {
    throw new RangeError(`frameCount must be a positive integer, got ${frameCount}`)
  }
  const last = frameCount - 1
  const keys = buildKeys(specs, last)

  return (progress) => {
    const frame = frameAt(keys, progress)
    return (frame + 0.5) / frameCount
  }
}

/** Fills each run of chapters that declare no frames from the frames its neighbors leave, then lists a key at every chapter's start and end. */
function buildKeys(specs: readonly StoryChapterSpec[], lastFrame: number): FrameKey[] {
  const resolved: (readonly [number, number])[] = []
  let floor = 0

  for (const spec of specs) {
    if (!spec.frames) continue
    const [first, end] = spec.frames
    if (!Number.isInteger(first) || !Number.isInteger(end) || first < 0 || end > lastFrame) {
      throw new RangeError(`Chapter "${spec.id}": frames [${first}, ${end}] must be whole frames within 0 to ${lastFrame}`)
    }
    if (first > end) throw new RangeError(`Chapter "${spec.id}": frames [${first}, ${end}] must not run backward`)
    if (first < floor) {
      throw new RangeError(`Chapter "${spec.id}": frames start at ${first}, before the previous chapter's last frame (${floor})`)
    }
    floor = end
  }

  for (let index = 0; index < specs.length; index += 1) {
    const spec = specs[index]
    if (!spec) continue
    if (spec.frames) {
      resolved.push(spec.frames)
      continue
    }

    // The run of undeclared chapters this one starts, and the frames between its declared neighbors (a run always follows a declared chapter, or the start).
    let runEnd = index
    while (runEnd + 1 < specs.length && !specs[runEnd + 1]?.frames) runEnd += 1
    const from = specs[index - 1]?.frames?.[1] ?? 0
    const to = specs[runEnd + 1]?.frames?.[0] ?? lastFrame

    const run = specs.slice(index, runEnd + 1)
    const total = run.reduce((sum, member) => sum + (member.range[1] - member.range[0]), 0)
    let spent = 0
    for (const member of run) {
      const length = member.range[1] - member.range[0]
      resolved.push([from + ((to - from) * spent) / total, from + ((to - from) * (spent + length)) / total])
      spent += length
    }
    index = runEnd
  }

  const keys: FrameKey[] = []
  for (const [index, spec] of specs.entries()) {
    const frames = resolved[index]
    if (!frames) continue
    keys.push({ at: spec.range[0], frame: frames[0] }, { at: spec.range[1], frame: frames[1] })
  }
  return keys
}

function frameAt(keys: readonly FrameKey[], progress: number): number {
  const first = keys[0]
  const last = keys[keys.length - 1]
  if (!first || !last) return 0
  if (!(progress > first.at)) return first.frame
  if (progress >= last.at) return last.frame

  // The keys are few and sorted, so a linear scan beats anything cleverer.
  let upper = 1
  while (upper < keys.length - 1 && (keys[upper]?.at ?? Infinity) <= progress) upper += 1
  const from = keys[upper - 1]
  const to = keys[upper]
  if (!from || !to) return last.frame

  const span = to.at - from.at
  if (span <= 0) return to.frame
  return from.frame + (to.frame - from.frame) * clamp01((progress - from.at) / span)
}

/** A progress feed seen through `map`: the same timing, a different value. */
export function mapProgress(feed: ProgressFeed, map: (progress: number) => number): ProgressFeed {
  return {
    get: () => map(feed.get()),
    subscribe: (listener) => feed.subscribe((progress) => listener(map(progress))),
  }
}
