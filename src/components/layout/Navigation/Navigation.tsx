import type { NavItem } from '@/content/types'
import { cx } from '@/lib/cx'
import styles from './Navigation.module.css'

interface NavigationProps {
  items: readonly NavItem[]
  /** Accessible name. Every nav landmark on a page needs a distinct one. */
  label: string
  /**
   * `header`: stacked large serif links on mobile, inline small links from tablet up.
   * `footer`: a compact list.
   */
  variant?: 'header' | 'footer'
  /** Called after a link is activated; the mobile header uses it to close its panel. */
  onNavigate?: () => void
  className?: string | undefined
}

/** One labelled `<nav>` landmark with an underline-reveal on hover and keyboard focus. */
export function Navigation({ items, label, variant = 'header', onNavigate, className }: NavigationProps) {
  return (
    <nav aria-label={label} className={cx(styles.nav, variant === 'header' ? styles.header : styles.footer, className)}>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.href}>
            <a className={styles.link} href={item.href} onClick={onNavigate}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
