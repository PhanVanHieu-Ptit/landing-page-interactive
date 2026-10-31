import { Container } from '@/components/layout'
import { PrimaryButton, SectionHeading } from '@/components/ui'
import { reserve } from '@/content/site'
import { cx } from '@/lib/cx'
import { cssVars } from '@/lib/css-vars'
import styles from './Reserve.module.css'

/*
 * The heading is its own host and runs through slot 5 (eyebrow, rules, then a
 * four-word title). Everything else here is a host of its own and takes the
 * slots after it, so the whole section reads as one sequence.
 */
const BODY_AT = 6
const CTA_AT = 7

/** The close: one statement, one action, lit from behind. */
export function Reserve() {
  return (
    <section id="reserve" className={styles.section} aria-labelledby="reserve-title">
      <div data-reveal="" data-reveal-item="fade" className={styles.glow} aria-hidden="true" />
      <Container width="narrow" className={styles.inner}>
        <SectionHeading
          id="reserve-title"
          index={reserve.index}
          eyebrow={reserve.eyebrow}
          title={reserve.title}
          size="large"
          align="center"
        />
        <p data-reveal="" data-reveal-item="" className={cx(styles.body, 'type-lede')} style={cssVars({ '--i': BODY_AT })}>
          {reserve.body}
        </p>
        <div data-reveal="" data-reveal-item="" style={cssVars({ '--i': CTA_AT })}>
          <PrimaryButton href={reserve.cta.href}>{reserve.cta.label}</PrimaryButton>
        </div>
      </Container>
    </section>
  )
}
