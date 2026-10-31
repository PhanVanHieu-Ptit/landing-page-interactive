import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { LensRenderer } from '@/animation/lens-renderer'
import { STORY_MODES, STORY_TIMING, type StoryMode } from '@/animation/story-config'
import { createStoryController } from '@/animation/story-controller'
<<<<<<< Updated upstream
=======
import { createFrameMap, mapProgress } from '@/animation/story-frames'
import { CRAMPED_QUERY, STORY_LAYOUTS, type StoryLayout } from '@/animation/story-layout'
>>>>>>> Stashed changes
import { createStoryTimeline, type StoryChapterSpec } from '@/animation/story-timeline'
import { Container } from '@/components/layout'
import { SwapText } from '@/components/ui'
import { storyChapters, storyCopy } from '@/content/story'
import { useActiveChapter } from '@/hooks/useActiveChapter'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cssVars } from '@/lib/css-vars'
import { cx } from '@/lib/cx'
import { ChapterContent } from './ChapterContent'
import styles from './ScrollStory.module.css'
import { StoryCanvas } from './StoryCanvas'
import { StoryChapter } from './StoryChapter'

interface ScrollStoryProps {
  /** When each chapter owns the scroll and where the lens is. Defaults to `STORY_TIMING`; must match the copy's chapters by `id` and order. */
  timing?: readonly StoryChapterSpec[]
  /** Length of the whole story, in viewport heights. Defaults to the layout's own (see `STORY_MODES`). */
  scrollLength?: number
<<<<<<< Updated upstream
=======
  /** Plays an already-loading image sequence on the stage instead of the procedural lens. The chapters' `frames` ranges are measured against its `frameCount`. */
  sequence?: StorySequenceMedia | undefined
>>>>>>> Stashed changes
}

const pad = (value: number) => String(value).padStart(2, '0')

/** What the rail's counter and label roll between: one string per chapter, in order. */
const RAIL_NUMBERS = storyChapters.map((_, index) => pad(index + 1))
const RAIL_LABELS = storyChapters.map((chapter) => chapter.label)
const RAIL_TOTAL = pad(storyChapters.length)

function assertTimingMatchesCopy(timing: readonly StoryChapterSpec[]) {
  const matches = timing.length === storyChapters.length && timing.every((spec, index) => spec.id === storyChapters[index]?.id)
  if (!matches) {
    throw new Error(`ScrollStory timing (${timing.map((spec) => spec.id).join(', ')}) does not match its copy (${storyChapters.map((chapter) => chapter.id).join(', ')})`)
  }
}

/**
 * The product, told in chapters while the page scrolls. A tall track holds a
 * sticky stage: the stage stays put while the track scrolls past it, and how
 * far through the track you are is the story's progress. That progress drives
 * the lens on the canvas and the copy over it, from one frame loop that lives
 * outside React (see `animation/story-controller.ts`); React only renders the
 * structure, and which chapter is active.
 *
<<<<<<< Updated upstream
 * Layouts: `full` on tablets and up, `compact` on phones (a shorter story,
 * gentler close-ups), and `static` for reduced motion: no pinning and no
 * scrubbing, just the chapters in order under the finished lens.
=======
 * The stage shows the procedural lens, or, given `sequence`, an image sequence
 * whose frame follows that same eased progress (through the chapters' `frames`
 * ranges), so the picture and the copy cannot drift apart.
 *
 * Compositions (see `animation/story-layout.ts`; `data-layout` tells the
 * stylesheet): `overlay` on a desktop-sized landscape screen, where the copy
 * sits over the lens; `stacked` (the lens zone above the copy) and `split` (the
 * lens beside it) everywhere else, where the two never share pixels. Reduced
 * motion, or a viewport too short to hold the copy (`data-mode='static'`), is
 * separate: no pinning and no scrubbing, just the chapters in order under the
 * finished lens.
 *
 * When a rotation or resize changes the layout, the reader keeps their place in
 * the story, not their pixel offset (see `animation/story-scroll.ts`).
>>>>>>> Stashed changes
 */
export function ScrollStory({ timing = STORY_TIMING, scrollLength }: ScrollStoryProps) {
  const reducedMotion = usePrefersReducedMotion()
<<<<<<< Updated upstream
  const wide = useMediaQuery('(min-width: 48rem)')
  const layout: StoryMode = wide ? 'full' : 'compact'
  const mode = reducedMotion ? 'static' : layout
  const config = STORY_MODES[layout]
=======
  const layout = useStoryLayout()
  const cramped = useMediaQuery(CRAMPED_QUERY)
  const mode = reducedMotion || cramped ? 'static' : 'scrub'
  const config = STORY_LAYOUTS[layout]
>>>>>>> Stashed changes

  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const chapterEls = useRef<(HTMLLIElement | null)[]>([])
  const rendererRef = useRef<LensRenderer | null>(null)

  const timeline = useMemo(() => {
    assertTimingMatchesCopy(timing)
    return createStoryTimeline(timing, config.view)
  }, [timing, config.view])
  const controller = useMemo(() => createStoryController(timeline), [timeline])
  /** The finished lens, framed neutrally, for the layout that does not scrub. */
  const finalPose = useMemo(() => createStoryTimeline(timing).poseAt(1), [timing])
  const active = useActiveChapter(controller)

<<<<<<< Updated upstream
=======
  // Only the count matters here: `sequence` may be a fresh literal on every render.
  const frameCount = sequence?.handle.frameCount
  /** The story's eased progress, turned into progress along the sequence. After `timeline`, which is what vets the ranges. */
  const sequenceProgress = useMemo(
    () => (frameCount === undefined ? null : mapProgress(controller.progress, createFrameMap(timing, frameCount))),
    [controller, timing, frameCount],
  )
  const playsSequence = sequenceProgress !== null

>>>>>>> Stashed changes
  // Stable callbacks, so React does not detach and reattach every chapter's ref on each render.
  const chapterRefs = useMemo(
    () =>
      storyChapters.map((_, index) => (element: HTMLLIElement | null) => {
        chapterEls.current[index] = element
      }),
    [],
  )

  // Before first paint, so the first frame already shows the right chapter at the right pose.
  useLayoutEffect(() => {
    const root = sectionRef.current
    const track = trackRef.current
    const stage = stageRef.current
    if (mode === 'static' || !root || !track || !stage) return undefined

    return controller.attach({
      root,
      track,
      stage,
      chapters: chapterEls.current,
      paint: (pose) => rendererRef.current?.paint(pose),
      smoothingMs: config.smoothingMs,
    })
  }, [controller, mode, config.smoothingMs])

  // The canvas is created after layout effects run, and again on every resize: it asks for its first frame by handing over the painter.
  const handleRenderer = useCallback(
    (renderer: LensRenderer | null) => {
      rendererRef.current = renderer
      if (!renderer) return
      if (mode === 'static') {
        renderer.paint(finalPose)
      } else {
        controller.refresh()
      }
    },
    [mode, controller, finalPose],
  )

  // Switching to the static layout while the canvas is already up: nothing else repaints it.
  useEffect(() => {
    if (mode === 'static') rendererRef.current?.paint(finalPose)
  }, [mode, finalPose])

<<<<<<< Updated upstream
  const length = scrollLength ?? config.scrollLength
  const current = storyChapters[active]
=======
  // The pinned distance is the stylesheet's (a share of the screen, never too short to read); a caller can still ask for a whole-story length in screens.
  const trackStyle = scrollLength === undefined ? undefined : cssVars({ '--story-run': `calc(${Math.max(0, scrollLength - 1)} * 100svh)` })
>>>>>>> Stashed changes

  return (
    <section ref={sectionRef} id="story" className={styles.story} data-mode={mode} aria-labelledby="story-title">
      <h2 id="story-title" className="visually-hidden">
        {storyCopy.title}
      </h2>

      <div ref={trackRef} className={styles.track} style={cssVars({ '--story-length': length })}>
        <div ref={stageRef} className={styles.stage}>
          <div className={styles.lighting} aria-hidden="true" />
<<<<<<< Updated upstream
          <StoryCanvas className={styles.canvas} maxDpr={config.maxDpr} onRenderer={handleRenderer} />
=======
          {sequence && sequenceProgress ? (
            <StorySequence
              className={styles.canvas}
              media={sequence}
              progress={sequenceProgress}
              maxDpr={config.maxDpr}
              still={mode === 'static'}
            />
          ) : (
            <StoryCanvas
              className={styles.canvas}
              maxDpr={config.maxDpr}
              maxPixels={config.maxPixels}
              still={mode === 'static'}
              onRenderer={handleRenderer}
            />
          )}
>>>>>>> Stashed changes
          <div className={styles.scrim} aria-hidden="true" />

          <Container className={styles.inner}>
            <ol className={styles.chapters}>
              {storyChapters.map((chapter, index) => (
                <StoryChapter key={chapter.id} ref={chapterRefs[index] ?? null} active={mode !== 'static' && index === active}>
                  <ChapterContent
                    copy={chapter}
                    position={index + 1}
                    total={storyChapters.length}
                    interactive={mode === 'static' || index === active}
                  />
                </StoryChapter>
              ))}
            </ol>

            <div className={styles.rail} aria-hidden="true">
              <span className="type-eyebrow">
                <SwapText items={RAIL_NUMBERS} activeIndex={active} /> / {RAIL_TOTAL}
              </span>
              <span className={styles.railTrack}>
                <span className={styles.railFill} />
                {timing.slice(1).map((spec) => (
                  <span key={spec.id} className={styles.railTick} style={cssVars({ '--at': spec.range[0] })} />
                ))}
              </span>
              <SwapText className={cx(styles.railLabel, 'type-eyebrow')} items={RAIL_LABELS} activeIndex={active} align="end" />
            </div>
          </Container>
        </div>
      </div>
    </section>
  )
}
