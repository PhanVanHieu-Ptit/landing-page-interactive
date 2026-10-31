import { cx } from '@/lib/cx'
import styles from './SwapText.module.css'

interface SwapTextProps {
  /** Every string that can be shown. All are laid out in one cell, so the widest sets the width and nothing shifts on a swap. */
  items: readonly string[]
  /** Index of the item to show. */
  activeIndex: number
  /** Which edge the text hugs when the cell is wider than the item. */
  align?: 'start' | 'end'
  className?: string | undefined
}

/**
 * A label that rolls to its replacement: the old text lifts away and fades while
 * the new one rises into place, inside a clip. Items before the active one wait
 * above and items after it wait below, so the roll follows the direction you
 * are moving in, forward or back.
 *
 * It is declarative: the state is a `data-state` per item and the motion is CSS
 * transitions, so it takes any number of swaps (a scrubbed scroll can make many
 * in a row) with no timers to queue up. Only the active item is exposed to
 * assistive technology.
 */
export function SwapText({ items, activeIndex, align = 'start', className }: SwapTextProps) {
  return (
    <span className={cx(styles.swap, align === 'end' && styles.end, className)}>
      {items.map((item, index) => (
        <span
          key={item}
          className={styles.item}
          data-state={index === activeIndex ? 'current' : index < activeIndex ? 'past' : 'future'}
          aria-hidden={index === activeIndex ? undefined : true}
        >
          {item}
        </span>
      ))}
    </span>
  )
}
