# Performance

What was measured, what it showed, what changed, and what was left alone. Every number here comes from a run described under [Method](#method); nothing is a target the page "achieves" without one.

## Summary

- **Scroll holds the display's frame rate in this lab.** A full pass down the page, with real scroll gestures, drew 340 to 350 frames with a 95th-percentile frame time of 16.7 to 16.8 ms on both a desktop profile and a phone profile throttled to 4x CPU. Across the runs, a pass had 0 to 2 frames over 20 ms (a few runs had one frame of 33 ms) and no long tasks. Headless Chrome caps frames at the display rate, so this shows the page keeps up there; it does not show how much headroom is left. See [Limits](#limits).
- **Layout shift is 0** at load, during scroll and under reduced motion, in every run. A 0.006 shift noted under reduced motion in an earlier stage did not reproduce.
- **The page is small:** 8 requests, about 214 KB, one 275 KB script (87 KB gzip), 41 KB of CSS (9 KB gzip), four fonts. No images, because every visual is canvas, SVG or CSS.
- **The largest measured cost is not in the code that scrolls but in the entrance:** the loading screen holds the page for about 1 s and the entrance plays for about 2 s more, so the first visible content arrives late by design. Lighthouse puts mobile LCP at 2.3 s on the current tree and 2.7 s on the last commit.
- **Three fixes I tried in the live scroll path did not reduce the work and were reverted** (details below). What was kept is the measuring tool, a bounded-memory image-sequence engine, and this record.

## Method

All lab, all on one Mac, so the numbers compare builds with each other and are not a statement about any other device.

| Piece | What it does |
| --- | --- |
| Headless Chrome 156 over the DevTools Protocol | A fresh profile and a cold cache for every run, GPU on (software rendering would make a 2x canvas look janky when it is not). Production builds served by `vite preview`. |
| Desktop profile | 1440 x 900 at 2x, no throttling. |
| Phone profile | 390 x 844 at 3x, touch, **4x CPU throttle**. A stand-in for a mid-range phone, not a measurement of one. |
| Scroll | `Input.synthesizeScrollGesture`, 1200 px at 1500 px/s at a time, over the whole page (about 7,700 px): real compositor scrolling, not `scrollTo`. |
| Frame times | A `requestAnimationFrame` sampler that runs only while the page scrolls, in a script injected before the page's own. |
| Main-thread work | A Chrome trace (`devtools.timeline` and friends), summed by event name on the renderer main thread; layout or style work that starts inside script counts as forced. |
| Web vitals | `PerformanceObserver` for FCP, LCP, layout shifts and Event Timing, and Lighthouse 12.8.2 (`npx`, performance category, simulated throttling) once per build and preset. |
| Repeats | Three runs per build and profile, median reported with the range. Run-to-run spread in main-thread milliseconds was 20 to 30%, because the machine was shared, so differences smaller than that are not claimed. |

The harness scripts live outside the repo (they drive a browser that has to be installed). The in-repo part is `src/lib/perf/vitals.ts`: build with `VITE_PERF=1 npm run build` (or use `npm run dev`), open the page with `?perf`, run the scroll, then read `window.__perf.report()` (LCP and its element, CLS with the elements that moved, INP of the interactions made, long tasks and animation frames, and scroll frame statistics; `__perf.resetScroll()` clears the sampler). The module is a separate chunk behind a build-time flag, so the shipping build contains none of it.

Two builds are compared throughout:

- **Last commit** (`a63982f`), built clean.
- **Working tree**, which on 2026-10-30 held another session's uncommitted work on top of that commit (the sequence switched off, the Hero's entrance moved onto the reveal system, a pixel-ratio hook, an error boundary) plus this pass's changes. This pass changes nothing the live page runs apart from a few hundred bytes of loader code that is not used while the sequence is off, so differences between the two builds below are that other work, not this one.

## Results

Medians of three runs, with the range in brackets where it matters.

### Loading

| | Last commit | Working tree |
| --- | --- | --- |
| Loading screen lets go (desktop / phone) | 974 / 1017 ms | 995 / 1034 ms |
| Last entrance animation ends (desktop / phone) | 2.21 / 2.26 s | 3.04 / 3.08 s |
| FCP (desktop / phone) | 68 / 116 ms | 92 / 116 ms |
| LCP by Chrome (desktop / phone) | 68 ms (h1) / 2.06 s (lede) | 92 ms (h1) / 2.85 s (lede) |
| Lighthouse performance score (phone / desktop) | 96 / 100 | 98 / 100 |
| Lighthouse LCP (phone / desktop) | 2.7 s / 0.6 s | 2.3 s / 0.5 s |
| Lighthouse TBT, CLS (phone) | 0 ms, 0 | 0 ms, 0 |
| Requests / failed | 23 / 15 | 8 / 0 |
| Transferred | 216 KB | 214 KB |
| React commits at load (desktop) | 8 | 5 |

Read these with care. Chrome's LCP on desktop is the Hero headline, counted at first paint while the loading screen is still covering it, so it is not what a visitor sees first; the visible Hero arrives when the entrance ends, 2.2 s after load on the last commit and 3.0 s on the working tree. The two LCP methods disagree about the phone's direction (Chrome's trace under CPU throttle says later, Lighthouse's simulation says earlier), so the honest reading is "around 2.3 to 2.9 s, set by the loading screen and the entrance, not by network or script". The 0.8 s later entrance on the working tree comes from the other session's uncommitted Hero work, not from this pass; it is worth a look before it is committed.

The 15 failed requests on the last commit were the frame loader asking for 240-frame files that do not exist. The working tree turns the sequence off until frames exist, which removes them.

### Scroll (one pass down the page)

| | Last commit, desktop | Working tree, desktop | Last commit, phone 4x | Working tree, phone 4x |
| --- | --- | --- | --- | --- |
| Frames drawn | 342 | 342 | 346 | 348 |
| 95th percentile frame | 16.8 ms | 16.7 ms | 16.7 ms | 16.8 ms |
| Frames over 20 ms | 0 to 1 | 0 to 1 | 0 to 2 | 0 to 1 |
| Long tasks | 0 | 0 | 0 | 0 |
| React commits | 6 | 5 | 6 | 5 |
| Main-thread task time | 947 ms | 882 ms | 1313 ms | 1283 ms |

Task time moves by less than the run-to-run spread, so no change is claimed. The page spends roughly 15% (desktop) to 20% (phone at 4x) of the scroll pass's wall time on the main thread.

### Canvas memory and pixel ratio

`resolveDpr` caps the ratio at 2 and each canvas at a pixel budget. Measured backing stores (`width x height x 4`):

| Device | Hero canvas | Story canvas | Total |
| --- | --- | --- | --- |
| 1440 x 900 at 2x | 1332 x 1332 (1.8 MP, 6.8 MB) | 2880 x 1800 (5.2 MP, 19.8 MB) | 26.6 MB |
| 2560 x 1440 at 2x | 2000 x 2000 at 1.88x (4.0 MP) | 3266 x 1837 at 1.28x (6.0 MP) | 38 MB |
| Phone, 390 x 844 at 3x | 641 x 641 at 2x (0.4 MP) | 780 x 947 at 2x (0.7 MP) | 4.4 MB |

So a 3x phone pays for 2x, and a large screen is held to its pixel budget (6 MP for the story) instead of drawing all 14.7 MP of a 2560 x 1440 screen at 2x.

### Memory and cleanup

JS heap after a full scroll is 2.6 MB, DOM nodes about 565, JS event listeners 166. The window carries four scroll listeners with the page at the top, which by the code are the story's, the page-progress bar's, the header's and the Hero's (the Hero only tracks while it is on screen).

The image-sequence demo mounted and unmounted three times: nodes 97 and 58, JS listeners 158 and 152, and window scroll, resize and pageshow listeners 1 and 0, **identical on every cycle**, so mounting leaves nothing behind.

### Interactions

Four synthetic taps on the menu toggle on the phone profile (the control is hidden at desktop width): the slowest was 16 to 24 ms (Event Timing reports from 16 ms up). That is a synthetic figure from one control, not an INP from visitors.

## Findings, and what was done about them

### Forced style recalculation during scroll: real, moved around, not removed

The first trace showed about 530 style or layout recalculations per pass starting inside script, 225 ms on desktop and 331 ms on the throttled phone, about a quarter of main-thread task time. By source, in the last commit:

| Caller | Events | Time (desktop / phone) |
| --- | --- | --- |
| The lens's canvas text (`ctx.font`, `fillText`) | 141 | 138 / 239 ms |
| `useScrolled`'s scroll handler reading `scrollY` | 345 | 81 / 85 ms |
| Page-progress, Hero and story reads | about 50 | 7 / 8 ms |

Invalidation tracking (on the working tree) says what dirties style before those reads: animations on the scroll-revealed sections ("Animation"), the page-progress bar and the story's CSS variables ("Inline CSS style declaration was mutated").

Three fixes were tried against it: draw the canvas before the story writes its variables; set the canvas font (and text direction) once per context instead of per frame; replace the scroll handler with an `IntersectionObserver`. The first and the third each removed their own forced recalculation; the second did not, because drawing the text forced it anyway. In every variant the total did not move: about 870 style recalculations per pass (2.5 a frame, against a floor of one) before and after, with the flush simply landing on the next reader. **All three were reverted**, because a change that relocates a cost is churn. Getting to one recalculation per frame would take a shared read-then-write frame scheduler (or removing the main-thread animations that dirty style), and the measured benefit does not justify it yet: frames are not being missed at 4x CPU throttle, and the forced work is about 3.6% of one core on desktop.

### Not changed, with the measurement behind each decision

| Candidate | Decision |
| --- | --- |
| Split `App` so the intro gate's release does not re-render the page | The longest task around the release measured 10.6 ms at 4x throttle, under a frame and far under a long task. Skipped. |
| Unmount the Preloader's loader subscription once the overlay is gone | Latent: it re-renders an empty component once per animation frame while frames arrive, and no frames exist to measure it with. With the sequence off the subscription does not exist at all. Worth doing when frames are added. |
| Memoize chapter content, split code | Five or six commits per scroll pass, all expected (chapter changes and the header). Below-the-fold sections are small static text. |
| Micro-optimize `drawLens` (cached colour strings, batched strokes, hoisted gradients) | Frames are not being missed at 4x throttle. Revisit if a slower target shows drops. |
| Header `backdrop-filter`, canvas `mask-image` | No frame cost showed up in the trace. Left as designed. |
| Fallback font metrics for CLS | CLS is 0 everywhere. Nothing to fix. |

Lighthouse flags about 36 KiB of unused JavaScript (React internals, not app code) and 150 ms of render-blocking CSS (the 9 KB gzip stylesheet). Inlining the critical CSS is a possible follow-up; it was not measured beyond Lighthouse's estimate.

## What changed in the repo

- **`src/lib/perf/vitals.ts`** and the `VITE_PERF` hook in `main.tsx`: the opt-in measuring tool above. Absent from the shipping build.
- **Image-sequence engine** (`src/image-sequence/`), all additive, with defaults that leave a normally encoded sequence behaving as before:
  - `maxDecodedBytes`: bounds decoded memory by bytes, not only by count. At 1080p the default still holds 16 frames.
  - `maxCachedBytes` and `lookahead`: bound the downloaded files; files the playhead has left far behind are dropped and fetched again if it returns.
  - `core/tiers.ts`: `chooseTier` / `loaderOptionsForTier` / `sourceForTier`, choosing a starting set of budgets from viewport, memory, Save-Data and connection type.
  - Tests: 7 new loader tests (byte budgets, look-ahead, dropping and refetching, nothing dropped by default) and 10 for the tiers. Details in the [engine README](../src/image-sequence/README.md#memory-budgets-and-device-tiers).

### Engine check in a real browser

120 generated 1920 x 1080 WebP frames (average 64 KB; synthetic, so this says nothing about how real footage compresses), served with no caching so a repeat fetch is visible. "Decoded memory" below is the window times `width x height x 4`, computed, not read from the browser.

| | Default | Balanced tier | Lite tier |
| --- | --- | --- | --- |
| Frames downloaded at the start | 120 | 120 | 48 |
| Served at the start | 7.6 MB | 7.6 MB | 3.0 MB |
| Decoded window | 16 frames, 127 MB | 8 frames, 63 MB | 4 frames, 32 MB |
| After jumping to 85% | 120 held | 80 held | 37 held |
| After returning to the start | no refetch | 40 frames refetched (at most 2 requests each) | 20 refetched |
| Exact frame shown | yes | yes | yes |

On a real host the refetches are HTTP cache hits when the frames are served `immutable` (see the README).

## Limits

- **One machine, one browser.** No real phone GPU, no Safari or Firefox, no thermal throttling. 4x CPU throttle approximates a mid-range phone's main thread and says nothing about its GPU, where a 5 MP canvas redrawn every frame is the likeliest place to drop frames. Headless Chrome also locks frames to the display rate, so a pass with no drops does not say how close it was. Test on a device before calling 60 FPS achieved there.
- **GPU and decoded-bitmap memory are not observable** here. Canvas backing stores and bitmap windows are computed from sizes.
- **No real frames exist**, so there are no compression, dimension or decode-time results for real art, and the tier thresholds and budgets are reasoned, not tuned. The README has the encode recipe and per-frame byte targets.
- **Lab, not field.** Lighthouse is simulated throttling from one run per preset; INP is synthetic; there is no CrUX data.
- **LCP is dominated by design:** the loading screen's 900 ms minimum and the staged entrance. Shortening either is a design decision and was not made.
