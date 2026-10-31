import { useCallback, useEffect, useRef, useState } from 'react'
import { useIntroGate } from '@/hooks/useIntroGate'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { readiness, useSequenceState, type ImageSequence, type ReadinessOutcome } from '@/image-sequence'
import {
  decideExit,
  EXIT_FALLBACK_MS,
  limitsFor,
  nextDeadline,
  type ExitReason,
  type PreloadInput,
} from './preloadPolicy'

export type PreloaderPhase = 'loading' | 'exiting' | 'done'

/** The faces the first screen is set in. Loading them here is what keeps the headline from reflowing after the reveal. */
const CRITICAL_FONTS = [
  '400 1em "Instrument Serif"',
  'italic 400 1em "Instrument Serif"',
  '400 1em Inter',
  '500 1em "JetBrains Mono"',
] as const

/** Fonts that have not arrived by now are waited for no longer: the page uses its fallback and swaps later. */
const FONT_WAIT_MS = 2500

/** True once the critical webfonts have loaded, failed, or run out of time. */
function useFontsReady(): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const finish = () => {
      if (!cancelled) setReady(true)
    }
    const timer = setTimeout(finish, FONT_WAIT_MS)
    Promise.all(CRITICAL_FONTS.map((font) => document.fonts.load(font))).then(finish, finish)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  return ready
}

export interface PreloaderModel {
  phase: PreloaderPhase
  /** Whole percent of the opening scene that has arrived. 100 only when the page is actually ready to open. */
  percent: number
  outcome: ReadinessOutcome
  /** Why the exit started. Null while loading. */
  reason: ExitReason | null
  /** The Skip control should be visible. It is focusable regardless. */
  skipVisible: boolean
  skip: () => void
  /** Unmounts the overlay. Call it when the exit transition ends. */
  finish: () => void
}

/**
 * Decides when the loading screen ends. It reads real loading state from
 * `sequence`, applies the rules in `preloadPolicy` (minimum dwell, stall and
 * hard-ceiling timeouts, fonts), and on exit opens the intro gate so the Hero
 * can begin while the overlay is still lifting. Nothing here invents progress:
 * the percentage is `readiness(...).progress` and nothing else.
 */
export function usePreloader(sequence: ImageSequence): PreloaderModel {
  const gate = useIntroGate()
  const reducedMotion = usePrefersReducedMotion()
  const state = useSequenceState(sequence)
  const fontsReady = useFontsReady()
  const { outcome, progress } = readiness(state)

  const [phase, setPhase] = useState<PreloaderPhase>('loading')
  const [reason, setReason] = useState<ExitReason | null>(null)
  const [skipped, setSkipped] = useState(false)
  const [skipVisible, setSkipVisible] = useState(false)

  // Clock bookkeeping, written only from effects.
  const mountedAt = useRef(0)
  const progressedAt = useRef(0)
  const readyAt = useRef<number | null>(null)
  const settledCount = useRef(-1)

  const settled = state.loaded + state.failed

  useEffect(() => {
    const now = performance.now()
    mountedAt.current = now
    progressedAt.current = now
  }, [])

  useEffect(() => {
    const limits = limitsFor(reducedMotion)
    const timer = setTimeout(() => setSkipVisible(true), limits.skipRevealMs)
    return () => clearTimeout(timer)
  }, [reducedMotion])

  useEffect(() => {
    if (phase !== 'loading') return undefined
    const limits = limitsFor(reducedMotion)

    const now = performance.now()
    if (settled !== settledCount.current) {
      settledCount.current = settled
      progressedAt.current = now
    }
    const ready = outcome === 'ready' && fontsReady
    if (!ready) readyAt.current = null
    else readyAt.current ??= now

    const input = (at: number): PreloadInput => ({
      outcome,
      fontsReady,
      elapsedMs: at - mountedAt.current,
      idleMs: at - progressedAt.current,
      readyForMs: readyAt.current === null ? null : at - readyAt.current,
      skipped,
    })

    let timer: ReturnType<typeof setTimeout> | undefined
    const check = () => {
      const at = performance.now()
      const exitReason = decideExit(input(at), limits)
      if (exitReason !== null) {
        setReason(exitReason)
        setPhase('exiting')
        // The Hero and the lens start now, under the lifting overlay.
        gate.release()
        return
      }
      const wait = nextDeadline(input(at), limits)
      if (wait !== null) timer = setTimeout(check, wait)
    }
    check()
    return () => clearTimeout(timer)
  }, [phase, reducedMotion, outcome, fontsReady, settled, skipped, gate])

  const skip = useCallback(() => setSkipped(true), [])
  const finish = useCallback(() => setPhase((current) => (current === 'exiting' ? 'done' : current)), [])

  // The overlay unmounts when its transition ends; this covers the case where that event never comes.
  useEffect(() => {
    if (phase !== 'exiting') return undefined
    const timer = setTimeout(finish, EXIT_FALLBACK_MS)
    return () => clearTimeout(timer)
  }, [phase, finish])

  // 100 means ready to open: until the fonts are in as well, the number waits at 99.
  const whole = Math.floor(progress * 100)
  return { phase, percent: fontsReady ? whole : Math.min(whole, 99), outcome, reason, skipVisible, skip, finish }
}
