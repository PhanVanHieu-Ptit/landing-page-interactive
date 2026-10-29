/*
 * Public types of the image-sequence engine. This file has no imports, so the
 * React-free core and the React layer can both depend on it.
 */

/** How a frame fills its box, mirroring CSS `object-fit`. */
export type FitMode = 'cover' | 'contain'

/**
 * Where the frame sits when it overflows the box (`cover`) or leaves bars
 * (`contain`), mirroring CSS `object-position`: 0 is the start edge, 1 the end
 * edge and 0.5 the center.
 */
export interface FocalPoint {
  x: number
  y: number
}

/**
 * Where the frames live and how they are named. Frame `i` (zero-based) is
 * `{baseUrl}/{prefix}{number}.{extension}`, where `number` is
 * `firstFrameNumber + i * step` zero-padded to `digits`. With the defaults, a
 * 240-frame sequence is `frame-0001.webp` through `frame-0240.webp`.
 *
 * Numbering must be regular (every `step`th number), and every frame must share
 * one pixel size and be opaque: the renderer only clears the canvas when a
 * frame leaves bars.
 */
export interface ImageSequenceSource {
  /** Number of frames the sequence plays: with a `step` above 1, the files used, not the files present. */
  frameCount: number
  /** Directory URL holding the frames, with or without a trailing slash. */
  baseUrl: string
  /** Filename prefix. Defaults to `frame-`. */
  prefix?: string | undefined
  /** Width the frame number is zero-padded to. Defaults to 4, which is what ffmpeg's `%04d` writes. */
  digits?: number | undefined
  /** Number in the first frame's filename. Defaults to 1, which is where ffmpeg starts counting. */
  firstFrameNumber?: number | undefined
  /**
   * Distance between the numbers of consecutive frames. Defaults to 1 (every file). A step of 2 plays every
   * other file of a set, so a phone can use half the frames of the full-size set from the same directory:
   * half the downloads and half the encoded bytes, with `frameCount` halved to match. It does not shrink the
   * decoded size of a frame, which is the resolution's doing (see `core/tiers.ts`).
   */
  step?: number | undefined
  /** File extension without the dot. Defaults to `webp`. */
  extension?: string | undefined
}

/**
 * `ImageSequenceSource` with every default applied. Written out by hand
 * because `Required<>` would keep the `| undefined` under
 * `exactOptionalPropertyTypes`.
 */
export interface ResolvedImageSequenceSource {
  frameCount: number
  /** Without a trailing slash. */
  baseUrl: string
  prefix: string
  digits: number
  firstFrameNumber: number
  step: number
  extension: string
}

/**
 * Which frames the loader downloads: all of them, progressively and nearest
 * first, or only those around the playhead (used when motion is reduced, so a
 * single static frame never pays for 240 downloads).
 */
export type PreloadMode = 'all' | 'focus'

export interface FrameLoaderOptions {
  /** Maximum simultaneous frame downloads. Defaults to 4, leaving room under the six-per-origin HTTP/1.1 limit. */
  fetchConcurrency?: number | undefined
  /** Maximum simultaneous `createImageBitmap` calls. Defaults to 2. */
  decodeConcurrency?: number | undefined
  /**
   * Upper bound on decoded bitmaps held at once, counting decodes in flight.
   * Defaults to 16 and is never below 3. A decoded frame costs width × height
   * × 4 bytes, so this is what bounds memory.
   */
  maxDecodedFrames?: number | undefined
  /** How often a transient failure (network error, 408, 429, 5xx) is retried. Defaults to 2. */
  retries?: number | undefined
  /** Delay before the first retry, in milliseconds; it doubles after each one. Defaults to 250. */
  retryDelayMs?: number | undefined
  /** Frame requested first, until the renderer reports the real playhead. Defaults to 0. */
  initialFrame?: number | undefined
  /**
   * How many frames the opening scene needs: the ones nearest `initialFrame`, counted by `criticalTotal` and
   * `criticalSettled` in the state so a preloader can wait for them alone. Capped at `maxDecodedFrames`, which keeps
   * the set inside what every preload mode downloads. Defaults to 0 (no critical set).
   */
  criticalFrames?: number | undefined
  /**
   * A request still unfinished after this many milliseconds is aborted and handled like any transient failure
   * (retried, then given up on). Without it, a request that never answers holds a download slot forever.
   * Defaults to 15000; 0 disables it.
   */
  requestTimeoutMs?: number | undefined
  /** Defaults to `'all'`. */
  preload?: PreloadMode | undefined
}

/**
 * - `idle`: not started, or stopped.
 * - `loading`: running, with nothing drawable yet.
 * - `ready`: at least one frame is decoded and can be drawn; downloads continue.
 * - `complete`: every frame has either arrived or failed for good.
 * - `error`: no frame could be loaded at all, so requests have stopped.
 */
export type SequenceStatus = 'idle' | 'loading' | 'ready' | 'complete' | 'error'

export interface FrameSize {
  width: number
  height: number
}

/** An immutable snapshot of loading progress, safe to hand to `useSyncExternalStore`. */
export interface SequenceState {
  readonly status: SequenceStatus
  /** Number of frames in the sequence. */
  readonly total: number
  /** Frames downloaded and retained. */
  readonly loaded: number
  /** Frames that failed for good (missing, wrong type, undecodable, or out of retries). */
  readonly failed: number
  /** Frames currently held as decoded bitmaps. */
  readonly decoded: number
  /** `(loaded + failed) / total`: real progress, 1 once every frame has settled. */
  readonly progress: number
  /** Size of the critical set (see `FrameLoaderOptions.criticalFrames`). 0 when none was asked for. */
  readonly criticalTotal: number
  /** Critical frames that have been downloaded or failed for good. Failed ones count: nothing more will arrive for them. */
  readonly criticalSettled: number
  /** Critical frames that have been downloaded: what a progress readout should count, since a failed frame shows nothing. */
  readonly criticalLoaded: number
  /** Natural size of the frames, known once the first one is decoded. */
  readonly frameSize: FrameSize | null
  /** Human-readable reason, set only when `status` is `error`. */
  readonly error: string | null
}

/** A decoded frame. `index` can differ from the one asked for when only a neighbor is ready. */
export interface SequenceFrame {
  index: number
  bitmap: ImageBitmap
}

/**
 * The handle a renderer needs. It is stable for the lifetime of a loader and
 * none of its members cause React renders, so one handle can feed a canvas and
 * a preloader at once.
 */
export interface ImageSequence {
  readonly frameCount: number
  /**
   * Reports where the playhead is, which reorders downloads and decodes so
   * the frames nearest to it come first. Cheap; call it whenever the wanted
   * frame changes. Works before the loader has started.
   */
  focus: (index: number) => void
  /**
   * The decoded frame for `index`, or the nearest decoded one while it is
   * still arriving (preferring the side the playhead came from, so playback
   * never runs ahead and snaps back). Null when nothing is decoded yet.
   * The bitmap is only valid until the end of the current task: eviction may
   * close it, so never store it.
   */
  getFrame: (index: number) => SequenceFrame | null
  /** Called synchronously each time a frame finishes decoding, with that frame's index. */
  subscribeFrames: (listener: (index: number) => void) => () => void
  getState: () => SequenceState
  /** Called at most once per animation frame, and only after the state changed. */
  subscribeState: (listener: () => void) => () => void
}

/** An `ImageSequence` that can also be driven. Hooks hand out the narrower `ImageSequence`. */
export interface FrameLoader extends ImageSequence {
  /** Begins fetching. Idempotent, and can be called again after `stop`. */
  start: () => void
  /** Aborts requests and closes every bitmap but keeps downloaded data, so a restart resumes. */
  stop: () => void
  setPreload: (mode: PreloadMode) => void
}

/**
 * A normalized 0..1 value that changes over time, such as scroll position.
 * Listeners run at most once per frame, inside a `requestAnimationFrame`
 * callback and only when the value changed, which is why a renderer may draw
 * synchronously from one.
 */
export interface ProgressSource {
  get: () => number
  subscribe: (listener: (progress: number) => void) => () => void
}

/**
 * - `pinned`: for a tall track holding a sticky stage. 0 when the track's top
 *   reaches the viewport top, 1 when its bottom reaches the viewport bottom.
 * - `pass`: for an element that scrolls through. 0 as it enters at the bottom
 *   of the viewport, 1 as it leaves at the top.
 */
export type ProgressRange = 'pinned' | 'pass'

/** Where to find an element that may not exist yet. A React ref fits, and so does `{ current: element }`. */
export interface ElementTarget {
  readonly current: Element | null
}

export interface ScrollProgressOptions {
  /** Defaults to `'pinned'`. */
  range?: ProgressRange | undefined
}

export interface SequenceFallbackInfo {
  /** Canvas width in CSS pixels. */
  width: number
  /** Canvas height in CSS pixels. */
  height: number
  /** Backing-store pixels per CSS pixel. The context transform is already set to this scale. */
  dpr: number
  frameIndex: number
  frameCount: number
  progress: number
  /** Why no frame could be loaded; it names the first URL that failed. Null when the fallback is drawn for another reason. */
  error: string | null
}

/**
 * Draws a stand-in for a frame when no real frames could be loaded. The
 * context is already scaled to CSS pixels. Meant for development: the engine
 * labels the canvas as a fallback whenever one is drawn.
 */
export type SequenceFallback = (ctx: CanvasRenderingContext2D, info: SequenceFallbackInfo) => void

export interface SequenceRendererOptions {
  canvas: HTMLCanvasElement
  sequence: ImageSequence
  progress: ProgressSource
  /** Defaults to `'cover'`. */
  fit?: FitMode | undefined
  /** Defaults to the center. */
  focal?: FocalPoint | undefined
  /** Drawn in place of a frame once the sequence has failed to load. Without one, the canvas is left as it is. */
  fallback?: SequenceFallback | undefined
  /** Stamps a "dev fallback" badge over whatever `fallback` draws, so a stand-in is never mistaken for the real sequence. */
  labelFallback?: boolean | undefined
}

/** Paints a sequence onto one canvas. It owns the canvas size and the animation frame, and nothing else. */
export interface SequenceRenderer {
  /**
   * Sizes the backing store to `cssWidth × cssHeight × dpr` device pixels and
   * repaints on the next animation frame. Does nothing visible for an empty box.
   */
  resize: (cssWidth: number, cssHeight: number, dpr: number) => void
  /** Cancels the pending frame and every subscription. Does not stop the loader, which belongs to whoever created it. */
  dispose: () => void
}
