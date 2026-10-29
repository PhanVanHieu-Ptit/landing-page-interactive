import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FrameLoader, FrameLoaderOptions, ImageSequenceSource } from '../imageSequence.types'
import { createFrameLoader } from './frameLoader'

/** What the fake server does with one request: answer it, answer it with a status, or never answer. */
type Reply = 'ok' | 'hang' | number | { status: number; type: string }
type Answer = Exclude<Reply, 'hang'>

interface FakeRequest {
  url: string
  /** Zero-based frame index parsed from the URL. */
  index: number
  /** 1 for the first request for this URL, 2 for the first retry, and so on. */
  attempt: number
  init: RequestInit
  aborted: boolean
  settled: boolean
  respond: (answer: Answer) => void
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * A stand-in for the browser: a fetch that the test answers (or lets answer
 * itself), a decoder that hands out closeable bitmaps and counts the live ones,
 * and an animation-frame queue the test flushes by hand.
 */
function createHarness(plan: (index: number, attempt: number) => Reply = () => 'ok') {
  const requests: FakeRequest[] = []
  const attempts = new Map<string, number>()
  const stats = { activity: 0, inflight: 0, maxInflight: 0, live: 0, maxLive: 0, created: 0, closed: 0 }
  let queued: (() => void)[] = []

  const toResponse = (answer: Answer, url: string) => {
    const { status, type } =
      answer === 'ok' ? { status: 200, type: 'image/webp' } : typeof answer === 'number' ? { status: answer, type: 'text/plain' } : answer
    const ok = status >= 200 && status < 300
    // The body is the URL, so the decoder can tell which frame it was given.
    return new Response(ok ? new Blob([url]) : '', { status, headers: { 'content-type': type } })
  }

  const env = {
    fetch(url: string, init: RequestInit) {
      stats.activity++
      const attempt = (attempts.get(url) ?? 0) + 1
      attempts.set(url, attempt)
      const entry: FakeRequest = {
        url,
        index: Number(/frame-(\d+)\.webp$/.exec(url)?.[1]) - 1,
        attempt,
        init,
        aborted: false,
        settled: false,
        respond: () => {},
      }
      requests.push(entry)
      stats.inflight++
      stats.maxInflight = Math.max(stats.maxInflight, stats.inflight)

      return new Promise<Response>((resolve, reject) => {
        const settle = () => {
          entry.settled = true
          stats.inflight--
        }
        entry.respond = (answer) => {
          if (entry.settled) return
          settle()
          stats.activity++
          resolve(toResponse(answer, url))
        }
        init.signal?.addEventListener('abort', () => {
          entry.aborted = true
          if (entry.settled) return
          settle()
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
        const reply = plan(entry.index, attempt)
        if (reply !== 'hang') queueMicrotask(() => entry.respond(reply))
      })
    },

    async decode(blob: Blob) {
      stats.activity++
      const url = await blob.text()
      stats.created++
      stats.live++
      stats.maxLive = Math.max(stats.maxLive, stats.live)
      stats.activity++
      let closed = false
      return {
        width: 16,
        height: 9,
        url,
        close() {
          if (closed) return
          closed = true
          stats.live--
          stats.closed++
        },
      } as unknown as ImageBitmap
    },

    requestFrame(callback: () => void) {
      queued.push(callback)
      return queued.length
    },
    cancelFrame() {},
  }

  return {
    env,
    requests,
    stats,
    flushFrames() {
      const run = queued
      queued = []
      for (const callback of run) callback()
    },
    /** Waits until nothing has happened for a few timer ticks: every fetch, decode and retry timer has run its course. */
    async settle() {
      let last = -1
      let quiet = 0
      while (quiet < 4) {
        await sleep(3)
        if (stats.activity === last) quiet++
        else {
          quiet = 0
          last = stats.activity
        }
      }
    },
  }
}

const loaders: FrameLoader[] = []

function setup(
  source: Partial<ImageSequenceSource> = {},
  options: FrameLoaderOptions = {},
  plan?: (index: number, attempt: number) => Reply,
) {
  const harness = createHarness(plan)
  const loader = createFrameLoader({ frameCount: 20, baseUrl: '/seq', ...source }, { retryDelayMs: 1, ...options }, harness.env)
  loaders.push(loader)
  return { harness, loader }
}

afterEach(() => {
  // Clears retry timers and aborts anything still hanging.
  for (const loader of loaders.splice(0)) loader.stop()
  vi.restoreAllMocks()
})

describe('requests', () => {
  it('never has more downloads in flight than the concurrency limit', async () => {
    const { harness, loader } = setup({ frameCount: 50 }, { fetchConcurrency: 3 }, () => 'hang')
    loader.start()
    await harness.settle()
    expect(harness.requests).toHaveLength(3)

    for (let round = 0; round < 100; round++) {
      const open = harness.requests.filter((request) => !request.settled)
      if (open.length === 0) break
      expect(open.length).toBeLessThanOrEqual(3)
      open[0]?.respond('ok')
      await harness.settle()
    }

    expect(harness.stats.maxInflight).toBeLessThanOrEqual(3)
    expect(harness.requests).toHaveLength(50)
    expect(new Set(harness.requests.map((request) => request.url)).size).toBe(50)
    expect(loader.getState().loaded).toBe(50)
  })

  it('asks for the frames nearest the playhead first, preferring the direction of travel', async () => {
    const { harness, loader } = setup({ frameCount: 100 }, { fetchConcurrency: 4, initialFrame: 50 }, () => 'hang')
    loader.start()
    await harness.settle()
    // Ahead costs its distance and behind costs 2.5 times that, so 52 (2) comes before 49 (2.5) and 53 (3).
    expect(harness.requests.map((request) => request.index).sort((a, b) => a - b)).toEqual([49, 50, 51, 52])
  })

  it('marks near frames high priority, far ones low, and asks for an image', async () => {
    const { harness, loader } = setup({ frameCount: 100 }, { initialFrame: 50 })
    loader.start()
    await harness.settle()
    const near = harness.requests.find((request) => request.index === 50)
    const far = harness.requests.find((request) => request.index === 99)
    expect(near?.init.priority).toBe('high')
    expect(far?.init.priority).toBe('low')
    expect(near?.init.headers).toEqual({ Accept: 'image/*' })
  })

  it('drops requests for the old neighborhood on a jump and fetches the new one', async () => {
    const { harness, loader } = setup({ frameCount: 200 }, { fetchConcurrency: 2 }, () => 'hang')
    loader.start()
    await harness.settle()
    expect(harness.requests.map((request) => request.index)).toEqual([0, 1])

    loader.focus(150)
    expect(harness.requests.filter((request) => request.aborted).map((request) => request.index)).toEqual([0, 1])
    const fresh = harness.requests.filter((request) => !request.aborted)
    expect(fresh.map((request) => request.index).sort((a, b) => a - b)).toEqual([150, 151])
  })

  it('requests only the window around the playhead in focus mode, and the rest once switched to all', async () => {
    const { harness, loader } = setup({ frameCount: 100 }, { preload: 'focus' })
    loader.start()
    await harness.settle()
    expect(harness.requests).toHaveLength(16)
    expect(loader.getState().status).toBe('ready')

    loader.setPreload('all')
    await harness.settle()
    expect(harness.requests).toHaveLength(100)
    expect(loader.getState().status).toBe('complete')
  })
})

describe('failures', () => {
  it('treats a missing frame as final: no retry, and the rest still load', async () => {
    const { harness, loader } = setup({ frameCount: 10 }, {}, (index) => (index === 5 ? 404 : 'ok'))
    loader.start()
    await harness.settle()
    expect(harness.requests.filter((request) => request.index === 5)).toHaveLength(1)
    expect(loader.getState()).toMatchObject({ loaded: 9, failed: 1, progress: 1, status: 'complete', error: null })
  })

  it('rejects a 200 that is not an image, which is what a dev server answers for an unknown path', async () => {
    const { harness, loader } = setup({ frameCount: 5 }, {}, (index) => (index === 2 ? { status: 200, type: 'text/html' } : 'ok'))
    loader.start()
    await harness.settle()
    expect(harness.requests.filter((request) => request.index === 2)).toHaveLength(1)
    expect(loader.getState()).toMatchObject({ loaded: 4, failed: 1 })
  })

  it('retries a server error with backoff, then gives up on that frame', async () => {
    const { harness, loader } = setup({ frameCount: 5 }, { retries: 2 }, (index) => (index === 3 ? 503 : 'ok'))
    loader.start()
    await vi.waitFor(() => expect(loader.getState().failed).toBe(1))
    expect(harness.requests.filter((request) => request.index === 3).map((request) => request.attempt)).toEqual([1, 2, 3])
    expect(loader.getState()).toMatchObject({ loaded: 4, failed: 1 })
  })

  it('recovers when a retry succeeds', async () => {
    const { harness, loader } = setup({ frameCount: 5 }, {}, (index, attempt) => (index === 2 && attempt === 1 ? 503 : 'ok'))
    loader.start()
    await vi.waitFor(() => expect(loader.getState().loaded).toBe(5))
    expect(harness.requests.filter((request) => request.index === 2)).toHaveLength(2)
    expect(loader.getState().failed).toBe(0)
  })

  it('stops asking once it is clear the assets are not there', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { harness, loader } = setup({ frameCount: 100 }, { fetchConcurrency: 4 }, () => 404)
    loader.start()
    await harness.settle()

    const state = loader.getState()
    expect(state.status).toBe('error')
    expect(state.error).toMatch(/frame-\d{4}\.webp: HTTP 404/)
    expect(loader.getFrame(0)).toBeNull()

    const requested = harness.requests.length
    expect(requested).toBeLessThanOrEqual(12 + 4)
    await harness.settle()
    expect(harness.requests).toHaveLength(requested)
    expect(error).toHaveBeenCalledTimes(1)
  })

  it('does not give up while any frame has loaded, however many others are missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { loader, harness } = setup({ frameCount: 60 }, { initialFrame: 0 }, (index) => (index === 0 ? 'ok' : 404))
    loader.start()
    await harness.settle()
    expect(loader.getState()).toMatchObject({ loaded: 1, failed: 59, status: 'complete' })
  })
})

describe('timeouts', () => {
  it('aborts a request that never answers and retries it', async () => {
    const { harness, loader } = setup(
      { frameCount: 3 },
      { requestTimeoutMs: 30, retries: 1 },
      (index, attempt) => (index === 0 && attempt === 1 ? 'hang' : 'ok'),
    )
    loader.start()
    await sleep(80)
    await harness.settle()

    const attempts = harness.requests.filter((request) => request.index === 0)
    expect(attempts.map((request) => request.aborted)).toEqual([true, false])
    expect(loader.getState()).toMatchObject({ loaded: 3, failed: 0, status: 'complete' })
  })

  it('gives up on a frame that times out on every attempt, and says why', async () => {
    const { harness, loader } = setup({ frameCount: 2 }, { requestTimeoutMs: 20, retries: 0 }, () => 'hang')
    loader.start()
    await sleep(70)
    await harness.settle()

    expect(loader.getState()).toMatchObject({ failed: 2, status: 'error' })
    expect(loader.getState().error).toContain('timed out after 20 ms')
  })

  it('frees the download slot, so one hung request cannot stall the rest', async () => {
    const { harness, loader } = setup(
      { frameCount: 6 },
      { requestTimeoutMs: 30, retries: 0, fetchConcurrency: 1 },
      (index) => (index === 0 ? 'hang' : 'ok'),
    )
    loader.start()
    await sleep(80)
    await harness.settle()
    expect(loader.getState()).toMatchObject({ loaded: 5, failed: 1, status: 'complete' })
  })

  it('leaves a request alone that answers in time, and every request alone when switched off', async () => {
    const fast = setup({ frameCount: 3 }, { requestTimeoutMs: 30 })
    fast.loader.start()
    await sleep(80)
    expect(fast.harness.requests.some((request) => request.aborted)).toBe(false)
    expect(fast.loader.getState().loaded).toBe(3)

    const off = setup({ frameCount: 2 }, { requestTimeoutMs: 0 }, () => 'hang')
    off.loader.start()
    await sleep(80)
    expect(off.harness.requests.some((request) => request.aborted)).toBe(false)
  })
})

describe('decoded frames', () => {
  it('holds no more decoded bitmaps than the budget, and closes the ones it drops', async () => {
    const { harness, loader } = setup({ frameCount: 60 }, { maxDecodedFrames: 5 })
    loader.start()
    await harness.settle()
    expect(loader.getState()).toMatchObject({ loaded: 60, decoded: 5 })

    loader.focus(40)
    await harness.settle()
    expect(harness.stats.maxLive).toBeLessThanOrEqual(5)
    expect(harness.stats.live).toBe(5)
    expect(harness.stats.closed).toBe(harness.stats.created - 5)
    expect(loader.getState().decoded).toBe(5)
    expect(loader.getFrame(40)?.index).toBe(40)
    // The window follows the playhead: the frames just ahead of it, and one behind.
    for (const index of [39, 41, 42, 43]) expect(loader.getFrame(index)?.index).toBe(index)
  })

  it('serves the nearest decoded frame while the exact one is missing, preferring the side the playhead came from', async () => {
    const { harness, loader } = setup({ frameCount: 30 }, { initialFrame: 12 }, (index) => (index === 10 || index === 14 ? 'ok' : 404))
    loader.start()
    await harness.settle()
    expect(loader.getState().decoded).toBe(2)

    // 10 and 14 are both two away from 12; the loader was heading forward from 12, so it favors the one behind.
    expect(loader.getFrame(12)?.index).toBe(10)
    expect(loader.getFrame(13)?.index).toBe(14)
    expect(loader.getFrame(0)?.index).toBe(10)
    expect(loader.getFrame(29)?.index).toBe(14)
  })

  it('announces each decoded frame as it lands', async () => {
    const { harness, loader } = setup({ frameCount: 6 })
    const decoded: number[] = []
    loader.subscribeFrames((index) => decoded.push(index))
    loader.start()
    await harness.settle()
    expect(decoded.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5])
  })
})

describe('lifecycle', () => {
  it('requests each frame once when started, stopped and started again in one tick, as StrictMode does', async () => {
    const { harness, loader } = setup({ frameCount: 10 })
    loader.start()
    loader.stop()
    loader.start()
    await harness.settle()
    expect(harness.requests).toHaveLength(10)
  })

  it('aborts requests and closes every bitmap on stop, and resumes from what it already downloaded', async () => {
    const { harness, loader } = setup({ frameCount: 30 }, { fetchConcurrency: 4 }, (index) => (index < 3 ? 'ok' : 'hang'))
    loader.start()
    await harness.settle()
    expect(loader.getState().decoded).toBe(3)
    const open = harness.requests.filter((request) => !request.settled)
    expect(open.length).toBeGreaterThan(0)

    loader.stop()
    expect(open.every((request) => request.aborted)).toBe(true)
    expect(harness.stats.live).toBe(0)
    expect(loader.getState()).toMatchObject({ status: 'idle', decoded: 0 })
    expect(loader.getFrame(0)).toBeNull()

    const before = harness.requests.length
    loader.start()
    await harness.settle()
    // The three downloaded frames come back from memory; only the ones that never finished are asked for again.
    expect(harness.requests.slice(before).some((request) => request.index < 3)).toBe(false)
    expect(loader.getFrame(0)?.index).toBe(0)
  })

  it('closes a bitmap that finishes decoding after stop', async () => {
    const harness = createHarness()
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const slowDecode: typeof harness.env.decode = async (blob) => {
      await gate
      return harness.env.decode(blob)
    }
    const loader = createFrameLoader({ frameCount: 3, baseUrl: '/seq' }, {}, { ...harness.env, decode: slowDecode })
    loaders.push(loader)
    loader.start()
    await vi.waitFor(() => expect(loader.getState().loaded).toBe(3))

    loader.stop()
    release()
    await harness.settle()
    expect(harness.stats.created).toBeGreaterThan(0)
    expect(harness.stats.live).toBe(0)
    expect(loader.getFrame(0)).toBeNull()
  })
})

describe('state', () => {
  it('counts real progress: downloaded plus failed over total', async () => {
    const { harness, loader } = setup({ frameCount: 4 }, { fetchConcurrency: 4 }, () => 'hang')
    loader.start()
    await harness.settle()
    expect(loader.getState()).toMatchObject({ total: 4, loaded: 0, failed: 0, progress: 0, status: 'loading' })

    harness.requests[0]?.respond('ok')
    harness.requests[1]?.respond(404)
    await harness.settle()
    expect(loader.getState()).toMatchObject({ loaded: 1, failed: 1, progress: 0.5 })
  })

  it('counts the opening scene on its own: the frames nearest the start, failed ones included', async () => {
    const { harness, loader } = setup({ frameCount: 100 }, { criticalFrames: 4, fetchConcurrency: 4 }, () => 'hang')
    expect(loader.getState()).toMatchObject({ criticalTotal: 4, criticalSettled: 0 })
    loader.start()
    await harness.settle()

    harness.requests.find((request) => request.index === 0)?.respond('ok')
    harness.requests.find((request) => request.index === 1)?.respond(404)
    await harness.settle()
    expect(loader.getState()).toMatchObject({ criticalTotal: 4, criticalSettled: 2, criticalLoaded: 1 })

    // Frame 4 is next in line but not part of the opening.
    harness.requests.find((request) => request.index === 4)?.respond('ok')
    await harness.settle()
    expect(loader.getState()).toMatchObject({ criticalSettled: 2, loaded: 2 })

    // The set stays the opening after the playhead moves away.
    loader.focus(60)
    expect(loader.getState().criticalTotal).toBe(4)
  })

  it('caps the opening scene at the decode window, and has none unless asked for', () => {
    expect(setup({ frameCount: 100 }, { criticalFrames: 50, maxDecodedFrames: 5 }).loader.getState().criticalTotal).toBe(5)
    expect(setup({ frameCount: 100 }).loader.getState().criticalTotal).toBe(0)
    expect(setup({ frameCount: 3 }, { criticalFrames: 12 }).loader.getState().criticalTotal).toBe(3)
  })

  it('can always settle the opening scene in focus mode, starting at the last frame', async () => {
    // The last frame plus the ones behind it that cost under 16 (2.5 per frame): 1 + 6.
    const { harness, loader } = setup({ frameCount: 100 }, { criticalFrames: 16, initialFrame: 99, preload: 'focus' })
    expect(loader.getState().criticalTotal).toBe(7)
    loader.start()
    await harness.settle()
    expect(loader.getState()).toMatchObject({ criticalTotal: 7, criticalSettled: 7, status: 'ready' })
  })

  it('tells subscribers at most once per animation frame, and hands out one snapshot until something changes', async () => {
    const { harness, loader } = setup({ frameCount: 10 })
    const listener = vi.fn()
    loader.subscribeState(listener)
    loader.start()
    await harness.settle()

    expect(listener).not.toHaveBeenCalled()
    harness.flushFrames()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(loader.getState().loaded).toBe(10)
    expect(loader.getState()).toBe(loader.getState())
  })

  it('reports the natural size of the frames once the first one is decoded', async () => {
    const { harness, loader } = setup({ frameCount: 3 })
    expect(loader.getState().frameSize).toBeNull()
    loader.start()
    await harness.settle()
    expect(loader.getState().frameSize).toEqual({ width: 16, height: 9 })
  })
})
