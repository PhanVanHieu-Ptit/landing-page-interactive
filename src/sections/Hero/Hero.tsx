import { useEffect, useLayoutEffect, useRef } from 'react'
import { playHeroIntro } from '@/animation/hero-intro'
import { trackScrollProgress } from '@/animation/scroll'
import { Container } from '@/components/layout'
import { ProductStage } from '@/components/stage'
import { PrimaryButton, ScrollHint, SectionIndicator } from '@/components/ui'
import { hero } from '@/content/site'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cx } from '@/lib/cx'
import { renderRevealWords } from '@/lib/emphasis'
import styles from './Hero.module.css'

/**
 * The opening statement: one product, one sentence, one action. The lens leads
 * the entrance and the copy follows; scrolling away drifts the lens down and
 * fades the copy into the next section. Both are skipped for reduced motion.
 */
export function Hero() {
  const reducedMotion = usePrefersReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLParagraphElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const ledeRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)

  // Before first paint, so the copy never shows in its final pose for a frame before the entrance starts.
  useLayoutEffect(() => {
    const root = sectionRef.current
    const eyebrow = eyebrowRef.current
    const title = titleRef.current
    const lede = ledeRef.current
    const cta = ctaRef.current
    const rail = railRef.current
    if (reducedMotion || !root || !eyebrow || !title || !lede || !cta || !rail) return undefined

    const words = Array.from(title.querySelectorAll<HTMLElement>('[data-reveal-word]'))
    return playHeroIntro({ root, eyebrow, words, lede, cta, rail })
  }, [reducedMotion])

  // `--hero-progress` changes every frame while scrolling, so it is written straight to the element rather than through React state.
  useEffect(() => {
    const section = sectionRef.current
    if (reducedMotion || !section) return undefined

    const stop = trackScrollProgress(section, (progress) => {
      section.style.setProperty('--hero-progress', String(progress))
    })
    return () => {
      stop()
      section.style.removeProperty('--hero-progress')
    }
  }, [reducedMotion])

  return (
    <section ref={sectionRef} className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.lighting} aria-hidden="true" />
      <div className={styles.stageFrame}>
        <ProductStage introduce />
      </div>
      <div className={styles.scrim} aria-hidden="true" />

      <Container className={styles.inner}>
        <div className={styles.copy}>
          <p ref={eyebrowRef} className={cx(styles.eyebrow, 'type-eyebrow')}>
            {hero.eyebrow}
          </p>
          <h1 ref={titleRef} id="hero-title" className={cx(styles.title, 'type-display')}>
            {renderRevealWords(hero.title, { word: styles.word, inner: styles.wordInner })}
          </h1>
          <div className={styles.foot}>
            <p ref={ledeRef} className={cx(styles.lede, 'type-lede')}>
              {hero.lede}
            </p>
            <div ref={ctaRef} className={styles.cta}>
              <PrimaryButton href={hero.cta.href}>{hero.cta.label}</PrimaryButton>
            </div>
          </div>
        </div>

        <div ref={railRef} className={styles.rail}>
          <SectionIndicator current={1} total={hero.sectionCount} />
          <ScrollHint className={styles.hint} href={hero.scrollTo.href} destination={hero.scrollTo.destination} />
        </div>
      </Container>
    </section>
  )
}
