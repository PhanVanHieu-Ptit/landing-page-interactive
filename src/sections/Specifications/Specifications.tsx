import { Container } from '@/components/layout'
import { SectionHeading } from '@/components/ui'
import { specs, specsCopy } from '@/content/specs'
import { cx } from '@/lib/cx'
import { cssVars } from '@/lib/css-vars'
import styles from './Specifications.module.css'

/** The numbers, as a hairline grid of label/value pairs. */
export function Specifications() {
  return (
    <section id="specifications" className={styles.section} aria-labelledby="specifications-title">
      <Container>
        <SectionHeading
          id="specifications-title"
          index={specsCopy.index}
          eyebrow={specsCopy.eyebrow}
          title={specsCopy.title}
          lede={specsCopy.lede}
        />

        <dl className={styles.list}>
          {specs.map((spec) => (
            <div key={spec.label} data-reveal="" className={cx(styles.item, 'reveal-line')}>
              <dt data-reveal-item="" className={cx(styles.label, 'type-eyebrow')} style={cssVars({ '--i': 1 })}>
                {spec.label}
              </dt>
              <dd data-reveal-item="" className={cx(styles.value, 'type-figure')} style={cssVars({ '--i': 2 })}>
                {spec.value}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  )
}
