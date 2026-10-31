import { ArrowUpIcon, LogoMark } from '@/components/icons'
import { footerItems, site } from '@/content/site'
import { cx } from '@/lib/cx'
import { Container } from '../Container/Container'
import { Navigation } from '../Navigation/Navigation'
import styles from './SiteFooter.module.css'

<<<<<<< Updated upstream
=======
/** The footer's columns enter left to right, one stagger step apart. */
const column = (position: number) => cssVars({ '--i': position })

interface SiteFooterProps {
  /** Takes the footer out of the tab order and the accessibility tree (while the mobile menu covers it). */
  inert?: boolean | undefined
}

>>>>>>> Stashed changes
/** Closing band: brand, links, contact and the fictional-brand note, over an oversized ghost wordmark. */
export function SiteFooter({ inert }: SiteFooterProps) {
  return (
    <footer className={styles.footer} inert={inert}>
      <Container>
        <div className={styles.rule} aria-hidden="true" />

        <div className={styles.top}>
          <div className={styles.brand}>
            <div className={styles.lockup}>
              <LogoMark className={styles.mark} />
              <span className="type-wordmark">{site.name}</span>
            </div>
            <p className={styles.tagline}>{site.tagline}</p>
          </div>

          <div className={styles.group}>
            <p className={cx(styles.groupLabel, 'type-eyebrow')}>Explore</p>
            <Navigation items={footerItems} label="Footer" variant="footer" />
          </div>

<<<<<<< Updated upstream
          <address className={styles.group}>
=======
          <div data-reveal-item="" className={styles.group} style={column(2)}>
>>>>>>> Stashed changes
            <p className={cx(styles.groupLabel, 'type-eyebrow')}>Contact</p>
            <address className={styles.contact}>
              <a className={styles.link} href={`mailto:${site.email}`}>
                {site.email}
              </a>
            </address>
            <a className={cx(styles.link, styles.toTop)} href="#top">
              Back to top
              <ArrowUpIcon className={styles.arrow} />
            </a>
          </div>
        </div>

        <div className={styles.legal}>
          <p className="type-body-sm">{site.disclaimer}</p>
          <p className="type-body-sm">
            © {site.year} {site.name}
          </p>
        </div>
      </Container>

      <p className={styles.ghost} aria-hidden="true">
        {site.name}
      </p>
    </footer>
  )
}
