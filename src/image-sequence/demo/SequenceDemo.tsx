import { useEffect, useRef, useState } from 'react'
import { cssVars } from '@/lib/css-vars'
import {
  CanvasSequence,
  type FitMode,
  type ImageSequence,
  type ProgressSource,
  progressToFrameIndex,
  useImageSequence,
  useScrollProgress,
  useSequenceState,
} from '..'
import styles from './SequenceDemo.module.css'

/*
 * A development harness for the engine, served at /sequence-demo.html by
 * `npm run dev` and left out of the production build.
 *
 *   ?base=<url>    directory holding the frames   (default: <BASE_URL>sequences/demo)
 *   ?frames=<n>    number of frames               (default: 240)
 *
 * With no frames at that address it shows the labeled development fallback.
 */

const DEFAULT_FRAMES = 240

function readParams() {
  const params = new URLSearchParams(window.location.search)
  const frames = Number(params.get('frames'))
  return {
    baseUrl: params.get('base') ?? `${import.meta.env.BASE_URL}sequences/demo`,
    frameCount: Number.isInteger(frames) && frames >= 1 ? frames : DEFAULT_FRAMES,
  }
}

interface HudProps {
  sequence: ImageSequence
  progress: ProgressSource
}

/** Loading numbers re-render (a few times a second at most); the scroll readout is written to the DOM and never touches React. */
function Hud({ sequence, progress }: HudProps) {
  const state = useSequenceState(sequence)
  const frameRef = useRef<HTMLElement>(null)
  const progressRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const write = (value: number) => {
      if (frameRef.current) {
        frameRef.current.textContent = `${progressToFrameIndex(value, sequence.frameCount) + 1} / ${sequence.frameCount}`
      }
      if (progressRef.current) progressRef.current.textContent = `${(value * 100).toFixed(1)}%`
    }
    write(progress.get())
    return progress.subscribe(write)
  }, [progress, sequence])

  return (
    <aside className={styles.hud} aria-label="Sequence status" data-hud="root" data-status={state.status}>
      <dl className={styles.stats}>
        <dt>Frame</dt>
        <dd>
          <code ref={frameRef} data-hud="frame" />
        </dd>
        <dt>Scroll</dt>
        <dd>
          <code ref={progressRef} data-hud="scroll" />
        </dd>
        <dt>Status</dt>
        <dd data-hud="status">{state.status}</dd>
        <dt>Loaded</dt>
        <dd data-hud="loaded">
          {state.loaded} / {state.total}
        </dd>
        <dt>Failed</dt>
        <dd data-hud="failed">{state.failed}</dd>
        <dt>Decoded</dt>
        <dd data-hud="decoded">{state.decoded}</dd>
        <dt>Frame size</dt>
        <dd>{state.frameSize ? `${state.frameSize.width} × ${state.frameSize.height}` : 'unknown'}</dd>
      </dl>
      {/* Decorative: "Loaded n / total" above says the same in words. */}
      <div className={styles.meter} aria-hidden="true">
        <span className={styles.meterFill} style={cssVars({ '--loaded': state.progress })} />
      </div>
    </aside>
  )
}

interface ScrubProps {
  baseUrl: string
  frameCount: number
  fit: FitMode
}

/** One complete use of the engine: the page owns the tall track and the sticky stage; the engine only fills the stage. */
function Scrub({ baseUrl, frameCount, fit }: ScrubProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const sequence = useImageSequence({ frameCount, baseUrl })
  const progress = useScrollProgress(trackRef)

  return (
    <div ref={trackRef} className={styles.track} data-demo="track">
      <div className={styles.stage}>
        <CanvasSequence
          className={styles.canvas}
          sequence={sequence}
          progress={progress}
          fit={fit}
          label={`A ${frameCount}-frame image sequence, scrubbed by scrolling.`}
        />
        <Hud sequence={sequence} progress={progress} />
      </div>
    </div>
  )
}

export function SequenceDemo() {
  const [fit, setFit] = useState<FitMode>('cover')
  const [mounted, setMounted] = useState(true)
  const [params] = useState(readParams)

  return (
    <>
      <header className={styles.controls}>
        <strong className={styles.title}>Image sequence demo</strong>
        <span className={styles.note}>Development only. Scroll to scrub.</span>
        <button type="button" className={styles.button} onClick={() => setFit(fit === 'cover' ? 'contain' : 'cover')} data-demo="fit">
          Fit: {fit}
        </button>
        <button type="button" className={styles.button} onClick={() => setMounted(!mounted)} data-demo="mount" aria-pressed={!mounted}>
          {mounted ? 'Unmount' : 'Mount'}
        </button>
      </header>

      {mounted ? <Scrub baseUrl={params.baseUrl} frameCount={params.frameCount} fit={fit} /> : <div className={styles.track} data-demo="track-empty" />}

      <footer className={styles.end}>End of the track.</footer>
    </>
  )
}
