import { useEffect } from 'react'
import { observeReveals } from '@/animation/reveal'

/**
 * Turns on scroll reveals for the whole page. Call it once, at the top of the
 * tree: it finds every `[data-reveal]` host in the document. Hosts that are
 * already revealed are skipped, so running the effect twice (StrictMode) is safe.
 *
 * Pass `until` (the intro gate's `released`) to hold every entrance back, the
 * Hero's included, until the loading screen lets go.
 */
export function useReveal(until?: Promise<void>): void {
  useEffect(() => observeReveals(document, until), [until])
}
