# Image-sequence engine

A scroll-scrubbed canvas animation made of a numbered series of frames: scroll position becomes a frame index, and the matching frame is drawn on a `<canvas>`. It knows nothing about the page around it. The page owns the tall track and the sticky stage; the engine fills the stage and needs one thing from the page, a 0 to 1 progress value.

> **This repo ships no frames.** The page's scroll story scrubs a procedural lens unless it is given a sequence (see [In the scroll story](#in-the-scroll-story)); the live page gives it one only when `heroSequenceEnabled` in `src/content/sequence.ts` is on. Until real frames exist, the engine draws a clearly labeled development fallback (below), `/sequence-demo.html` lets you try the engine alone, and `/story-demo.html` shows the story playing it.

## Asset structure

Frames are plain files served by URL. Put them under `public/` (Vite serves it at the site root and copies it into `dist/` untouched):

```
public/sequences/<slug>/
  frame-0001.webp
  frame-0002.webp
  frame-0003.webp
  …
  frame-0240.webp
```

The naming rule is exactly this, and the engine never lists the directory, it builds each URL from the index:

```
{baseUrl}/{prefix}{number}.{extension}      number = firstFrameNumber + index, zero-padded to `digits`
```

| Option | Default | Meaning |
| --- | --- | --- |
| `frameCount` | (required) | How many frames. The default sequence is 240. |
| `baseUrl` | (required) | Directory URL, with or without a trailing slash: `/sequences/aurelle-50`. Use `${import.meta.env.BASE_URL}sequences/…` so a sub-path deployment works. |
| `prefix` | `frame-` | Filename prefix. |
| `digits` | `4` | Zero-padding width. `4` is what ffmpeg's `%04d` writes. |
| `firstFrameNumber` | `1` | Number in the first filename. ffmpeg counts from 1; set `0` if yours starts at zero. |
| `extension` | `webp` | Without the dot. Any format the browser decodes works (`avif`, `jpg`), but the sequence is meant for WebP. |

Rules for the files themselves:

- **Contiguous.** Every number from `firstFrameNumber` to `firstFrameNumber + frameCount - 1` exists. A missing frame is survivable (the nearest decoded neighbor stands in), a missing run looks like a stall.
- **One pixel size.** Every frame has the same width and height. The size is read from the first decoded frame.
- **Opaque.** The renderer overwrites the whole canvas on a `cover` draw and does not clear first, so a transparent frame would show the one before it through the holes.
- **Sized for the biggest screen you care about, not bigger.** 1920 × 1080 is a good ceiling. A decoded frame costs `width × height × 4` bytes (about 8 MB at 1080p), which is why only a window of them is ever kept decoded.
- **Lossy WebP, quality 75 to 85**, is a good starting point. The total download is 240 times the size of one frame, so measure a few frames of your own footage before settling on a resolution and quality.
- **Same origin, or CORS-enabled.** Frames are fetched with `fetch`, so another origin must send `Access-Control-Allow-Origin`.
- **Cacheable for good.** A URL's frame never changes, so serve `/sequences/` with `Cache-Control: public, max-age=31536000, immutable` and rename the folder when the art changes. That is a setting of the host, not of this repo (`vite preview` sets none). It also makes a file the loader dropped under a byte cap cost a cache hit and not a download when the playhead returns. Serve `/assets/` (hashed by the build) the same way.

### Making the frames

From a video, with an ffmpeg that has `libwebp` (check with `ffmpeg -encoders | grep webp`). Set `fps` to `240 / clip length in seconds`; this example is an 8-second clip:

```bash
mkdir -p public/sequences/aurelle-50
ffmpeg -i product.mp4 -vf "fps=30,scale=1920:-2" -c:v libwebp -quality 80 -compression_level 6 \
  public/sequences/aurelle-50/frame-%04d.webp
```

Some builds lack `libwebp` (the Homebrew one on this machine did). Write PNGs and convert them with `cwebp` instead:

```bash
mkdir -p /tmp/frames && ffmpeg -i product.mp4 -vf "fps=30,scale=1920:-2" /tmp/frames/frame-%04d.png
for f in /tmp/frames/*.png; do cwebp -q 80 "$f" -o "public/sequences/aurelle-50/$(basename "${f%.png}").webp"; done
```

## Using it

Three pieces, none of which re-renders while you scroll:

```tsx
import { useRef } from 'react'
import { CanvasSequence, useImageSequence, useScrollProgress } from '@/image-sequence'

export function ProductScrub() {
  const trackRef = useRef<HTMLDivElement>(null)
  const sequence = useImageSequence({ frameCount: 240, baseUrl: `${import.meta.env.BASE_URL}sequences/aurelle-50` })
  const progress = useScrollProgress(trackRef) // 'pinned' by default

  return (
    // The page's job: a tall track around a sticky stage. 500svh is the scroll distance, so it sets the pacing.
    <div ref={trackRef} className={styles.track}>
      <div className={styles.stage}>
        <CanvasSequence sequence={sequence} progress={progress} label="The Aurelle 50 turning to show each side." />
      </div>
    </div>
  )
}
```

```css
.track { block-size: 500svh; }
.stage { position: sticky; inset-block-start: 0; block-size: 100svh; }
```

- **`useImageSequence(source, options?)`** returns the handle and owns the download for as long as the component is mounted. `source` and `options` can be inline objects: they are compared by value.
- **`useScrollProgress(ref, { range? })`** turns an element's position into a `ProgressSource`. `'pinned'` (default): 0 when the track's top reaches the viewport top, 1 when its bottom reaches the viewport bottom. `'pass'`: 0 as the element enters at the bottom, 1 as it leaves at the top. Anything with `{ get, subscribe }` works as a source, so a different scroll library or a time-based clock can drive the same canvas.
- **`CanvasSequence`** fills its parent. Size and position it with CSS, and give it a `label`: the canvas has no content of its own.
- **`useSequenceState(sequence)`** is for a preloader or an error message. It reports real progress (`loaded`, `failed`, `decoded`, `progress`, `status`, and the opening-scene counts below) and re-renders at most once per animation frame while frames arrive. The canvas never reads it.
- **`readiness(state)`** turns that state into `{ outcome: 'pending' | 'ready' | 'unavailable', progress }` for a loading screen: ready once the opening scene has settled and a frame is decoded, unavailable once the loader has given up or the whole opening failed with nothing loaded (the case `preload: 'focus'` needs, since it asks for too few frames to trip the loader's own rule). See *The opening scene* below.

`CanvasSequence` props: `fit` (`'cover'` default, `'contain'`), `focal` (`{ x, y }` in 0..1, default center: where a cropped or letterboxed frame sits), `maxDpr` (default 2), `fallback`, `reducedMotion`, `staticFrame`, `className`.

Loader options (`useImageSequence`'s second argument): `fetchConcurrency` (4), `decodeConcurrency` (2), `maxDecodedFrames` (16, never below 3), `retries` (2), `retryDelayMs` (250, doubling), `requestTimeoutMs` (15000, `0` disables), `initialFrame` (0), `criticalFrames` (0), `preload` (`'all'`, or `'focus'`).

For a status UI that shows the finished state before the sequence is usable, check `status`: `loading` (nothing drawable yet), `ready` (at least one frame is decoded and drawing, downloads continue), `complete` (every frame arrived or failed for good; never reached under a look-ahead or byte cap), `error` (nothing could be loaded).

### In the scroll story

`ScrollStory` takes an optional `sequence` prop (`{ handle, label, fit?, focal? }`, where `handle` is the `ImageSequence` your own `useImageSequence` returned: the caller owns the download, so a loading screen and the story can share one loader) and plays the sequence on its stage instead of the procedural lens. It does not use `useScrollProgress`: the story already has one scroll listener and one animation-frame loop, and its eased progress also drives the copy, so the canvas follows that same value (`controller.progress`, a `{ get, subscribe }` source) and the picture and the words cannot drift apart. Between the two sits a pure map, `animation/story-frames.ts`:

- A chapter may declare `frames: [first, last]` (zero-based, inclusive) in the story's timing; those frames play linearly across its scroll range. A short stretch over a long range makes a slow shot; a long stretch over a short range makes a fast one. Chapters that declare nothing share the frames their neighbors leave over, in proportion to their scroll length, so with nothing declared the whole sequence plays at a constant pace.
- Frames must not run backward across chapters (scrolling back plays the sequence back by itself) or leave `0` to `frameCount - 1`; the map throws with the chapter's `id` otherwise.
- The map's output is the middle of the wanted frame's slice, so this engine's own rounding lands exactly on the declared frames.

```tsx
<ScrollStory
  timing={timingWithFrames} // STORY_TIMING plus `frames` on each chapter
  sequence={{ handle, label: 'The Aurelle 50…' }} // handle = useImageSequence({ frameCount: 240, baseUrl: `${import.meta.env.BASE_URL}sequences/aurelle-50` })
/>
```

Under reduced motion, or when the viewport is too short to pin the story, it is not pinned or scrubbed: `CanvasSequence` holds its last frame (the story passes `still`), and under reduced motion the loader fetches only the frames around it.

The live page does this through `heroSequenceEnabled` in `src/content/sequence.ts`, which is off. When it is on, `App` starts one loader for the loading screen and the story, and the story keeps the procedural lens until the sequence's opening frames are ready (`useSequenceReady`), and for good if they never are.

## How it works

```
scroll ─► ProgressSource ─► frame index ─► loader.getFrame ─► drawCoverImage ─► canvas
              (core/scrollProgress)  (sequenceMath)   (core/frameLoader)   (drawCoverImage.ts)
```

| File | Job |
| --- | --- |
| `imageSequence.types.ts` | The public contract. No imports. |
| `core/sequenceMath.ts` | Frame URLs, progress to frame index, the pinned/pass range math, the cost function that orders downloads, decodes and evictions. |
| `core/frameLoader.ts` | Downloads and decodes. Owns every request and every bitmap. |
| `core/scrollProgress.ts` | A `ProgressSource` for an element: one passive scroll listener, one layout read per animation frame, notifies only on change. |
| `core/sequenceRenderer.ts` | Decides what is on the canvas and when it changes. |
| `core/canvasSize.ts` | Tells the renderer the box size and pixel ratio. |
| `core/devFallback.ts` | The labeled stand-in. |
| `drawCoverImage.ts` | `object-fit` and `object-position` for canvas: `fitRect` and `drawCoverImage`. |
| `useImageSequence.ts`, `useScrollProgress.ts`, `CanvasSequence.tsx` | The React layer: lifecycle and wiring only. |

`core/` is React-free and imports nothing from the app (lint-enforced), so the engine also works without React: `createFrameLoader`, `createScrollProgress` and `createSequenceRenderer` are exported from `index.ts`.

### Rendering

- **Frame index.** Each frame owns an equal slice of 0..1, and the last frame is reached just before progress hits 1: `min(count - 1, floor(progress × count))`.
- **No React in the loop.** Progress goes from the scroll source straight into the renderer, which draws synchronously, because the source notifies from inside an animation frame. `CanvasSequence` renders once and never sets state.
- **No repeated draws.** The renderer remembers which frame is on the canvas (never the bitmap, which the loader may close) and skips the draw when it would not change a pixel. That includes waiting on a slow frame while a neighbor stands in. Scrolling inside one frame's slice costs nothing, and an idle page schedules no animation frames at all: there is no render loop, only reactions.
- **Late frames.** A frame that finishes decoding arrives from a promise, not an animation frame, so it only schedules one frame (coalesced), and only when the picture on screen is not the exact frame wanted.
- **Resizing and pixel ratio.** A `ResizeObserver` reports the CSS size; the backing store becomes `round(css × min(devicePixelRatio, maxDpr))`. It is only reassigned when it really changed, because assigning `width` clears the canvas. Drawing is in whole device pixels, so there is no blur from fractional rectangles.
- **Aspect ratio.** `cover` crops the *source* to the box's aspect ratio (so the sampled rectangle is exact); `contain` fits the whole frame and rounds one side to a whole pixel, so bars are crisp and the ratio is off by under a pixel. `contain` clears the canvas first, so bars never show a previous frame.
- **Cleanup.** Every listener, observer, timer, request, animation frame and bitmap is released on unmount. React StrictMode's double mount requests each frame once.

### Loading

- The frame under the playhead is requested first, with `priority: 'high'`. Frames within the decode window are `high`, the rest `low`.
- One cost function orders everything: a frame ahead of the playhead in its direction of travel costs its distance, a frame behind costs 2.5 times that. Downloads, decodes and evictions all use it, so they can never disagree about what matters.
- At most 4 downloads and 2 decodes at once. Real progress is `(loaded + failed) / total`.
- Every downloaded file is kept (a compressed frame is small) unless a look-ahead or byte cap says otherwise (see [Memory budgets](#memory-budgets-and-device-tiers)); only **16 decoded bitmaps** are kept at once, nearest the playhead, and evicted ones are `close()`d. An evicted frame is decoded again from memory, not from the network.
- A far jump aborts requests for the old neighborhood so the new one isn't queued behind them.
- A request still unfinished after `requestTimeoutMs` (15 s) is aborted and handled like a network error: retried with backoff, then given up on. Without it, one request that never answers would hold a download slot for good, and four of them would stop all loading.
- A frame that is missing, not an image (Vite answers unknown paths with `index.html` and a 200; the loader checks the content type), or undecodable is skipped for good. A 408, 429, 5xx or network error is retried with backoff first. The canvas shows the nearest decoded frame, preferring the side the playhead came from.
- If **12 frames in a row fail with nothing loaded**, the loader decides the assets are not there, stops asking, logs one `console.error` naming the first failing URL, and reports `status: 'error'`.

### The opening scene

A loading screen should wait for the first few frames, not for all 240. `criticalFrames: n` names them: the frames the loader would fetch first (those with `frameCost(i, initialFrame, 1) < min(n, maxDecodedFrames)`; for `initialFrame: 0` that is frames `0` to `n - 1`). The set is fixed when the loader is created, so it keeps meaning "the opening" after the playhead moves, and it is capped at the decode window so it is always inside what `preload: 'focus'` downloads (a sequence that starts on its last frame, as reduced motion does, gets that frame and the ones behind it).

The state reports it as `criticalTotal`, `criticalSettled` (downloaded or failed for good) and `criticalLoaded` (downloaded). Progress is `criticalLoaded / criticalTotal`: a failed frame shows nothing, so a run of failures must not fill a progress ring. Readiness is `criticalSettled >= criticalTotal` with at least one frame decoded: once nothing more will arrive for the opening, the canvas can draw it (a missing frame is covered by its nearest neighbor). `readiness()` combines the two and never reports 1 unless it is ready.

### Memory budgets and device tiers

A decoded 1080p frame is about 8.3 MB and the default window holds 16 of them (133 MB), which a desktop carries easily and a phone may not. Three options bound memory by bytes as well as by count. All are additive, and the defaults leave a normally encoded sequence behaving as it always did:

| Option | Default | Effect |
| --- | --- | --- |
| `maxDecodedBytes` | 160 MiB | Once the first frame reports its size, the decode window is `min(maxDecodedFrames, maxDecodedBytes / (width × height × 4))`, never below 3. At 1080p the default still allows all 16; frames larger than 1080p are held to fewer. |
| `maxCachedBytes` | 128 MiB | Bounds the downloaded files. From the average file size the loader works out how many frames of window fit, and downloads and keeps only those nearest the playhead. A file the playhead has left far behind (beyond that window plus the decode window) is dropped and fetched again if the playhead returns. A 240-frame sequence at about 120 KB a frame is 29 MB, so by default this changes nothing. |
| `lookahead` | none | The same window, set by hand, in cost units (one per frame ahead, 2.5 per frame behind). Never below the decode window. |

Dropping a file puts its frame back in the queue, so `loaded` goes down again and a sequence held under a look-ahead or a byte cap **never reaches `complete`**: its status stays `ready`. The opening scene (`criticalFrames`) is unaffected while the playhead is near it.

`core/tiers.ts` picks a starting point for a device. `chooseTier(readDeviceSignals())` returns `full`, `balanced` or `lite` from the viewport's short side, `navigator.deviceMemory`, `connection.saveData` and `connection.effectiveType`. `loaderOptionsForTier(tier)` gives the matching budgets and `sourceForTier(tier, { full, balanced, lite })` the matching frame set (a tier without a set of its own uses the nearest richer one, with its smaller budgets still applied). Pick the tier once at startup, not on resize, so nothing reloads. Suggested sets, all numbered the same way: `full` at 1920 × 1080 in `aurelle-50/`, `balanced` at 1280 × 720 in `aurelle-50/m/` (3.7 MB decoded a frame, 64 MiB holds 16 of them), and `lite` as the same smaller set with `step: 2` for half the downloads.

The thresholds and budgets are starting points reasoned from what a decoded frame costs. They were not tuned against real frames, because none exist yet: measure on a phone before trusting them. `createImageBitmap` still decodes at the file's own size, so a byte budget protects memory but not decode time; only a smaller frame set lowers that.

### Fallback

When the sequence cannot load, the canvas shows a stand-in:

- **Development** (`import.meta.env.DEV`): `devFallback`, a procedural gradient with the frame number the real sequence would show and the failing URL, with a magenta **DEV FALLBACK · NO FRAMES** badge stamped on top of it. It follows scroll, so you can check the mapping before any art exists. A custom `fallback` is drawn as it is, with no badge: it is yours. A production build has no `devFallback` and no badge (the string is not in the bundle).
- **Production**: nothing is drawn, so whatever sits behind the canvas (the page background, or a poster image you place there) shows. Read `useSequenceState(sequence).status === 'error'` to swap in your own UI. Pass a `fallback` function to draw something on the canvas instead, or `fallback={false}` to switch the dev stand-in off.

A canvas that is still `loading` with nothing decoded is left untouched in both modes.

### Reduced motion

With `prefers-reduced-motion: reduce` (or `reducedMotion`), the sequence does not scrub: it holds one frame (`staticFrame`, default the last, usually the finished shot), and `useImageSequence` switches the loader to `preload: 'focus'`, so only the frames around that one are downloaded. Setting `options.preload` overrides this.

## Trying it

`npm run dev`, then open `/sequence-demo.html`. It is a dev-only page (Vite builds `index.html` alone, so it never ships): a 500svh track, a sticky stage, a status panel with real loading numbers, a cover/contain toggle and an unmount toggle.

```
/sequence-demo.html                                  frames from public/sequences/demo/, 240 of them
/sequence-demo.html?base=/sequences/aurelle-50       another directory
/sequence-demo.html?base=https://cdn.example/x&frames=120
```

With no frames in place it shows the labeled fallback.

## Tests

`npm test` (Vitest; needs Node 22.12 or newer). Covered: URL building, progress-to-frame mapping, range math, cover/contain geometry, `readiness`, and the loader's scheduling (concurrency cap, nearest-first order, jump handling, retry and give-up rules, request timeouts, the opening-scene counts, the decoded-bitmap budget, eviction, cleanup on stop) against fake `fetch`, decode and animation-frame functions. Canvas, scroll and resize behavior need a real browser; that was checked in headless Chrome with a generated 240-frame sequence (distinct frames, kept out of the repo).

## Known limits

- **A pixel-ratio change with no resize** (the window moves to another display) is noticed through `matchMedia('(resolution: …dppx)')` events, which browsers send. In Chrome's device emulation a step back down to exactly 1× sends none, so that one transition could not be checked there; every other transition was.
- **No smoothing in `useScrollProgress`.** The frame follows the scroll position exactly. Inside the scroll story the progress is already eased (see above), because the story's controller is the source; a page that wants the same with its own source would put an eased follow between the source and the renderer.
- **One sequence per `CanvasSequence`.** Cross-fading two sequences, or alpha frames over a live background, are not supported.
