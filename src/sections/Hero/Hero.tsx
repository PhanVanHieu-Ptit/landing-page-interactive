import { useEffect, useRef } from 'react'
import { trackScrollProgress } from '@/animation/scroll'
import { Container } from '@/components/layout'
import { ProductStage } from '@/components/stage'
import { PrimaryButton, ScrollHint, SectionIndicator } from '@/components/ui'
import { hero } from '@/content/site'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cssVars } from '@/lib/css-vars'
import { cx } from '@/lib/cx'
import { renderStaggeredWords } from '@/lib/emphasis'
import styles from './Hero.module.css'

/*
 * The copy enters through the page's reveal system (src/styles/reveal.css), held
 * until the loading screen lets go, in reading order: eyebrow (0), the headline
 * word by word, the lede, the call to action, then the scroll cue. The host's
 * `--reveal-lead` (Hero.module.css) makes all of it wait for the lens to lead.
 */
const TITLE_AT = 1
const LEDE_AT = 7
const CTA_AT = 8
const RAIL_AT = 9

/**
 * The opening statement: one product, one sentence, one action. The lens leads
 * the entrance and the copy follows; scrolling away drifts the lens down and
 * fades the copy into the next section. Both are skipped for reduced motion.
 */
export function Hero() {
  const reducedMotion = usePrefersReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)

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
    <section ref={sectionRef} data-reveal="" className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.lighting} aria-hidden="true" />
      <div className={styles.stageFrame}>
        <ProductStage introduce />
      </div>
      <div className={styles.scrim} aria-hidden="true" />

      <Container className={styles.inner}>
        <div className={styles.copy}>
          <p data-reveal-item="" className={cx(styles.eyebrow, 'type-eyebrow')} style={cssVars({ '--i': 0 })}>
            {hero.eyebrow}
          </p>
          <h1 id="hero-title" className={cx(styles.title, 'type-display')}>
            {renderStaggeredWords(hero.title, TITLE_AT)}
          </h1>
          <div className={styles.foot}>
            <p data-reveal-item="" className={cx(styles.lede, 'type-lede')} style={cssVars({ '--i': LEDE_AT })}>
              {hero.lede}
            </p>
            <div data-reveal-item="" className={styles.cta} style={cssVars({ '--i': CTA_AT })}>
              <PrimaryButton href={hero.cta.href}>{hero.cta.label}</PrimaryButton>
            </div>
          </div>
        </div>

        <div data-reveal-item="fade" className={styles.rail} style={cssVars({ '--i': RAIL_AT })}>
          <SectionIndicator current={1} total={hero.sectionCount} />
          <ScrollHint className={styles.hint} href={hero.scrollTo.href} destination={hero.scrollTo.destination} />
        </div>
      </Container>
    </section>
  )
}
