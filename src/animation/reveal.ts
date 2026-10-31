/** How long reveals wait for webfonts, so a headline never reflows mid-entrance. */
const FONT_WAIT_MS = 600

/** Starts a reveal this far inside the bottom edge of the viewport, so text is already moving as it arrives, not as it leaves. */
const ROOT_MARGIN = '0px 0px -10% 0px'

/** The part of an `IntersectionObserverEntry` the decision needs, so it can be tested without a DOM. */
export interface RevealEntry {
  isIntersecting: boolean
  boundingClientRect: { bottom: number }
}

/**
 * A host reveals once it is on screen, or once it is already behind the user:
 * a reload that restores the scroll position, or an anchor jump, leaves hosts
 * above the viewport that would otherwise stay hidden until scrolled back to.
 */
export function shouldReveal(entry: RevealEntry): boolean {
  return entry.isIntersecting || entry.boundingClientRect.bottom <= 0
}

const markRevealed = (host: Element) => host.setAttribute('data-revealed', '')

/**
 * Reveals every `[data-reveal]` host under `root` the first time it scrolls into
 * view (the contract is documented in src/styles/reveal.css). The observer is
 * one-shot per host and nothing runs on scroll events, so it cannot get in the
 * way of scrolling. Observing begins after webfonts are ready (or 600 ms,
 * whichever comes first) and after `until` resolves, which is how the page
 * holds every entrance back while the loading screen is up. Without
 * `IntersectionObserver` everything is revealed at once. Returns a cleanup
 * function.
 */
export function observeReveals(root: ParentNode, until: Promise<void> = Promise.resolve()): () => void {
  const hosts = Array.from(root.querySelectorAll('[data-reveal]:not([data-revealed])'))
  if (hosts.length === 0) return () => undefined

  if (typeof IntersectionObserver === 'undefined') {
    hosts.forEach(markRevealed)
    return () => undefined
  }

  let observer: IntersectionObserver | undefined
  let cancelled = false
  let timer = 0

  const start = () => {
    if (cancelled) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!shouldReveal(entry)) continue
          markRevealed(entry.target)
          io.unobserve(entry.target)
        }
      },
      { rootMargin: ROOT_MARGIN },
    )
    observer = io
    hosts.forEach((host) => io.observe(host))
  }

  const timeout = new Promise<void>((resolve) => {
    timer = window.setTimeout(resolve, FONT_WAIT_MS)
  })
  Promise.all([Promise.race([document.fonts.ready, timeout]), until]).then(start, start)

  return () => {
    cancelled = true
    window.clearTimeout(timer)
    observer?.disconnect()
  }
}
