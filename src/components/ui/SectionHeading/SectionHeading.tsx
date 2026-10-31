import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { cssVars } from '@/lib/css-vars'
import { renderStaggeredWords } from '@/lib/emphasis'
import styles from './SectionHeading.module.css'

interface SectionHeadingProps {
  /** Set it, and point the parent section's `aria-labelledby` at it. */
  id?: string
  /** Heading level. Pick it for document outline, not for looks: size is controlled by `size`. */
  as?: 'h1' | 'h2' | 'h3'
  /** Section number, shown in the accent color: "02". */
  index?: string
  eyebrow?: string
  /** Plain copy; wrap the one italic span in asterisks: "Taken apart, *one chapter* at a time." */
  title: string
  lede?: ReactNode
  size?: 'default' | 'large'
  align?: 'start' | 'center'
  className?: string | undefined
}

/*
 * The heading is its own reveal host, and its parts enter in reading order:
 * eyebrow (0), its hairlines drawing (1), the title word by word (2 onward),
 * then the lede. The lede's slot is fixed, so a short title waits a beat for it
 * and a long one never pushes it back (the stagger is capped).
 */
const RULE_AT = 1
const TITLE_AT = 2
const LEDE_AT = 9

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
    <header data-reveal="" className={cx(styles.heading, align === 'center' && styles.center, className)}>
      {index || eyebrow ? (
        <p data-reveal-item="" className={cx(styles.eyebrow, 'type-eyebrow')} style={cssVars({ '--i': 0 })}>
          {align === 'center' ? (
            <span
              data-reveal-item="rule"
              className={cx(styles.rule, styles.ruleLead)}
              style={cssVars({ '--i': RULE_AT })}
              aria-hidden="true"
            />
          ) : null}
          {index ? <span className={styles.index}>{index}</span> : null}
          {eyebrow ? <span>{eyebrow}</span> : null}
          <span data-reveal-item="rule" className={styles.rule} style={cssVars({ '--i': RULE_AT })} aria-hidden="true" />
        </p>
      ) : null}
      <Heading id={id} className={cx(styles.title, size === 'large' ? 'type-title-xl' : 'type-title')}>
        {renderStaggeredWords(title, TITLE_AT)}
      </Heading>
      {lede ? (
        <p data-reveal-item="" className={cx(styles.lede, 'type-lede')} style={cssVars({ '--i': LEDE_AT })}>
          {lede}
        </p>
      ) : null}
    </header>
  )
}
