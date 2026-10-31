import { useState, useSyncExternalStore } from 'react'
import { createIntroGate } from '@/animation/intro-gate'
import { Preloader, SiteFooter, SiteHeader, SkipLink } from '@/components/layout'
import { heroSequence, heroSequenceLoading } from '@/content/sequence'
import { IntroGateContext } from '@/hooks/useIntroGate'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useReveal } from '@/hooks/useReveal'
import { useImageSequence } from '@/image-sequence'
import { Anatomy, Hero, Reserve, ScrollStory, Specifications } from '@/sections'
import styles from './App.module.css'

export function App() {
  const reducedMotion = usePrefersReducedMotion()
  useReveal()
  // Held shut until the Preloader hands over; the Hero's entrance waits on it.
  const [gate] = useState(createIntroGate)
  const released = useSyncExternalStore(gate.subscribe, gate.isReleased, () => false)

  // The loader lives as long as the page, so frames keep arriving after the Preloader is gone. Reduced motion shows
  // one still frame, the last, so that is the opening it waits for.
  const sequence = useImageSequence(heroSequence, {
    criticalFrames: heroSequenceLoading.criticalFrames,
    initialFrame: reducedMotion ? heroSequence.frameCount - 1 : 0,
  })

  return (
    <IntroGateContext value={gate}>
      <Preloader sequence={sequence} />
      {/* Nothing behind the loading screen is reachable by keyboard or screen reader until it lets go. */}
      <div className={styles.shell} inert={!released}>
        <SkipLink />
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          <Hero />
          <ScrollStory />
          <Anatomy />
          <Specifications />
          <Reserve />
        </main>
        <SiteFooter />
      </div>
    </IntroGateContext>
  )
}
