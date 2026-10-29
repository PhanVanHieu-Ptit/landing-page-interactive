import { useEffect } from 'react'
import { observeReveals } from '@/animation/reveal'

/**
 * Turns on scroll reveals for the whole page. Call it once, at the top of the
 * tree: it finds every `[data-reveal]` host in the document. Hosts that are
 * already revealed are skipped, so running the effect twice (StrictMode) is safe.
 */
export function useReveal(): void {
  useEffect(() => observeReveals(document), [])
}
