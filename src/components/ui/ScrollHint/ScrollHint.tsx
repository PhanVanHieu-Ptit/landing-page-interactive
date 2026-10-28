import { cx } from '@/lib/cx'
import styles from './ScrollHint.module.css'

interface ScrollHintProps {
  /** In-page target, such as "#anatomy". */
  href: string
  /** Where the link goes, for assistive technology: spoken as "Scroll to anatomy". */
  destination: string
  /** Visible text. */
  label?: string
  className?: string | undefined
}

/** A quiet "keep going" cue: a real link to the next section, so it works with keyboard and screen reader too. */
export function ScrollHint({ href, destination, label = 'Scroll', className }: ScrollHintProps) {
  return (
    <a className={cx(styles.hint, className)} href={href} aria-label={`${label} to ${destination}`}>
      <span className={cx(styles.label, 'type-eyebrow')}>{label}</span>
      <span className={styles.line} aria-hidden="true" />
    </a>
  )
}
