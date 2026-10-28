import { Container } from '@/components/layout'
import { ProductStage } from '@/components/stage'
import { PrimaryButton, ScrollHint, SectionIndicator } from '@/components/ui'
import { hero } from '@/content/site'
import { cx } from '@/lib/cx'
import { renderEmphasis } from '@/lib/emphasis'
import styles from './Hero.module.css'

/** The opening statement: one product, one sentence, one action. */
export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.lighting} aria-hidden="true" />
      <ProductStage className={styles.stage} />

      <Container className={styles.inner}>
        <div className={styles.copy}>
          <p className={cx(styles.eyebrow, 'type-eyebrow')}>{hero.eyebrow}</p>
          <h1 id="hero-title" className={cx(styles.title, 'type-display')}>
            {renderEmphasis(hero.title)}
          </h1>
          <p className={cx(styles.lede, 'type-lede')}>{hero.lede}</p>
          <PrimaryButton href={hero.cta.href}>{hero.cta.label}</PrimaryButton>
        </div>

        <div className={styles.rail}>
          <SectionIndicator current={1} total={hero.sectionCount} />
          <ScrollHint className={styles.hint} href={hero.scrollTo.href} destination={hero.scrollTo.destination} />
        </div>
      </Container>
    </section>
  )
}
