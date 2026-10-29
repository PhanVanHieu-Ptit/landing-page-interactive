import { CanvasSequence, type FitMode, type FocalPoint, type FrameLoaderOptions, type ImageSequenceSource, type ProgressSource, useImageSequence } from '@/image-sequence'

/** The frames that stand in for the lens on the story's stage. */
export interface StorySequenceMedia {
  /** Where the frames are and how they are named. `frameCount` is also what the chapters' `frames` ranges are measured against. */
  source: ImageSequenceSource
  /** What the sequence shows, for assistive technology: a canvas has no content of its own. */
  label: string
  /** Defaults to `'cover'`. */
  fit?: FitMode | undefined
  /** Where the frame sits when it overflows or leaves bars. Defaults to the center. */
  focal?: FocalPoint | undefined
  /** Download and decode tuning; see `useImageSequence`. */
  loader?: FrameLoaderOptions | undefined
}

interface StorySequenceProps {
  media: StorySequenceMedia
  /** The story's progress already mapped to sequence progress (see `animation/story-frames.ts`). */
  progress: ProgressSource
  /** Cap on canvas pixels per CSS pixel. */
  maxDpr: number
  /** `| undefined` because CSS Module lookups are typed `string | undefined`. */
  className?: string | undefined
}

/**
 * The story's canvas when it plays an image sequence. It renders once: the
 * engine follows `progress` straight from the story's frame loop to the canvas
 * (see `CanvasSequence`), so scrolling never reaches React. Under reduced motion
 * `CanvasSequence` holds the last frame and the loader fetches only the frames
 * around it, which is the finished shot the static layout shows.
 */
export function StorySequence({ media, progress, maxDpr, className }: StorySequenceProps) {
  const sequence = useImageSequence(media.source, media.loader)

  return (
    <CanvasSequence
      className={className}
      sequence={sequence}
      progress={progress}
      label={media.label}
      fit={media.fit}
      focal={media.focal}
      maxDpr={maxDpr}
    />
  )
}
