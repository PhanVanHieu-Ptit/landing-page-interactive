import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const getSnapshot = () => window.matchMedia(QUERY).matches

/**
 * True when the visitor asked the OS for reduced motion. CSS animations are
 * already quieted by the global rule in `reset.css`; JavaScript-driven motion
 * (Web Animations, canvas tweens, scroll-linked values) has to check this.
 * Updates live if the setting changes.
 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
