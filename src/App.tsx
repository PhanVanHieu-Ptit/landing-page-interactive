<<<<<<< Updated upstream
import { SiteFooter, SiteHeader, SkipLink } from '@/components/layout'
import { Anatomy, Hero, Reserve, ScrollStory, Specifications } from '@/sections'

export function App() {
  return (
    <>
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
    </>
=======
import { useMemo, useState, useSyncExternalStore } from 'react'
import { createIntroGate } from '@/animation/intro-gate'
import { Preloader, SiteFooter, SiteHeader, SkipLink } from '@/components/layout'
import { heroSequence, heroSequenceEnabled, heroSequenceLabel, heroSequenceLoading } from '@/content/sequence'
import { IntroGateContext } from '@/hooks/useIntroGate'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useReveal } from '@/hooks/useReveal'
import { useSequenceReady } from '@/hooks/useSequenceReady'
import { useImageSequence, type ImageSequence } from '@/image-sequence'
import { Anatomy, Hero, Reserve, ScrollStory, Specifications, type StorySequenceMedia } from '@/sections'
import styles from './App.module.css'

interface PageProps {
  /** The image sequence the page loads and plays, or `null` when it has none (the story then draws the procedural lens). */
  sequence: ImageSequence | null
}

/** The whole page. One loader, if any, feeds both the loading screen and the story's canvas. */
function Page({ sequence }: PageProps) {
  // Held shut until the Preloader hands over; the Hero's entrance and every scroll reveal wait on it.
  const [gate] = useState(createIntroGate)
  const released = useSyncExternalStore(gate.subscribe, gate.isReleased, () => false)
  useReveal(gate.released)
  // While the mobile menu is open it covers the page, so the page cannot take focus.
  const [menuOpen, setMenuOpen] = useState(false)

  // The story draws the procedural lens until the sequence's opening is loaded (and for good if it never is), never an empty stage.
  const ready = useSequenceReady(sequence)
  const media = useMemo<StorySequenceMedia | undefined>(
    () => (sequence && ready ? { handle: sequence, label: heroSequenceLabel } : undefined),
    [sequence, ready],
  )

  return (
    <IntroGateContext value={gate}>
      <Preloader sequence={sequence} />
      {/* Nothing behind the loading screen is reachable by keyboard or screen reader until it lets go. */}
      <div className={styles.shell} inert={!released}>
        <SkipLink />
        <SiteHeader onMenuOpenChange={setMenuOpen} />
        <main id="main" tabIndex={-1} inert={menuOpen}>
          <Hero />
          <ScrollStory sequence={media} />
          <Anatomy />
          <Specifications />
          <Reserve />
        </main>
        <SiteFooter inert={menuOpen} />
      </div>
    </IntroGateContext>
>>>>>>> Stashed changes
  )
}

/** Starts the product sequence's loader. It lives as long as the page, so frames keep arriving after the loading screen is gone. */
function SequencedPage() {
  const reducedMotion = usePrefersReducedMotion()
  // Reduced motion shows one still frame, the last, so that is the opening it waits for.
  const sequence = useImageSequence(heroSequence, {
    criticalFrames: heroSequenceLoading.criticalFrames,
    initialFrame: reducedMotion ? heroSequence.frameCount - 1 : 0,
  })
  return <Page sequence={sequence} />
}

export function App() {
  // A module constant, so the same branch renders for the life of the page.
  return heroSequenceEnabled ? <SequencedPage /> : <Page sequence={null} />
}
