import styles from './SkipLink.module.css'

/** First focusable element on the page: lets keyboard users jump past the header. */
export function SkipLink() {
  return (
    <a className={styles.skipLink} href="#main">
      Skip to content
    </a>
  )
}
