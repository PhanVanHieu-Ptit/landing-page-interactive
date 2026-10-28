import { cssVars } from '@/lib/css-vars'
import { cx } from '@/lib/cx'
import styles from './SectionIndicator.module.css'

interface SectionIndicatorProps {
  /** 1-based index of the current section. */
  current: number
  total: number
  /** Fill of the track, 0 to 1. Defaults to `current / total`; a scroll-driven scene can pass the live value. */
  progress?: number
  /** Spoken as "Section 1 of 4". */
  noun?: string
  className?: string | undefined
}

const pad = (value: number) => String(value).padStart(2, '0')
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** "01 ——— 04": where you are, out of how many. Presentational; the fill animates when `progress` changes. */
export function SectionIndicator({ current, total, progress, noun = 'Section', className }: SectionIndicatorProps) {
  const fill = clamp01(progress ?? current / total)

  return (
    <div className={cx(styles.indicator, className)}>
      <span className="visually-hidden">
        {noun} {current} of {total}
      </span>
      <span className={cx(styles.numeral, styles.current, 'type-eyebrow')} aria-hidden="true">
        {pad(current)}
      </span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} style={cssVars({ '--progress': fill })} />
      </span>
      <span className={cx(styles.numeral, 'type-eyebrow')} aria-hidden="true">
        {pad(total)}
      </span>
    </div>
  )
}
