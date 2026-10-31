import { ArrowUpIcon, LogoMark } from '@/components/icons'
import { footerItems, site } from '@/content/site'
import { cx } from '@/lib/cx'
import { cssVars } from '@/lib/css-vars'
import { Container } from '../Container/Container'
import { Navigation } from '../Navigation/Navigation'
import styles from './SiteFooter.module.css'

/** The footer's columns enter left to right, one stagger step apart. */
const column = (position: number) => cssVars({ '--i': position })

/** Closing band: brand, links, contact and the fictional-brand note, over an oversized ghost wordmark. */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <Container>
        <div data-reveal="" data-reveal-item="rule" className={styles.rule} aria-hidden="true" />

        <div data-reveal="" className={styles.top}>
          <div data-reveal-item="" className={styles.brand} style={column(0)}>
            <div className={styles.lockup}>
              <LogoMark className={styles.mark} />
              <span className={styles.wordmark}>{site.name}</span>
            </div>
            <p className={styles.tagline}>{site.tagline}</p>
          </div>

          <div data-reveal-item="" className={styles.group} style={column(1)}>
            <p className={cx(styles.groupLabel, 'type-eyebrow')}>Explore</p>
            <Navigation items={footerItems} label="Footer" variant="footer" />
          </div>

          <address data-reveal-item="" className={styles.group} style={column(2)}>
            <p className={cx(styles.groupLabel, 'type-eyebrow')}>Contact</p>
            <a className={styles.link} href={`mailto:${site.email}`}>
              {site.email}
            </a>
            <a className={cx(styles.link, styles.toTop)} href="#top">
              Back to top
              <ArrowUpIcon className={styles.arrow} />
            </a>
          </address>
        </div>

        <div data-reveal="" data-reveal-item="fade" className={styles.legal}>
          <p className="type-body-sm">{site.disclaimer}</p>
          <p className="type-body-sm">
            © {site.year} {site.name}
          </p>
        </div>
      </Container>

      <p data-reveal="" data-reveal-item="" className={styles.ghost} aria-hidden="true">
        {site.name}
      </p>
    </footer>
  )
}
