import { useState } from 'react'
import { STORY_TIMING } from '@/animation/story-config'
import type { StoryChapterSpec } from '@/animation/story-timeline'
import { ScrollStory } from '../ScrollStory'
import type { StorySequenceMedia } from '../StorySequence'
import styles from './StoryDemo.module.css'

/*
 * A development harness for the story with an image sequence on its stage,
 * served at /story-demo.html by `npm run dev` and left out of the production
 * build.
 *
 *   ?base=<url>    directory holding the frames   (default: <BASE_URL>sequences/demo)
 *
 * With no frames at that address the engine shows its labeled development
 * fallback, whose big number is the frame the real sequence would be on: scroll
 * and watch it change as the chapters do.
 */

const FRAME_COUNT = 240

/**
 * Illustrative art direction for a 240-frame sequence. The macro chapter gets a
 * short, slow stretch of frames over its scroll range, the others longer ones.
 */
const DEMO_FRAMES: Readonly<Record<string, readonly [number, number]>> = {
  introduction: [0, 39],
  design: [40, 89],
  craftsmanship: [90, 119],
  innovation: [120, 189],
  reveal: [190, 239],
}

// Module scope, so the timing keeps its identity: a new array would rebuild the story's frame loop on every render.
const DEMO_TIMING: readonly StoryChapterSpec[] = STORY_TIMING.map((spec) => {
  const frames = DEMO_FRAMES[spec.id]
  return frames ? { ...spec, frames } : spec
})

function readMedia(): StorySequenceMedia {
  const base = new URLSearchParams(window.location.search).get('base')
  return {
    source: { frameCount: FRAME_COUNT, baseUrl: base ?? `${import.meta.env.BASE_URL}sequences/demo` },
    label: 'The Aurelle 50 cinema lens, played frame by frame as the chapters advance.',
  }
}

export function StoryDemo() {
  const [media] = useState(readMedia)

  return (
    <>
      <p className={styles.note}>Story with an image sequence. Development only.</p>
      <main>
        <ScrollStory timing={DEMO_TIMING} sequence={media} />
      </main>
      <footer className={styles.end}>End of the story.</footer>
    </>
  )
}
