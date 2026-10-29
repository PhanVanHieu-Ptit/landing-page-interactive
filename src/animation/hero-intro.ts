import { readDurationMs, readToken } from './canvas'

export interface HeroIntroTargets {
  /** Anything inside the page's design-token scope; easing and durations are read from it. */
  root: HTMLElement
  eyebrow: HTMLElement
  /** The inner element of each headline word; its parent is the clipping mask. */
  words: readonly HTMLElement[]
  lede: HTMLElement
  cta: HTMLElement
  rail: HTMLElement
  /** Holds the entrance until it resolves (the preloader's handover). Immediate by default. */
  start?: Promise<void>
}

/** How long the text waits for webfonts, so the headline never reflows mid-reveal. */
const FONT_WAIT_MS = 600

/*
 * The lens starts the sequence (see ProductStage); the copy follows it.
 * Offsets are milliseconds from mount.
 */
const AT = {
  eyebrow: 450,
  words: 550,
  wordStagger: 90,
  lede: 1100,
  cta: 1250,
  rail: 1500,
} as const

/**
 * Plays the Hero's copy entrance with the Web Animations API: opacity and a
 * short translate for the supporting elements, a mask-rise for the headline
 * words. The final look lives in the stylesheet and the animations only use
 * `fill: 'backwards'`, so a skipped or cancelled animation leaves everything
 * visible. They are created paused, which holds the start pose through the
 * first paint, and released once webfonts are ready. Returns a cancel function.
 */
export function playHeroIntro({
  root,
  eyebrow,
  words,
  lede,
  cta,
  rail,
  start = Promise.resolve(),
}: HeroIntroTargets): () => void {
  const easing = readToken(root, '--ease-out-expo')
  const slow = readDurationMs(root, '--duration-slow')
  const slower = readDurationMs(root, '--duration-slower')

  const options = (duration: number, delay: number): KeyframeAnimationOptions => ({
    duration,
    delay,
    easing,
    fill: 'backwards',
  })

  const rise = (element: HTMLElement, delay: number, distance: string) =>
    element.animate(
      [
        { opacity: 0, transform: `translateY(${distance})` },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      options(slower, delay),
    )

  const animations: Animation[] = [
    rise(eyebrow, AT.eyebrow, '0.75rem'),
    ...words.map((word, index) =>
      word.animate(
        [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }],
        options(slower, AT.words + index * AT.wordStagger),
      ),
    ),
    rise(lede, AT.lede, '1rem'),
    rise(cta, AT.cta, '1rem'),
    rail.animate([{ opacity: 0 }, { opacity: 1 }], options(slow, AT.rail)),
  ]
  for (const animation of animations) animation.pause()

  let cancelled = false
  const fontsReady = Promise.race([
    document.fonts.ready,
    new Promise<void>((resolve) => window.setTimeout(resolve, FONT_WAIT_MS)),
  ])
  Promise.all([fontsReady, start]).then(
    () => {
      if (cancelled) return
      for (const animation of animations) animation.play()
    },
    () => undefined,
  )

  return () => {
    cancelled = true
    for (const animation of animations) animation.cancel()
  }
}
