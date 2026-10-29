import type {
  FrameLoader,
  FrameLoaderOptions,
  FrameSize,
  ImageSequenceSource,
  PreloadMode,
  SequenceFrame,
  SequenceState,
  SequenceStatus,
} from '../imageSequence.types'
import { buildFrameUrl, clampFrameIndex, frameCost, resolveSource } from './sequenceMath'

/** Permanent failures, with nothing loaded yet, after which the loader gives up. A shorter hole never trips it. */
const GIVE_UP_AFTER = 12

/**
 * The browser APIs the loader touches, so tests can drive the scheduler with
 * fakes. `requestFrame` must return a non-zero id.
 */
export interface LoaderEnvironment {
  fetch: (url: string, init: RequestInit) => Promise<Response>
  decode: (blob: Blob) => Promise<ImageBitmap>
  requestFrame: (callback: () => void) => number
  cancelFrame: (id: number) => void
}

const browserEnvironment: LoaderEnvironment = {
  fetch: (url, init) => fetch(url, init),
  decode: (blob) => createImageBitmap(blob),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (id) => cancelAnimationFrame(id),
}

/** A failed attempt, tagged with whether trying again could help. */
class FrameError extends Error {
  readonly permanent: boolean

  constructor(message: string, permanent: boolean) {
    super(message)
    this.permanent = permanent
  }
}

const isTransientStatus = (status: number) => status === 408 || status === 429 || status >= 500

type FetchState = 'idle' | 'inflight' | 'backoff' | 'done' | 'failed'
type DecodeState = 'idle' | 'inflight' | 'done' | 'failed'

/** Everything the loader knows about one frame. */
interface Slot {
  index: number
  url: string
  fetchState: FetchState
  decodeState: DecodeState
  /** Transient failures so far. Past `retries`, the next one is final. */
  failures: number
  /** The encoded file, kept for every downloaded frame so an evicted bitmap can be decoded again without the network. */
  blob: Blob | null
  bitmap: ImageBitmap | null
  controller: AbortController | null
  /** Bumped whenever an attempt is superseded, so a late result from the old one is ignored. */
  fetchTicket: number
  decodeTicket: number
  retryTimer: ReturnType<typeof setTimeout> | undefined
}

function intOption(value: number | undefined, fallback: number, min: number): number {
  return value !== undefined && Number.isFinite(value) ? Math.max(min, Math.floor(value)) : fallback
}

/**
 * Downloads one frame. The `Accept` header matters in development: Vite answers
 * an unknown path with `index.html` and a 200 unless the request cannot accept
 * HTML, and the content-type check catches any host that does the same.
 */
async function download(
  env: LoaderEnvironment,
  url: string,
  signal: AbortSignal,
  priority: RequestPriority,
): Promise<Blob> {
  const response = await env.fetch(url, { signal, priority, headers: { Accept: 'image/*' } })
  if (!response.ok) throw new FrameError(`HTTP ${response.status}`, !isTransientStatus(response.status))
  const type = response.headers.get('content-type') ?? ''
  if (type !== '' && !/^image\/|^application\/octet-stream/i.test(type)) {
    throw new FrameError(`not an image (${type})`, true)
  }
  const blob = await response.blob()
  if (blob.size === 0) throw new FrameError('empty response', true)
  return blob
}

/**
 * Creates the engine behind `useImageSequence`: it downloads frames nearest the
 * playhead first, keeps every downloaded file, and holds only a window of
 * decoded bitmaps, because a decoded 1080p frame is about 8 MB and 240 of them
 * would not fit on a phone.
 *
 * One cost function (`frameCost`) orders downloads, decodes and evictions:
 * frames ahead of the playhead in its direction of travel are cheap, frames
 * behind it are dear. Eviction therefore converges on the N cheapest frames and
 * cannot thrash, and a jump needs no special casing beyond aborting requests
 * that are now far away.
 *
 * Creating a loader has no side effects. Nothing is requested until `start`,
 * which defers its first request by a microtask so React StrictMode's
 * mount, unmount, mount sequence requests each frame once.
 */
export function createFrameLoader(
  sourceInput: ImageSequenceSource,
  options: FrameLoaderOptions = {},
  environment: Partial<LoaderEnvironment> = {},
): FrameLoader {
  const env: LoaderEnvironment = {
    fetch: environment.fetch ?? browserEnvironment.fetch,
    decode: environment.decode ?? browserEnvironment.decode,
    requestFrame: environment.requestFrame ?? browserEnvironment.requestFrame,
    cancelFrame: environment.cancelFrame ?? browserEnvironment.cancelFrame,
  }
  const source = resolveSource(sourceInput)
  const total = source.frameCount
  const fetchConcurrency = intOption(options.fetchConcurrency, 4, 1)
  const decodeConcurrency = intOption(options.decodeConcurrency, 2, 1)
  const maxDecoded = intOption(options.maxDecodedFrames, 16, 3)
  const retries = intOption(options.retries, 2, 0)
  const retryDelayMs = options.retryDelayMs !== undefined && options.retryDelayMs >= 0 ? options.retryDelayMs : 250

  const slots = Array.from(
    { length: total },
    (_, index): Slot => ({
      index,
      url: buildFrameUrl(source, index),
      fetchState: 'idle',
      decodeState: 'idle',
      failures: 0,
      blob: null,
      bitmap: null,
      controller: null,
      fetchTicket: 0,
      decodeTicket: 0,
      retryTimer: undefined,
    }),
  )

  let running = false
  let preload: PreloadMode = options.preload ?? 'all'
  let playhead = clampFrameIndex(options.initialFrame ?? 0, total)
  let direction: 1 | -1 = 1
  // The frame most recently handed out. Eviction never touches it, so the picture on screen stays reproducible.
  let lastServed = -1
  let fetching = 0
  let decoding = 0
  // Decoded bitmaps currently held.
  let live = 0
  let loaded = 0
  let failed = 0
  let frameSize: FrameSize | null = null
  let firstFailure: string | null = null
  let giveUpReason: string | null = null

  const frameListeners = new Set<(index: number) => void>()
  const stateListeners = new Set<() => void>()
  // Null means stale: rebuilt on the next read. Handing out the same object until something changes is what
  // `useSyncExternalStore` requires.
  let snapshot: SequenceState | null = null
  let notifyId: number | null = null

  /** Frames within this many cost units of the playhead are the ones worth having decoded. */
  const windowSize = maxDecoded
  const cost = (index: number) => frameCost(index, playhead, direction)

  function buildState(): SequenceState {
    const settled = loaded + failed
    let status: SequenceStatus
    if (giveUpReason !== null) status = 'error'
    else if (!running) status = 'idle'
    else if (preload === 'all' && settled === total) status = 'complete'
    else if (live > 0) status = 'ready'
    else status = 'loading'
    return { status, total, loaded, failed, decoded: live, progress: settled / total, frameSize, error: giveUpReason }
  }

  function getState(): SequenceState {
    snapshot ??= buildState()
    return snapshot
  }

  /** Invalidates the snapshot and tells subscribers, at most once per animation frame. */
  function markDirty(): void {
    snapshot = null
    if (notifyId !== null || stateListeners.size === 0) return
    notifyId = env.requestFrame(() => {
      notifyId = null
      for (const listener of stateListeners) listener()
    })
  }

  function pickFetch(): Slot | null {
    let best: Slot | null = null
    let bestCost = Number.POSITIVE_INFINITY
    for (const slot of slots) {
      if (slot.fetchState !== 'idle') continue
      const slotCost = cost(slot.index)
      // Focus mode skips the long tail entirely.
      if (preload === 'focus' && slotCost >= windowSize) continue
      if (slotCost < bestCost) {
        best = slot
        bestCost = slotCost
      }
    }
    return best
  }

  function pickDecode(): Slot | null {
    let best: Slot | null = null
    let bestCost = Number.POSITIVE_INFINITY
    for (const slot of slots) {
      if (slot.fetchState !== 'done' || slot.decodeState !== 'idle') continue
      const slotCost = cost(slot.index)
      if (slotCost < bestCost) {
        best = slot
        bestCost = slotCost
      }
    }
    return best
  }

  function pickVictim(): Slot | null {
    let worst: Slot | null = null
    let worstCost = -1
    for (const slot of slots) {
      if (slot.decodeState !== 'done' || slot.index === lastServed) continue
      const slotCost = cost(slot.index)
      if (slotCost > worstCost) {
        worst = slot
        worstCost = slotCost
      }
    }
    return worst
  }

  /** Fills the download and decode lanes. Called after anything that could have freed a slot or changed the order. */
  function pump(): void {
    if (!running || giveUpReason !== null) return

    while (fetching < fetchConcurrency) {
      const slot = pickFetch()
      if (!slot) break
      startFetch(slot)
    }

    while (decoding < decodeConcurrency) {
      const slot = pickDecode()
      if (!slot) break
      // The budget counts decodes in flight: otherwise a burst of late arrivals would overshoot it.
      if (live + decoding >= maxDecoded) {
        const victim = pickVictim()
        // Evict only for a frame that matters more; equal cost never swaps, which is what stops thrashing.
        if (!victim || cost(victim.index) <= cost(slot.index)) break
        evict(victim)
      }
      startDecode(slot)
    }
  }

  function startFetch(slot: Slot): void {
    const ticket = ++slot.fetchTicket
    const controller = new AbortController()
    slot.controller = controller
    slot.fetchState = 'inflight'
    fetching++
    const priority = cost(slot.index) < windowSize ? 'high' : 'low'

    download(env, slot.url, controller.signal, priority).then(
      (blob) => {
        if (ticket !== slot.fetchTicket) return
        fetching--
        slot.controller = null
        slot.blob = blob
        slot.fetchState = 'done'
        loaded++
        markDirty()
        pump()
      },
      (error: unknown) => {
        if (ticket !== slot.fetchTicket) return
        fetching--
        slot.controller = null
        fetchFailed(slot, error)
      },
    )
  }

  function fetchFailed(slot: Slot, error: unknown): void {
    const permanent = error instanceof FrameError && error.permanent
    if (!permanent && slot.failures < retries) {
      slot.failures++
      slot.fetchState = 'backoff'
      slot.retryTimer = setTimeout(
        () => {
          slot.retryTimer = undefined
          if (slot.fetchState !== 'backoff') return
          slot.fetchState = 'idle'
          pump()
        },
        retryDelayMs * 2 ** (slot.failures - 1),
      )
      // The slot is free for another frame while this one waits.
      pump()
      return
    }
    markFailed(slot, error instanceof Error ? error.message : String(error))
  }

  /** Gives up on a frame for good. The picture draws the nearest decoded neighbor instead. */
  function markFailed(slot: Slot, reason: string): void {
    // A decode failure arrives after the download was counted as loaded.
    if (slot.fetchState === 'done') loaded--
    slot.fetchState = 'failed'
    slot.blob = null
    failed++
    firstFailure ??= `${slot.url}: ${reason}`
    // With nothing loaded, a dozen permanent failures mean the assets are not there, so stop asking.
    if (loaded === 0 && failed >= Math.min(GIVE_UP_AFTER, total)) {
      giveUp()
      return
    }
    markDirty()
    pump()
  }

  function giveUp(): void {
    giveUpReason = `No frames could be loaded (first failure: ${firstFailure})`
    console.error(`[image-sequence] ${giveUpReason}`)
    for (const slot of slots) abortFetch(slot)
    markDirty()
  }

  /** Cancels a download or a pending retry and puts the frame back in the queue. */
  function abortFetch(slot: Slot): void {
    if (slot.fetchState === 'inflight') {
      slot.controller?.abort()
      slot.controller = null
      slot.fetchTicket++
      slot.fetchState = 'idle'
      fetching--
    } else if (slot.fetchState === 'backoff') {
      clearTimeout(slot.retryTimer)
      slot.retryTimer = undefined
      slot.fetchState = 'idle'
    }
  }

  function startDecode(slot: Slot): void {
    const blob = slot.blob
    if (!blob) return
    const ticket = ++slot.decodeTicket
    slot.decodeState = 'inflight'
    decoding++

    env.decode(blob).then(
      (bitmap) => {
        // Superseded by `stop`: nobody wants this bitmap, and an unclosed one would hold its memory until garbage collection.
        if (ticket !== slot.decodeTicket) {
          bitmap.close()
          return
        }
        decoding--
        slot.bitmap = bitmap
        slot.decodeState = 'done'
        live++
        frameSize ??= { width: bitmap.width, height: bitmap.height }
        markDirty()
        // Refill the lanes before notifying, so a throwing listener cannot stall loading.
        pump()
        for (const listener of frameListeners) listener(slot.index)
      },
      (error: unknown) => {
        if (ticket !== slot.decodeTicket) return
        decoding--
        slot.decodeState = 'failed'
        markFailed(slot, `could not be decoded${error instanceof Error ? ` (${error.message})` : ''}`)
      },
    )
  }

  function evict(slot: Slot): void {
    slot.bitmap?.close()
    slot.bitmap = null
    slot.decodeState = 'idle'
    live--
    markDirty()
  }

  function focus(index: number): void {
    const next = clampFrameIndex(index, total)
    if (next === playhead) return
    const delta = next - playhead
    direction = delta > 0 ? 1 : -1
    playhead = next
    if (Math.abs(delta) > windowSize) {
      // A jump. Downloads for the old neighborhood would hold every slot while the new one waits a full round trip.
      for (const slot of slots) {
        if (slot.fetchState === 'inflight' && cost(slot.index) > 2 * windowSize) abortFetch(slot)
      }
    }
    pump()
  }

  function getFrame(index: number): SequenceFrame | null {
    const wanted = clampFrameIndex(index, total)
    const exact = slots[wanted]?.bitmap
    if (exact) {
      lastServed = wanted
      return { index: wanted, bitmap: exact }
    }
    if (live === 0) return null

    // The nearest decoded frame. At equal distance, the one the playhead came from wins.
    const behind = -direction
    for (let distance = 1; wanted - distance >= 0 || wanted + distance < total; distance++) {
      const lag = slots[wanted + behind * distance]
      if (lag?.bitmap) {
        lastServed = lag.index
        return { index: lag.index, bitmap: lag.bitmap }
      }
      const lead = slots[wanted - behind * distance]
      if (lead?.bitmap) {
        lastServed = lead.index
        return { index: lead.index, bitmap: lead.bitmap }
      }
    }
    return null
  }

  function start(): void {
    if (running) return
    running = true
    markDirty()
    queueMicrotask(pump)
  }

  function stop(): void {
    if (!running) return
    running = false
    for (const slot of slots) {
      abortFetch(slot)
      // Any decode still in flight is now stale; it closes its own bitmap when it lands.
      slot.decodeTicket++
      if (slot.decodeState === 'inflight') slot.decodeState = 'idle'
      if (slot.bitmap) {
        slot.bitmap.close()
        slot.bitmap = null
        slot.decodeState = 'idle'
      }
    }
    fetching = 0
    decoding = 0
    live = 0
    lastServed = -1
    markDirty()
  }

  function setPreload(mode: PreloadMode): void {
    if (mode === preload) return
    preload = mode
    markDirty()
    pump()
  }

  return {
    frameCount: total,
    focus,
    getFrame,
    subscribeFrames: (listener) => {
      frameListeners.add(listener)
      return () => {
        frameListeners.delete(listener)
      }
    },
    getState,
    subscribeState: (listener) => {
      stateListeners.add(listener)
      return () => {
        stateListeners.delete(listener)
      }
    },
    start,
    stop,
    setPreload,
  }
}
