import { CanvasSequence, type FitMode, type FocalPoint, type ImageSequence, type ProgressSource } from '@/image-sequence'

/** The frames that stand in for the lens on the story's stage. */
export interface StorySequenceMedia {
  /**
   * The loaded sequence, from `useImageSequence`. The caller owns the download, so the page's loading screen and the
   * story's canvas can share one loader. Its `frameCount` is also what the chapters' `frames` ranges are measured against.
   */
  handle: ImageSequence
  /** What the sequence shows, for assistive technology: a canvas has no content of its own. */
  label: string
  /** Defaults to `'cover'`. */
  fit?: FitMode | undefined
  /** Where the frame sits when it overflows or leaves bars. Defaults to the center. */
  focal?: FocalPoint | undefined
}

interface StorySequenceProps {
  media: StorySequenceMedia
  /** The story's progress already mapped to sequence progress (see `animation/story-frames.ts`). */
  progress: ProgressSource
  /** Cap on canvas pixels per CSS pixel. */
  maxDpr: number
  /** The story is not scrubbing (reduced motion, or too short to pin): hold the last frame, the finished shot. */
  still: boolean
  /** `| undefined` because CSS Module lookups are typed `string | undefined`. */
  className?: string | undefined
}

/**
 * The story's canvas when it plays an image sequence. It renders once: the
 * engine follows `progress` straight from the story's frame loop to the canvas
 * (see `CanvasSequence`), so scrolling never reaches React. When the story is
 * not scrubbing, `CanvasSequence` holds the last frame, which is the finished
 * shot the static layout shows.
 */
export function StorySequence({ media, progress, maxDpr, still, className }: StorySequenceProps) {
  return (
    <CanvasSequence
      className={className}
      sequence={media.handle}
      progress={progress}
      label={media.label}
      fit={media.fit}
      focal={media.focal}
      maxDpr={maxDpr}
      reducedMotion={still ? true : undefined}
    />
  )
}
