import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import styles from './SectionHeading.module.css'

interface SectionHeadingProps {
  /** Set it, and point the parent section's `aria-labelledby` at it. */
  id?: string
  /** Heading level. Pick it for document outline, not for looks: size is controlled by `size`. */
  as?: 'h1' | 'h2' | 'h3'
  /** Section number, shown in the accent color: "02". */
  index?: string
  eyebrow?: string
  title: ReactNode
  lede?: ReactNode
  size?: 'default' | 'large'
  align?: 'start' | 'center'
  className?: string | undefined
}

/** Eyebrow, serif title and lede: the opening of every section. */
export function SectionHeading({
  id,
  as: Heading = 'h2',
  index,
  eyebrow,
  title,
  lede,
  size = 'default',
  align = 'start',
  className,
}: SectionHeadingProps) {
  return (
    <header className={cx(styles.heading, align === 'center' && styles.center, className)}>
      {index || eyebrow ? (
        <p className={cx(styles.eyebrow, 'type-eyebrow')}>
          {align === 'center' ? <span className={cx(styles.rule, styles.ruleLead)} aria-hidden="true" /> : null}
          {index ? <span className={styles.index}>{index}</span> : null}
          {eyebrow ? <span>{eyebrow}</span> : null}
          <span className={styles.rule} aria-hidden="true" />
        </p>
      ) : null}
      <Heading id={id} className={cx(styles.title, size === 'large' ? 'type-title-xl' : 'type-title')}>
        {title}
      </Heading>
      {lede ? <p className={cx(styles.lede, 'type-lede')}>{lede}</p> : null}
    </header>
  )
}
