import { Container } from '@/components/layout'
import { PrimaryButton, SectionHeading } from '@/components/ui'
import { reserve } from '@/content/site'
import { cx } from '@/lib/cx'
import { renderEmphasis } from '@/lib/emphasis'
import styles from './Reserve.module.css'

/** The close: one statement, one action, lit from behind. */
export function Reserve() {
  return (
    <section id="reserve" className={styles.section} aria-labelledby="reserve-title">
      <div className={styles.glow} aria-hidden="true" />
      <Container width="narrow" className={styles.inner}>
        <SectionHeading
          id="reserve-title"
          index={reserve.index}
          eyebrow={reserve.eyebrow}
          title={renderEmphasis(reserve.title)}
          size="large"
          align="center"
        />
        <p className={cx(styles.body, 'type-lede')}>{reserve.body}</p>
        <PrimaryButton href={reserve.cta.href}>{reserve.cta.label}</PrimaryButton>
      </Container>
    </section>
  )
}
