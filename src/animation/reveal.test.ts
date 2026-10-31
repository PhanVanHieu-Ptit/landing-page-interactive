import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { observeReveals, shouldReveal } from './reveal'

const entry = (isIntersecting: boolean, bottom: number) => ({ isIntersecting, boundingClientRect: { bottom } })

describe('shouldReveal', () => {
  it('reveals a host that is on screen', () => {
    expect(shouldReveal(entry(true, 400))).toBe(true)
  })

  it('reveals a host that is already above the viewport, so a restored scroll position or an anchor jump leaves nothing hidden', () => {
    expect(shouldReveal(entry(false, -40))).toBe(true)
    expect(shouldReveal(entry(false, 0))).toBe(true)
  })

  it('waits for a host that is still below the viewport', () => {
    expect(shouldReveal(entry(false, 1200))).toBe(false)
  })
})

/* The observer is wired to the DOM, so these tests stand in a minimal fake for each piece it touches. */

class FakeHost {
  attributes = new Map<string, string>()

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value)
  }

  get revealed() {
    return this.attributes.has('data-revealed')
  }
}

class FakeObserver {
  static instances: FakeObserver[] = []

  callback: (entries: Array<ReturnType<typeof entry> & { target: FakeHost }>) => void
  options: unknown
  watched = new Set<FakeHost>()
  disconnected = false

  constructor(callback: FakeObserver['callback'], options: unknown) {
    this.callback = callback
    this.options = options
    FakeObserver.instances.push(this)
  }

  observe(target: FakeHost) {
    this.watched.add(target)
  }

  unobserve(target: FakeHost) {
    this.watched.delete(target)
  }

  disconnect() {
    this.disconnected = true
  }
}

const rootWith = (hosts: FakeHost[]) => {
  const querySelectorAll = vi.fn(() => hosts)
  return { root: { querySelectorAll } as unknown as ParentNode, querySelectorAll }
}

/** Lets already-resolved promises (the font gate) run their continuations. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('observeReveals', () => {
  beforeEach(() => {
    FakeObserver.instances = []
    vi.stubGlobal('window', {
      setTimeout: (callback: () => void, ms: number) => globalThis.setTimeout(callback, ms),
      clearTimeout: (id: number) => globalThis.clearTimeout(id),
    })
    vi.stubGlobal('document', { fonts: { ready: Promise.resolve() } })
    vi.stubGlobal('IntersectionObserver', FakeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('only asks for hosts that have not been revealed yet, so running twice (StrictMode) is harmless', () => {
    const { root, querySelectorAll } = rootWith([])
    observeReveals(root)
    expect(querySelectorAll).toHaveBeenCalledWith('[data-reveal]:not([data-revealed])')
  })

  it('reveals a host once it intersects, then stops watching it', async () => {
    const [near, far] = [new FakeHost(), new FakeHost()]
    const stop = observeReveals(rootWith([near, far]).root)
    await flush()

    const observer = FakeObserver.instances[0]
    expect(observer?.watched.size).toBe(2)

    observer?.callback([{ ...entry(true, 300), target: near }])
    expect(near.revealed).toBe(true)
    expect(far.revealed).toBe(false)
    expect(observer?.watched.has(near)).toBe(false)
    expect(observer?.watched.has(far)).toBe(true)
    stop()
  })

  it('leaves a host alone while it is below the viewport', async () => {
    const host = new FakeHost()
    const stop = observeReveals(rootWith([host]).root)
    await flush()

    FakeObserver.instances[0]?.callback([{ ...entry(false, 1500), target: host }])
    expect(host.revealed).toBe(false)
    stop()
  })

  it('does not start watching until the webfonts are ready', async () => {
    let fontsLoaded: () => void = () => undefined
    vi.stubGlobal('document', {
      fonts: {
        ready: new Promise<void>((resolve) => {
          fontsLoaded = resolve
        }),
      },
    })

    const stop = observeReveals(rootWith([new FakeHost()]).root)
    await flush()
    expect(FakeObserver.instances).toHaveLength(0)

    fontsLoaded()
    await flush()
    expect(FakeObserver.instances).toHaveLength(1)
    stop()
  })

  it('never starts if it is cleaned up while waiting, and disconnects once it has', async () => {
    vi.stubGlobal('document', { fonts: { ready: new Promise<void>(() => undefined) } })
    observeReveals(rootWith([new FakeHost()]).root)()
    await flush()
    expect(FakeObserver.instances).toHaveLength(0)

    vi.stubGlobal('document', { fonts: { ready: Promise.resolve() } })
    const stop = observeReveals(rootWith([new FakeHost()]).root)
    await flush()
    stop()
    expect(FakeObserver.instances[0]?.disconnected).toBe(true)
  })

  it('reveals everything at once when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const hosts = [new FakeHost(), new FakeHost()]
    observeReveals(rootWith(hosts).root)
    expect(hosts.every((host) => host.revealed)).toBe(true)
  })
})
