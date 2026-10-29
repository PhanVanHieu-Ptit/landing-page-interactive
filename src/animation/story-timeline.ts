import { DEFAULT_LENS_PARAMS, type LensParams } from './lens'

/*
 * The scroll story as a pure function of progress (0 to 1). Nothing here knows
 * about the DOM, scrolling or time: given a progress it answers which chapter
 * is active, how visible each chapter's copy is, and where the lens should be.
 * That keeps scrolling forward, backward and in jumps identical by construction.
 *
 * Each chapter owns a range of progress. Its copy fades in over the first
 * `enter` of the range and out over the last `exit`; the lens holds one pose
 * while the copy is readable and travels to the next chapter's pose while the
 * copy swaps. One chapter's exit window and the next one's enter window are
 * back to back, never overlapping, so two blocks of copy are never on screen
 * together.
 */

/** A pose is a sparse set of lens parameters; whatever it leaves out falls back to the resting lens. */
export type LensPose = Partial<LensParams>

export interface StoryChapterSpec {
  readonly id: string
  /** `[start, end]` as fractions of the whole story. Ranges are ordered and may not overlap. */
  readonly range: readonly [start: number, end: number]
  /** Length of the copy's fade-in, in progress units. The first chapter never fades in: the story opens on it. */
  readonly enter?: number
  /** Length of the copy's fade-out. The last chapter never fades out: the story ends on it. */
  readonly exit?: number
  /** `in` is the lens pose once the copy has faded in; `out` is the pose as it starts to leave. `out` defaults to `in` (a hold). */
  readonly pose: { readonly in: LensPose; readonly out?: LensPose }
}

/** How the poses adapt to the layout, so one config serves every mode. */
export interface StoryView {
  /** Scales every pose's distance from the resting zoom: 1 keeps it, 0.6 softens close-ups for small screens. */
  readonly zoomGain: number
  /** Shifts the lens up the screen, in radii of the resting lens: room for copy below it. */
  readonly offsetY: number
}

export const DEFAULT_VIEW: StoryView = { zoomGain: 1, offsetY: 0 }

/** Default fade length, as a fraction of the whole story. */
export const DEFAULT_FADE = 0.035

export interface ChapterFrame {
  /** 0 = invisible, 1 = fully shown. */
  readonly presence: number
  /** -1 = leaving upward, 0 = at rest, +1 = still below its resting place. */
  readonly shift: number
}

export interface StoryTimeline {
  readonly ids: readonly string[]
  /** The chapter a progress belongs to. Gaps between ranges and the ends clamp to the nearest chapter. */
  chapterAt: (progress: number) => number
  frameOf: (progress: number, chapter: number) => ChapterFrame
  poseAt: (progress: number) => LensParams
}

interface Chapter {
  start: number
  end: number
  enter: number
  exit: number
}

interface PoseKey {
  at: number
  pose: LensParams
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const smoothstep = (t: number) => t * t * (3 - 2 * t)
const lerp = (from: number, to: number, t: number) => from + (to - from) * t

/** Builds the timeline, or throws when the config would make the story inconsistent. */
export function createStoryTimeline(specs: readonly StoryChapterSpec[], view: StoryView = DEFAULT_VIEW): StoryTimeline {
  if (specs.length === 0) throw new Error('A story needs at least one chapter')

  const chapters: Chapter[] = specs.map((spec, index) => {
    const [start, end] = spec.range
    const enter = index === 0 ? 0 : (spec.enter ?? DEFAULT_FADE)
    const exit = index === specs.length - 1 ? 0 : (spec.exit ?? DEFAULT_FADE)

    if (!(start >= 0 && end <= 1 && start < end)) {
      throw new Error(`Chapter "${spec.id}": range [${start}, ${end}] must satisfy 0 <= start < end <= 1`)
    }
    if (enter < 0 || exit < 0 || enter + exit > end - start) {
      throw new Error(`Chapter "${spec.id}": enter (${enter}) + exit (${exit}) must fit its range of ${end - start}`)
    }
    return { start, end, enter, exit }
  })

  chapters.forEach((chapter, index) => {
    const previous = chapters[index - 1]
    if (previous && chapter.start < previous.end) {
      throw new Error(`Chapter "${specs[index]?.id}" starts before "${specs[index - 1]?.id}" ends`)
    }
  })

  const keys = buildPoseKeys(specs, chapters, view)

  return {
    ids: specs.map((spec) => spec.id),

    chapterAt(progress) {
      let active = 0
      for (const [index, chapter] of chapters.entries()) {
        if (progress >= chapter.start) active = index
      }
      return active
    },

    frameOf(progress, index) {
      const chapter = chapters[index]
      if (!chapter) return { presence: 0, shift: 1 }
      if (progress < chapter.start) return { presence: 0, shift: 1 }
      if (progress > chapter.end) return { presence: 0, shift: -1 }

      const entering = chapter.enter > 0 ? clamp01((progress - chapter.start) / chapter.enter) : 1
      const leaving = chapter.exit > 0 ? clamp01((chapter.end - progress) / chapter.exit) : 1
      const presence = smoothstep(Math.min(entering, leaving))
      if (entering < 1) return { presence, shift: 1 - smoothstep(entering) }
      if (leaving < 1) return { presence, shift: -(1 - smoothstep(leaving)) }
      return { presence: 1, shift: 0 }
    },

    poseAt(progress) {
      return interpolatePose(keys, progress)
    },
  }
}

function buildPoseKeys(specs: readonly StoryChapterSpec[], chapters: readonly Chapter[], view: StoryView): PoseKey[] {
  const keys: PoseKey[] = []
  for (const [index, spec] of specs.entries()) {
    const chapter = chapters[index]
    if (!chapter) continue
    keys.push({ at: chapter.start + chapter.enter, pose: resolvePose(spec.pose.in, view) })
    keys.push({ at: chapter.end - chapter.exit, pose: resolvePose(spec.pose.out ?? spec.pose.in, view) })
  }
  return keys
}

/** Fills a sparse pose from the resting lens, then adapts it to the layout. */
function resolvePose(pose: LensPose, view: StoryView): LensParams {
  const full: LensParams = { ...DEFAULT_LENS_PARAMS, ...pose }
  const zoom = 1 + (full.zoom - 1) * view.zoomGain
  return {
    ...full,
    zoom,
    // The shift is measured in radii at the resting zoom, so divide by the pose's own zoom to keep it a constant distance on screen.
    panY: full.panY + view.offsetY / zoom,
  }
}

const POSE_FIELDS = Object.keys(DEFAULT_LENS_PARAMS) as (keyof LensParams)[]

function interpolatePose(keys: readonly PoseKey[], progress: number): LensParams {
  const first = keys[0]
  const last = keys[keys.length - 1]
  if (!first || !last) return DEFAULT_LENS_PARAMS
  if (progress <= first.at) return first.pose
  if (progress >= last.at) return last.pose

  // The keys are few and sorted, so a linear scan beats anything cleverer.
  let upper = 1
  while (upper < keys.length - 1 && (keys[upper]?.at ?? Infinity) <= progress) upper += 1
  const from = keys[upper - 1]
  const to = keys[upper]
  if (!from || !to) return last.pose

  const span = to.at - from.at
  if (span <= 0) return to.pose
  const t = smoothstep(clamp01((progress - from.at) / span))

  const pose: LensParams = { ...DEFAULT_LENS_PARAMS }
  for (const field of POSE_FIELDS) pose[field] = lerp(from.pose[field], to.pose[field], t)
  return pose
}
