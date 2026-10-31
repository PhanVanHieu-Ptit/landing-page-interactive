/*
 * Opt-in page measurements, for lab work: open the page with `?perf` and read
 * `window.__perf.report()`. Nothing here runs for a normal visit; `main.tsx`
 * imports this module only when the query parameter is present, so it is a
 * separate chunk that ordinary visitors never download. The observers ask for
 * buffered entries, so loading the chunk after the first paint loses nothing.
 *
 * It uses the browser's own APIs and nothing else. It reports what it saw, not
 * a verdict: LCP, CLS (with the elements that moved), INP, long tasks and
 * animation frames, and the frame times of a scroll. Lab numbers like these are
 * not field data, and INP here only counts the interactions the session made.
 *
 * It adds nothing to the page's own scroll or animation loops. The scroll
 * sampler runs its own animation-frame loop, and only while the page is
 * scrolling.
 */

/** The entry types are newer than the DOM typings, so only the fields read here are described. */
interface LargestContentfulPaintEntry extends PerformanceEntry {
  size: number
  url: string
  element: Element | null
}

interface LayoutShiftSource {
  node: Node | null
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number
  hadRecentInput: boolean
  sources: LayoutShiftSource[]
}

interface EventTimingEntry extends PerformanceEntry {
  interactionId?: number
}

interface AnimationFrameEntry extends PerformanceEntry {
  blockingDuration: number
}

export interface ScrollFrameStats {
  /** Animation frames seen while the page was scrolling. */
  frames: number
  p50: number
  p95: number
  max: number
  /** Frames that took longer than 20 ms (a missed 60 Hz deadline plus slack). */
  over20: number
  /** Frames that took longer than 33 ms (a missed 30 Hz deadline). */
  over33: number
}

export interface PerfReport {
  url: string
  /** Milliseconds from navigation start. */
  ttfb: number | null
  fcp: number | null
  lcp: { time: number; size: number; element: string } | null
  cls: {
    /** Worst session window: what the metric reports. */
    value: number
    /** Every shift without recent input, summed. */
    total: number
    shifts: { time: number; value: number; nodes: string[] }[]
  }
  /** Slowest interaction (the 98th percentile once there are more than 50), in milliseconds. */
  inp: number | null
  interactions: number
  longTasks: { count: number; totalBlocking: number; max: number }
  longAnimationFrames: { count: number; max: number; maxBlocking: number } | null
  scroll: ScrollFrameStats | null
}

export interface PerfHandle {
  report: () => PerfReport
  /** Forgets the scroll samples, to measure one pass on its own. */
  resetScroll: () => void
}

declare global {
  interface Window {
    __perf?: PerfHandle
  }
}

/** A short, stable name for an element: `tag#id.class.class`. */
function describe(node: Node | null | undefined): string {
  if (!(node instanceof Element)) return node ? node.nodeName : '(removed)'
  const id = node.id ? `#${node.id}` : ''
  const classes = [...node.classList]
    .slice(0, 2)
    .map((name) => `.${name}`)
    .join('')
  return `${node.tagName.toLowerCase()}${id}${classes}`
}

/** `durationThreshold` (Event Timing) is newer than the DOM typings. */
type ObserveOptions = PerformanceObserverInit & { durationThreshold?: number }

function observe(type: string, callback: (entries: PerformanceEntry[]) => void, extra: ObserveOptions = {}): void {
  try {
    const observer = new PerformanceObserver((list) => callback(list.getEntries()))
    observer.observe({ type, buffered: true, ...extra })
  } catch {
    // The browser does not know this entry type; the report leaves that metric empty.
  }
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))
  return sorted[index] ?? 0
}

export function startVitals(): PerfHandle {
  let fcp: number | null = null
  let lcp: PerfReport['lcp'] = null
  const shifts: PerfReport['cls']['shifts'] = []
  let clsTotal = 0
  // Layout shifts are scored in session windows: a window ends after a 1 s gap or 5 s, and the worst one counts.
  let windowValue = 0
  let windowStart = 0
  let windowLast = 0
  let clsWorst = 0
  const interactionDurations = new Map<number, number>()
  const longTasks = { count: 0, totalBlocking: 0, max: 0 }
  const frames = { count: 0, max: 0, maxBlocking: 0 }
  // Not every browser has Long Animation Frames; the report says so with null instead of a misleading zero.
  const framesSupported = PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame') ?? false

  observe('paint', (entries) => {
    for (const entry of entries) if (entry.name === 'first-contentful-paint') fcp = entry.startTime
  })

  observe('largest-contentful-paint', (entries) => {
    const last = entries[entries.length - 1] as LargestContentfulPaintEntry | undefined
    if (last) lcp = { time: last.startTime, size: last.size, element: last.element ? describe(last.element) : (last.url || '(removed)') }
  })

  observe('layout-shift', (entries) => {
    for (const raw of entries) {
      const entry = raw as LayoutShiftEntry
      if (entry.hadRecentInput) continue
      clsTotal += entry.value
      if (entry.startTime - windowLast > 1000 || entry.startTime - windowStart > 5000) {
        windowValue = 0
        windowStart = entry.startTime
      }
      windowLast = entry.startTime
      windowValue += entry.value
      clsWorst = Math.max(clsWorst, windowValue)
      shifts.push({ time: entry.startTime, value: entry.value, nodes: entry.sources.map((source) => describe(source.node)) })
    }
  })

  // `interactionId` groups the events of one tap, click or key press; its duration is the slowest of them.
  observe(
    'event',
    (entries) => {
      for (const raw of entries) {
        const entry = raw as EventTimingEntry
        if (!entry.interactionId) continue
        interactionDurations.set(entry.interactionId, Math.max(interactionDurations.get(entry.interactionId) ?? 0, entry.duration))
      }
    },
    { durationThreshold: 16 },
  )

  observe('longtask', (entries) => {
    for (const entry of entries) {
      longTasks.count++
      longTasks.totalBlocking += Math.max(0, entry.duration - 50)
      longTasks.max = Math.max(longTasks.max, entry.duration)
    }
  })

  observe('long-animation-frame', (entries) => {
    for (const raw of entries) {
      const entry = raw as AnimationFrameEntry
      frames.count++
      frames.max = Math.max(frames.max, entry.duration)
      frames.maxBlocking = Math.max(frames.maxBlocking, entry.blockingDuration)
    }
  })

  // The scroll sampler: a frame loop that runs from the first scroll event until the page has been still for 150 ms.
  let deltas: number[] = []
  let loopId = 0
  let lastFrameTime = 0
  let lastScrollEvent = 0

  const sample = (now: number) => {
    if (lastFrameTime !== 0) deltas.push(now - lastFrameTime)
    lastFrameTime = now
    if (now - lastScrollEvent < 150) {
      loopId = requestAnimationFrame(sample)
    } else {
      loopId = 0
      lastFrameTime = 0
    }
  }

  window.addEventListener(
    'scroll',
    () => {
      lastScrollEvent = performance.now()
      if (loopId === 0) loopId = requestAnimationFrame(sample)
    },
    { passive: true },
  )

  const scrollStats = (): ScrollFrameStats | null => {
    if (deltas.length === 0) return null
    const sorted = [...deltas].sort((a, b) => a - b)
    return {
      frames: sorted.length,
      p50: percentile(sorted, 0.5),
      p95: percentile(sorted, 0.95),
      max: sorted[sorted.length - 1] ?? 0,
      over20: sorted.filter((delta) => delta > 20).length,
      over33: sorted.filter((delta) => delta > 33).length,
    }
  }

  const handle: PerfHandle = {
    report() {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      const durations = [...interactionDurations.values()].sort((a, b) => b - a)
      return {
        url: location.href,
        ttfb: navigation ? navigation.responseStart : null,
        fcp,
        lcp,
        cls: { value: clsWorst, total: clsTotal, shifts: [...shifts] },
        // The worst interaction, or the 98th percentile once there are enough of them (one is skipped for every 50).
        inp: durations.length === 0 ? null : (durations[Math.min(durations.length - 1, Math.floor(durations.length / 50))] ?? null),
        interactions: durations.length,
        longTasks: { ...longTasks },
        longAnimationFrames: framesSupported ? { count: frames.count, max: frames.max, maxBlocking: frames.maxBlocking } : null,
        scroll: scrollStats(),
      }
    },
    resetScroll() {
      deltas = []
    },
  }

  window.__perf = handle
  console.info('[perf] measuring. Call __perf.report() for the numbers and __perf.resetScroll() before a scroll pass.')
  return handle
}
