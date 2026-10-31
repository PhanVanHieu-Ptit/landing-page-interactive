import { useEffect, useId, useRef } from 'react'
import { LogoMark } from '@/components/icons'
import { PrimaryButton, ScrollProgress, SwapText } from '@/components/ui'
import { headerCta, navItems, site } from '@/content/site'
import { useDisclosure } from '@/hooks/useDisclosure'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useScrolled } from '@/hooks/useScrolled'
import { cx } from '@/lib/cx'
import { Container } from '../Container/Container'
import { Navigation } from '../Navigation/Navigation'
import styles from './SiteHeader.module.css'

/** Closed first, open second: the order `SwapText` rolls through. */
const TOGGLE_LABELS = ['Menu', 'Close'] as const

/**
 * Sticky banner: mark, two links and one call to action. It floats over the
 * Hero, bare until the page scrolls. Below the tablet breakpoint the links
 * collapse into a panel behind a text toggle, and the call to action moves out
 * of the panel into the bar itself (once the page has scrolled, since the Hero
 * has its own), so it is one tap away wherever you are, never behind a menu.
 */
export function SiteHeader() {
  const toggleRef = useRef<HTMLButtonElement>(null)
  const { open, toggle, close } = useDisclosure({ restoreFocusTo: toggleRef })
  const scrolled = useScrolled()
  const menuId = useId()

  // Rotating or resizing past the breakpoint swaps the panel for the inline links; an open menu must not outlive it.
  const inline = useMediaQuery('(min-width: 48rem)')
  useEffect(() => {
    if (inline) close()
  }, [inline, close])

  return (
    // The dimmed area under an open panel is a pointer-only target: tapping it closes the menu. The keyboard has Escape (see useDisclosure) and the toggle.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <header
      className={styles.header}
      data-scrolled={scrolled ? '' : undefined}
      data-menu-open={open ? '' : undefined}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <Container className={styles.bar}>
        <a className={styles.brand} href="#top">
          <LogoMark className={styles.mark} />
          <span className={styles.wordmark}>{site.name}</span>
        </a>

        <div className={styles.actions}>
          <PrimaryButton href={headerCta.href} size="sm" className={styles.barCta} onClick={close}>
            {headerCta.label}
          </PrimaryButton>
          <button
            ref={toggleRef}
            type="button"
            className={cx(styles.toggle, 'type-eyebrow')}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={toggle}
          >
            <SwapText items={TOGGLE_LABELS} activeIndex={open ? 1 : 0} align="end" />
          </button>
        </div>

        <div id={menuId} className={styles.menu}>
          <Navigation items={navItems} label="Primary" onNavigate={close} />
          <div className={styles.menuCta}>
            <PrimaryButton href={headerCta.href} size="sm" onClick={close}>
              {headerCta.label}
            </PrimaryButton>
          </div>
        </div>
      </Container>
      <ScrollProgress />
    </header>
  )
}
