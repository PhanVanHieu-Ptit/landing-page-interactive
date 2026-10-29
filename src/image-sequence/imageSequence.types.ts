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
 * `firstFrameNumber + i` zero-padded to `digits`. With the defaults, a
 * 240-frame sequence is `frame-0001.webp` through `frame-0240.webp`.
 *
 * Numbering must be contiguous, and every frame must share one pixel size and
 * be opaque: the renderer only clears the canvas when a frame leaves bars.
 */
export interface ImageSequenceSource {
  /** Number of frames in the sequence. */
  frameCount: number
  /** Directory URL holding the frames, with or without a trailing slash. */
  baseUrl: string
  /** Filename prefix. Defaults to `frame-`. */
  prefix?: string | undefined
  /** Width the frame number is zero-padded to. Defaults to 4, which is what ffmpeg's `%04d` writes. */
  digits?: number | undefined
  /** Number in the first frame's filename. Defaults to 1, which is where ffmpeg starts counting. */
  firstFrameNumber?: number | undefined
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
}

/**
 * Draws a stand-in for a frame when no real frames could be loaded. The
 * context is already scaled to CSS pixels. Meant for development: the engine
 * labels the canvas as a fallback whenever one is drawn.
 */
export type SequenceFallback = (ctx: CanvasRenderingContext2D, info: SequenceFallbackInfo) => void
