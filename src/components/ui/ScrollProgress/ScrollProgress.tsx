import { useEffect, useRef } from 'react'
import { trackPageProgress } from '@/animation/scroll'
import { cx } from '@/lib/cx'
import styles from './ScrollProgress.module.css'

interface ScrollProgressProps {
  className?: string | undefined
}

/**
 * A hairline that fills as the page scrolls. It positions itself on the bottom
 * edge of its nearest positioned ancestor (the site header's own rule), is
 * decorative to assistive technology, and ignores the pointer. The ratio goes
 * straight to a CSS variable, never through React state, so scrolling does no
 * rendering work.
 *
 * It stays on for reduced motion: it reports where you are and does not move
 * anything by itself.
 */
export function ScrollProgress({ className }: ScrollProgressProps) {
  const barRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return undefined
    return trackPageProgress((progress) => {
      bar.style.setProperty('--page-progress', String(progress))
    })
  }, [])

  return (
    <span ref={barRef} className={cx(styles.bar, className)} aria-hidden="true">
      <span className={styles.fill} />
    </span>
  )
}
