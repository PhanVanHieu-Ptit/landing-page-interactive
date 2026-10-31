import { useLayoutEffect, type TransitionEvent } from 'react'
import { LogoMark } from '@/components/icons'
import { preloader, site } from '@/content/site'
import { cssVars } from '@/lib/css-vars'
import { cx } from '@/lib/cx'
import type { ImageSequence } from '@/image-sequence'
import { usePreloader } from './usePreloader'
import styles from './Preloader.module.css'

interface PreloaderProps {
  /**
   * The sequence whose opening frames the page waits for. The Preloader only reads it; the caller owns the download.
   * `null` when the page has no sequence: it then waits for the webfonts alone.
   */
  sequence: ImageSequence | null
}

/** Announced politely in steps this wide, so a screen reader hears a handful of updates and not a hundred. */
const ANNOUNCE_STEP = 25

/**
 * The loading screen: a lens ring that fills with the real share of what the page
 * is waiting for (the opening frames of the image sequence, or the webfonts when
 * there is none) that has arrived, the brand name and the percentage. It ends when the
 * opening is ready, or sooner if loading stalls or runs long (see
 * `preloadPolicy`), then lifts away while the Hero begins underneath it. The
 * rest of the sequence keeps loading after it is gone.
 *
 * It is not a dialog: nothing traps focus. The page behind is made `inert` by
 * the caller until the handover, and the one control here, Skip, ends the wait.
 */
export function Preloader({ sequence }: PreloaderProps) {
  const { phase, percent, reason, skipVisible, skip, finish } = usePreloader(sequence)
  const locked = phase === 'loading'

  // Holds the page still while it loads. Before paint, so the lock is never missing for a frame.
  useLayoutEffect(() => {
    if (!locked) return undefined
    const root = document.documentElement
    root.setAttribute('data-preloading', '')
    return () => root.removeAttribute('data-preloading')
  }, [locked])

  if (phase === 'done') return null

  const onTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && event.propertyName === 'opacity') finish()
  }

  const step = Math.floor(percent / ANNOUNCE_STEP) * ANNOUNCE_STEP
  let announcement = step > 0 ? `${preloader.loading}, ${step} percent.` : `${preloader.loading}.`
  if (phase === 'exiting') {
    if (reason === 'ready') announcement = preloader.ready
    else if (reason === 'unavailable') announcement = preloader.unavailable
    else announcement = preloader.proceeding
  }

  return (
    <div className={styles.preloader} data-phase={phase} onTransitionEnd={onTransitionEnd}>
      <div className={styles.center}>
        <div className={styles.dial}>
          <svg className={styles.ring} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <circle className={styles.track} cx="50" cy="50" r="46" />
            <circle
              className={styles.arc}
              cx="50"
              cy="50"
              r="46"
              pathLength="1"
              style={cssVars({ '--progress': percent / 100 })}
            />
          </svg>
          <LogoMark className={styles.mark} />
        </div>
        <p className={cx(styles.name, 'type-eyebrow')}>{site.name}</p>
        <p className={cx(styles.percent, 'type-data')} aria-hidden="true">
          <span className={styles.value}>{percent}</span>
          <span className={styles.sign}>%</span>
        </p>
      </div>

      {/* The accessible stand-in for the ring and the number, hidden from sight. */}
      <progress className="visually-hidden" aria-label={preloader.label} max={100} value={percent} />
      <output className="visually-hidden">{announcement}</output>

      <button
        type="button"
        className={cx(styles.skip, 'type-eyebrow')}
        data-visible={skipVisible ? '' : undefined}
        aria-label={preloader.skipLabel}
        onClick={skip}
      >
        {preloader.skip}
      </button>
    </div>
  )
}
