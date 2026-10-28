import { useEffect, useState } from 'react'

/**
 * True once the page has scrolled more than `threshold` pixels from the top.
 * The listener is passive and state only changes when the threshold is crossed,
 * so scrolling does not re-render the caller.
 */
export function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [threshold])

  return scrolled
}
