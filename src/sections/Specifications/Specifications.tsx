import { Container } from '@/components/layout'
import { SectionHeading } from '@/components/ui'
import { specs, specsCopy } from '@/content/specs'
import { cx } from '@/lib/cx'
import { renderEmphasis } from '@/lib/emphasis'
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
          title={renderEmphasis(specsCopy.title)}
          lede={specsCopy.lede}
        />

        <dl className={styles.list}>
          {specs.map((spec) => (
            <div key={spec.label} className={styles.item}>
              <dt className={cx(styles.label, 'type-eyebrow')}>{spec.label}</dt>
              <dd className={cx(styles.value, 'type-figure')}>{spec.value}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  )
}
