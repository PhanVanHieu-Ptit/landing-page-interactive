import { ArrowUpIcon, LogoMark } from '@/components/icons'
import { footerItems, site } from '@/content/site'
import { cx } from '@/lib/cx'
import { Container } from '../Container/Container'
import { Navigation } from '../Navigation/Navigation'
import styles from './SiteFooter.module.css'

/** Closing band: brand, links, contact and the fictional-brand note, over an oversized ghost wordmark. */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.rule} aria-hidden="true" />

        <div className={styles.top}>
          <div className={styles.brand}>
            <div className={styles.lockup}>
              <LogoMark className={styles.mark} />
              <span className={styles.wordmark}>{site.name}</span>
            </div>
            <p className={styles.tagline}>{site.tagline}</p>
          </div>

          <div className={styles.group}>
            <p className={cx(styles.groupLabel, 'type-eyebrow')}>Explore</p>
            <Navigation items={footerItems} label="Footer" variant="footer" />
          </div>

          <address className={styles.group}>
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
