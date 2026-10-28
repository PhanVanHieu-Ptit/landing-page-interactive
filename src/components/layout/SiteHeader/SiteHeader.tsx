import { useId, useRef } from 'react'
import { LogoMark } from '@/components/icons'
import { PrimaryButton } from '@/components/ui'
import { headerCta, navItems, site } from '@/content/site'
import { useDisclosure } from '@/hooks/useDisclosure'
import { useScrolled } from '@/hooks/useScrolled'
import { cx } from '@/lib/cx'
import { Container } from '../Container/Container'
import { Navigation } from '../Navigation/Navigation'
import styles from './SiteHeader.module.css'

/**
 * Sticky banner: mark, two links and one call to action. It floats over the
 * Hero, bare until the page scrolls. Below the tablet breakpoint the links and
 * the CTA collapse into a panel behind a text toggle.
 */
export function SiteHeader() {
  const toggleRef = useRef<HTMLButtonElement>(null)
  const { open, toggle, close } = useDisclosure({ restoreFocusTo: toggleRef })
  const scrolled = useScrolled()
  const menuId = useId()

  return (
    <header
      className={styles.header}
      data-scrolled={scrolled ? '' : undefined}
      data-menu-open={open ? '' : undefined}
    >
      <Container className={styles.bar}>
        <a className={styles.brand} href="#top">
          <LogoMark className={styles.mark} />
          <span className={styles.wordmark}>{site.name}</span>
        </a>

        <button
          ref={toggleRef}
          type="button"
          className={cx(styles.toggle, 'type-eyebrow')}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={toggle}
        >
          {open ? 'Close' : 'Menu'}
        </button>

        <div id={menuId} className={styles.menu}>
          <Navigation items={navItems} label="Primary" onNavigate={close} />
          <PrimaryButton href={headerCta.href} size="sm" className={styles.cta} onClick={close}>
            {headerCta.label}
          </PrimaryButton>
        </div>
      </Container>
    </header>
  )
}
