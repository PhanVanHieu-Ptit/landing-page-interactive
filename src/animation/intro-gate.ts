/**
 * A one-way latch that holds the page's entrance animations until the
 * preloader lets go. It is a promise as well as a flag, so the Web Animations
 * and tween code in this folder can wait on it without knowing about React.
 */
export interface IntroGate {
  /** Resolves when the gate opens, immediately if it already has. Never rejects. */
  readonly released: Promise<void>
  isReleased: () => boolean
  /** Opens the gate. Idempotent. */
  release: () => void
  /** Calls `listener` when the gate opens, for `useSyncExternalStore`. Returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void
}

export function createIntroGate(): IntroGate {
  let open = false
  let resolve: () => void = () => undefined
  const released = new Promise<void>((done) => {
    resolve = done
  })
  const listeners = new Set<() => void>()

  return {
    released,
    isReleased: () => open,
    release: () => {
      if (open) return
      open = true
      resolve()
      for (const listener of listeners) listener()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/** A gate that is already open: what components get when nothing above them holds the entrance back. */
export const OPEN_GATE: IntroGate = (() => {
  const gate = createIntroGate()
  gate.release()
  return gate
})()
