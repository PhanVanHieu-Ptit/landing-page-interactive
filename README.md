# Aurelle: a cinematic product landing page

A premium, dark, editorial landing page for a fictional product, **The Aurelle 50** (a hand-built 50 mm cinema prime), and the visual design system behind it.

Built with React 19, TypeScript 7 (strict), Vite 8, vanilla CSS with custom properties, and the native Canvas API. No CSS framework, no animation library, no 3D library.

> Aurelle is a fictional brand created for this demonstration. Check trademarks before using the name for anything real.

<<<<<<< Updated upstream
**Status:** foundation, visual design system, the cinematic Hero (entrance choreography and a scroll-linked exit), and a pinned, five-chapter scroll story that scrubs the lens. A preloader is deliberately not built yet. See the [roadmap](#roadmap).
=======
**Status:** complete, apart from the one thing this repo cannot supply: the 240-frame product sequence. Until it exists the page draws the procedural lens everywhere, the image-sequence engine stays switched off (`heroSequenceEnabled` in `src/content/sequence.ts`), and the loading screen waits for the webfonts. What was checked, and how, is in [`docs/verification-report.md`](docs/verification-report.md); what is missing, untested or deliberately left alone is under [Known limitations](#known-limitations); how to add the frames is under [Asset preparation](#asset-preparation).
>>>>>>> Stashed changes

## Quick start

Needs Node `^20.19.0 || >=22.12.0` (`.nvmrc` pins 22).

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc -b`, then `vite build` into `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run typecheck` | `tsc -b`, with the strict settings in `tsconfig.app.json` |
| `npm run lint` | `oxlint --deny-warnings` (react, typescript, jsx-a11y; warnings fail) |

## Project structure

```
src/
  styles/        Global CSS: tokens/, fonts, reset, base, type roles, utilities
  assets/fonts/  Self-hosted latin woff2 files and their OFL licenses
  content/       Typed copy and data: plain TypeScript, no React
  components/
<<<<<<< Updated upstream
    layout/      Container, SkipLink, SiteHeader, Navigation, SiteFooter
    ui/          PrimaryButton, SectionHeading, SectionIndicator, ScrollHint
    icons/       Inline SVG icons and the logo mark (currentColor)
    stage/       ProductStage: the canvas that hosts the hero product
  sections/      Hero, ScrollStory, Anatomy, Specifications, Reserve
  hooks/         useActiveChapter, useDisclosure, useElementSize, useMediaQuery, usePrefersReducedMotion, useScrolled
  animation/     Canvas helpers, the lens renderer, tween, Hero intro, scroll progress, the story's timeline and frame loop: no React, no UI
  lib/           cx, cssVars, renderEmphasis, renderRevealWords
docs/            Reference analysis
=======
    layout/      Container, SkipLink, SiteHeader, Navigation, SiteFooter, Preloader, ErrorBoundary
    ui/          PrimaryButton, SectionHeading, SectionIndicator, ScrollHint, ScrollProgress, SwapText
    icons/       Inline SVG icons and the logo mark (currentColor)
    stage/       ProductStage: the canvas that hosts the hero product
  sections/      Hero, ScrollStory, Anatomy, Specifications, Reserve
  hooks/         useActiveChapter, useDevicePixelRatio, useDisclosure, useElementSize, useIntroGate, useMediaQuery, usePrefersReducedMotion, useReveal, useScrolled, useSequenceReady, useStoryLayout
  image-sequence/ Scroll-scrubbed canvas image-sequence engine: its own README, a React-free core/, and a dev-only demo
  animation/     Canvas helpers, the lens renderer, tween, the lens intro, intro gate, scroll reveals, scroll progress, the story's layouts, timeline and frame loop: no React, no UI
  lib/           cx, cssVars, renderEmphasis, renderStaggeredWords, perf/vitals (opt-in measurements)
docs/            Reference analysis, performance measurements
>>>>>>> Stashed changes
```

Each component is a folder with `Name.tsx` and `Name.module.css`.

## Design system

### Tokens

All tokens are CSS custom properties on `:root`, in `src/styles/tokens/`. Color has two tiers: raw primitives (`--charcoal-*`, `--ivory-*`, `--amber-*`, `--steel-*`) and semantic roles (`--color-*`). Components use only semantic tokens.

| Group | File | Tokens |
| --- | --- | --- |
| Background and surface | `color.css` | `--color-bg`, `-bg-elevated`, `-surface`, `-surface-raised`, `-scrim` |
| Primary and secondary text | `color.css` | `--color-text-primary`, `-secondary`, `-tertiary`, `-inverse` |
| Accent | `color.css` | `--color-accent`, `-accent-strong`, `-accent-soft`, `--color-rim` |
| Lighting | `color.css` | `--light-key`, `--light-rim`, `--light-vignette`, `--rule-fade` |
| Typography | `typography.css` | `--font-display / -sans / -mono`, `--weight-*`, `--text-xs … --text-display`, leading and tracking |
| Spacing | `spacing.css` | `--space-1 … --space-10`, fluid `--space-section` and `--gutter` |
| Radii and shape | `shape.css` | `--radius-none … --radius-pill`, `--border-hairline`, soft shadows |
| Motion | `motion.css` | `--duration-instant … --duration-cinematic`, `--ease-*` |
| Breakpoints and layout | `layout.css` | `--bp-sm / md / lg / xl`, `--container-*`, `--header-h`, `--z-*` |

Some tokens are not referenced by anything in `src/` today: the `--bp-*` tokens (they document the breakpoints; every query repeats the literal), `--color-rim`, `--light-key`, `--duration-instant`, `--radius-none`, `--radius-md`, `--radius-lg`, `--radius-pill`, `--shadow-soft`, `--shadow-lift`, `--space-10`, `--tracking-normal`, `--weight-semibold` and `--z-base`, `--z-stage`, `--z-content`. They are the system's vocabulary, kept on purpose so the next component has a value to reach for; they are not dead code.

### Typography

Instrument Serif for display, Inter for body and UI, JetBrains Mono for labels. The scale is fluid: every `--text-*` step interpolates linearly between a 360px and a 1440px viewport with `clamp()`.

Roles are bound to tokens by the `type-*` classes in `src/styles/type.css`: `type-display`, `type-title-xl`, `type-title`, `type-subtitle`, `type-lede`, `type-body`, `type-body-sm`, `type-eyebrow`, `type-figure`, `type-data`. Use a role, not ad-hoc font properties. Instrument Serif's "1" reads like "l", so numbers use `type-figure` (Inter Light).

### Spacing and alignment

Everything sits inside `Container`, which uses one `--gutter`, so the header mark, hero text, section headings and footer brand share a left edge. On desktop, the Anatomy rows and the Specifications grid share the same four columns and gap.

### Color and contrast

Warm near-black surfaces, ivory text, one amber accent. WCAG 2.x ratios computed from the tokens: on the surfaces the page uses (`--color-bg`, `--color-bg-elevated`) primary text is 16.3 to 17.0:1, secondary 8.5 to 8.9:1, tertiary 5.3 to 5.6:1, accent text and the focus ring 8.4 to 8.8:1; on `--color-surface-raised`, the weakest surface defined (the page does not use it), they are 14.25, 7.47, 4.67 and 7.40:1. The button label is 16.96:1 on ivory and 11.45:1 on hover. Hairlines are decorative and never carry information alone.

Text set over the lens, the one place the backdrop varies, cannot be checked from tokens, so it was measured on rendered pixels (each line's color against the brightest 5% of the pixels behind it). That found the story's small chapter labels too faint over the lens ring in the desktop overlay layout (1.9 to 3.0:1 where 4.5:1 is needed), which a soft pool of the page color in the copy's corner now fixes (`.scrim::after` in `ScrollStory.module.css`). Method and numbers: [`docs/verification-report.md`](docs/verification-report.md).

### Motion

Everything animates through `--duration-*` and `--ease-*` (default: `--ease-out-quint`). Under `prefers-reduced-motion: reduce`, the duration tokens collapse to 1ms, smooth scrolling turns off, and a safety net in `reset.css` neutralizes any stray transition or keyframe. The ScrollHint animation runs only under `no-preference`. Motion driven from JavaScript (Web Animations, the lens tween, scroll-linked values) ignores those CSS rules, so it checks `usePrefersReducedMotion` instead and renders the final state.

<<<<<<< Updated upstream
=======
Durations are roles, not free choices, so every motion on the page feels related. Nothing overshoots, bounces or springs: each curve lands softly and stays put. Movement and entrances use the out curves; a change of state in color, background or border (the header taking its scrim, a link lighting up) pairs `--duration-base` or `--duration-fast` with `--ease-standard`; the loading screen's veil fades with `--ease-in-out`, a curve otherwise used only by the ambient loop.

| Role | Duration | Easing | Used for |
| --- | --- | --- | --- |
| Feedback | `--duration-fast` (160 ms) | `--ease-standard` | color and opacity on hover and focus |
| Small movement | `--duration-base` (280 ms) | `--ease-out-quint` | underlines, the CTA ring, arrows |
| Swap | `--duration-slow` (520 ms) | `--ease-out-quint` | `SwapText`: the Menu/Close toggle and the story rail's counter and label |
| Reveal | `--duration-slower` (800 ms) | `--ease-out-expo` | text, rules and copy entering, the Hero's included (`--reveal-duration`, `--reveal-ease`) |
| Scene | `--duration-cinematic` (1200 ms) | `--ease-out-expo` | the Hero stage, the Reserve glow, the footer wordmark |
| Ambient | `--duration-ambient` (2600 ms) | `--ease-in-out` | the ScrollHint loop |

### Scroll reveals

The sections below the story enter through one CSS-driven system, so every headline, rule and paragraph moves the same way. The contract is at the top of `src/styles/reveal.css`.

- **Hosts and items.** `data-reveal` marks a host; `data-reveal-item` marks what waits for it (the host itself or any descendant). `useReveal()`, called once in `App`, runs one `IntersectionObserver` (`animation/reveal.ts`) that sets `data-revealed` on a host the first time it is 10% inside the viewport and then stops watching it. It begins after webfonts are ready (or 600 ms), so a headline never reflows mid-entrance. A host already above the viewport (a reload that restored the scroll position, an anchor jump) is revealed at once. Hosts do not nest: an item is revealed by any revealed ancestor.
- **Variants.** The value of `data-reveal-item` picks the motion: `rise` (default: opacity and `translate`), `mask` (headline words rise out of a clip; made by `renderStaggeredWords`, which `SectionHeading` uses), `rule` (a hairline draws in) and `fade`. The `reveal-line` class gives a host a top hairline that draws in.
- **Stagger.** `--i` is an item's place in its host's sequence; it waits `--i × --stagger-step` (80 ms), capped by `--stagger-max`. `--reveal-lead` delays a whole host. A section heading reads eyebrow, hairlines, title word by word, then lede.
- **Reduced motion and print.** The hidden states exist only under `prefers-reduced-motion: no-preference`, so reduced-motion readers get the final layout straight from the stylesheet with no script in between. Print shows everything.
- **Scroll safety.** Only `opacity`, `translate` and `scale` change, nothing listens to scroll events, and nothing sets `will-change`.

The story's chapters are scrubbed, not triggered, so they stagger differently: `ChapterContent.module.css` derives each part's opacity and offset from `--chapter-presence` and `--chapter-shift` (the top part first in, the bottom part first out), which keeps the cascade locked to the scroll in both directions with no timers.

`ScrollProgress` is a one-pixel accent line on the header's bottom border, filled by `--page-progress` (`trackPageProgress` in `animation/scroll.ts`: a passive, frame-coalesced scroll listener plus a `ResizeObserver` on the document, since the page's height changes with the story's layout). It stays on under reduced motion because it reports position and moves nothing by itself.

>>>>>>> Stashed changes
### Hero motion

The lens leads and the copy follows, about 2 seconds in total, and nothing starts until the loading screen lets go. The lens is a Web Animations entrance plus a one-shot `requestAnimationFrame` tween of `LensParams` (the iris opens), both waiting on `gate.released`. The copy is not scripted: the section is a `data-reveal` host and each part (eyebrow, headline words, lede, call to action, scroll cue) an item, so it takes the page's reveal tokens and stagger; `--reveal-lead: var(--lead-after-stage)` (450 ms) holds the whole host behind the lens, and `useReveal(gate.released)` starts the observer only after the gate has opened and the webfonts are ready (or 600 ms), so the headline never reflows mid-reveal and every reveal on the page waits for the loading screen. Scrolling away writes `--hero-progress` (0 to 1) on the section, which the stylesheet turns into a drifting lens and fading copy; the bottom of the Hero ends on exactly `--color-bg`, so the next section continues the same black. The header floats over the Hero and takes its scrim and hairline once the page scrolls.

### Scroll story

Section 02 pins the lens and tells the product in five chapters (Introduction, Design, Craftsmanship, Innovation, The reveal) while the page scrolls natively. There is no image sequence: the "frames" are keyframed poses of the procedural lens, so it stays sharp at any zoom and costs no download.

**How it is built.** A tall `.track` holds a `position: sticky` 100svh `.stage`; how far the page has scrolled through the track is the story's progress (0 to 1). Everything that depends on it lives outside React:

| File | Job |
| --- | --- |
| `animation/story-config.ts` | **The tuning knobs.** Each chapter's range of progress, copy fade lengths and lens poses; per-layout scroll length, zoom gain, smoothing and DPR cap |
| `animation/story-timeline.ts` | Pure functions of progress: which chapter is active, each chapter's `presence` and `shift`, the lens pose. Validates the config and throws on overlapping ranges |
| `animation/story-controller.ts` | The one `requestAnimationFrame` loop: reads the scroll position, eases toward it, writes CSS variables, paints the canvas |
| `animation/lens-renderer.ts` | A long-lived painter that owns the context and palette |
| `sections/ScrollStory/` | `ScrollStory` (shell and modes), `StoryChapter` (the animated slot), `ChapterContent` (the words), `StoryCanvas` |
| `hooks/useActiveChapter.ts` | The active chapter index: the only story state React ever sees |

**Changing it.** Edit ranges and poses in `story-config.ts` and the words in `content/story.ts`, matched by chapter `id` and order. Ranges are fractions of the scroll distance and may not overlap. A chapter's copy fades in over `enter` and out over `exit` (default `DEFAULT_FADE`); the lens holds the `in` pose while the copy is readable and travels to the next chapter's pose while it swaps. One chapter's exit and the next one's enter are back to back, so two blocks of copy are never on screen together. `ScrollStory` also takes `timing` and `scrollLength` props.

<<<<<<< Updated upstream
=======
**With an image sequence.** `<ScrollStory sequence={{ handle, label }} />`, where `handle` is the `ImageSequence` a caller's own `useImageSequence` returned (so the loading screen and the story share one loader), swaps the lens for `CanvasSequence`, fed by the same eased progress that drives the copy (the controller's `progress` feed), so the picture and the words cannot drift apart and there is still one scroll listener and one frame loop. Each chapter in the timing may declare `frames: [first, last]`, the zero-based frames that play across its range; chapters that declare nothing share what is left, so with nothing declared the sequence plays at a constant pace. `createFrameMap` rejects frames that run backward or leave the sequence. The live page passes it only when `heroSequenceEnabled` is on, and only once the sequence's opening frames are ready (`useSequenceReady`): until then, and for good if the frames never load, the story draws the lens, never an empty stage. Run `npm run dev` and open `/story-demo.html` to see the sequence-backed story (with no frames, the engine's labeled development fallback shows the frame number the real sequence would be on).

>>>>>>> Stashed changes
**Performance rules.** The scroll listener is passive and only schedules a frame; each frame re-reads `scrollY`, so a flick or a jump collapses into the newest target and nothing queues. The shown progress eases toward it (a short exponential, frame-rate independent) and drives the canvas and the copy together. The loop stops itself once settled and sleeps while the story is more than a screen away. Layout is measured on attach and when the track or document resizes, never per frame, and everything written per frame is a custom property (read by `opacity` and `translate`) or canvas pixels. The canvas repaints only when progress moved enough to see.

**Layouts.** Three compositions, chosen from width, height and orientation together (`animation/story-layout.ts`, mirrored by the Hero): `overlay` (64rem wide, 40rem tall, landscape: the copy sits over the lens, under a scrim), `split` (landscape and under 40rem tall: copy and lens side by side) and `stacked` (everything else: the lens above the copy). Each has its own smoothing and canvas budget. `static` (`data-mode`) is separate: under `prefers-reduced-motion`, or when the viewport is under 20rem tall (a phone on its side at its smallest, or a window zoomed to 400%, where the pinned stage could not hold a chapter), nothing is pinned or scrubbed and the chapters follow in order under the finished lens. A rotation or resize keeps the reader's place in the story, not their pixel offset. The rail's counter and label roll between chapters (`SwapText`). The copy is always in the DOM and readable by assistive technology; only the call to action is `inert` while its chapter is out of turn.

<<<<<<< Updated upstream
=======
### Image sequence engine

`src/image-sequence/` scrubs a numbered series of frames (240 WebP files by default) on a canvas from scroll progress, and is independent of any page layout: the page owns a tall track and a sticky stage, and the engine fills the stage. It prioritizes frames near the playhead, limits concurrent requests, keeps only a window of decoded bitmaps, draws only when the picture changes, and follows the pixel ratio and the box size. The live page uses it only when `heroSequenceEnabled` is on (it is off: the repo has no frames; see [Asset preparation](#asset-preparation)); in development, with the flag on and no frames, it draws a labeled fallback, and a production build has no fallback code at all. Run `npm run dev` and open `/sequence-demo.html` to see the engine on its own. The [engine README](src/image-sequence/README.md) has the exact asset structure (`public/sequences/<slug>/frame-0001.webp` to `frame-0240.webp`), usage, and the loading and memory rules.

### Preloader

`components/layout/Preloader/` covers the page with a lens ring, the brand name and a percentage while what the first screen needs loads, then lifts away. What it waits for depends on `heroSequenceEnabled`. Off (the default): the four webfonts the first screen is set in. On: the opening frames of the image sequence as well; `App` then owns the loader (`useImageSequence` over `heroSequence`, 240 frames at `public/sequences/aurelle-50/`) and hands it to `<Preloader sequence={…} />`, which only reads it, and to the story, which plays the same loader. The loader lives for the whole visit, so the rest of the frames keep arriving after the overlay is gone.

- **Real progress only.** The number is the share of what is being waited for that has arrived: the critical webfonts (`fontsReadiness` in `preloadPolicy.ts`), or, with the sequence on, the first `criticalFrames` (12; `readiness()` in `src/image-sequence/core/readiness.ts`, from `SequenceState.criticalLoaded / criticalTotal`). Fonts or frames that failed are not progress, and 100% is shown only when the page is actually ready to open. Nothing is simulated; the ring only eases between real values. The minimum dwell means that with warm caches the number can read 100% a little before the screen lifts.
- **With the sequence on, the page never waits for all 240 frames.** The opening scene is the frames the loader fetches first anyway (nearest the start, or the last frame under reduced motion), so there is no separate priority list.
- **It cannot block for good.** The rules live in `preloadPolicy.ts` and are unit tested: at least 900 ms on screen (300 ms with reduced motion) so a fast load never flashes; the exit after ready holds 280 ms so the ring is seen to finish; no frame (or font) settling for 4 s ends the wait (`stalled`); 8 s from mount is a hard ceiling (`timeout`); webfonts that have not arrived after 2.5 s are not waited for (the page opens in its fallback face and swaps later); a sequence that cannot load at all ends it as soon as the minimum has passed (`unavailable`). In the engine, a single request that never answers is aborted after 15 s and retried (`requestTimeoutMs`), so a hung request cannot occupy a download slot forever.
- **Handover.** On exit the preloader opens the **intro gate** (`animation/intro-gate.ts`, read through `useIntroGate()` from `hooks/`). Anything with an entrance should start on `gate.released`, so it plays under the lifting overlay and not before it. The lens (`ProductStage`) does, and so does every scroll reveal, the Hero's copy included (`useReveal(gate.released)`). The overlay then fades over `--duration-slower`; only opacity and transform change, so nothing shifts.
- **Accessibility.** The ring is decorative; a visually hidden native `<progress>` carries the value, and a visually hidden `<output>` announces progress in 25% steps, then the outcome. While loading, the page is `inert` and the document does not scroll, so Tab cannot reach invisible content; the one control, **Skip**, is focusable from the start, appears after 2.5 s (or on focus) and ends the wait. There is no dialog and no focus trap. Under reduced motion the motion tokens collapse to 1 ms and the minimum dwell is shorter; the percentage is still real.

### Performance

[`docs/performance.md`](docs/performance.md) records what was measured (frame times of a full scroll pass on a desktop and a 4x-throttled phone profile, load timings, layout shift, memory, canvas sizes, Lighthouse), what it found, what was changed and what was tried and reverted. To measure a build yourself, run `VITE_PERF=1 npm run build` (or `npm run dev`), open the page with `?perf`, scroll, and read `window.__perf.report()` (`src/lib/perf/vitals.ts`); the shipping build contains none of that code. The image-sequence engine also bounds its memory by bytes and can pick a lighter set for a phone, a slow connection or Save-Data (see its README).

>>>>>>> Stashed changes
### Breakpoints

Mobile-first. `md` 48rem: inline navigation and two-column rows. `lg` 64rem: a larger Hero lens, a three-column Hero rail, and four-column grids. CSS cannot read custom properties inside `@media`, so the `--bp-*` tokens are the documented source of truth and every query repeats the same literal rem value.

### Components

| Component | Notes |
| --- | --- |
<<<<<<< Updated upstream
| `SiteHeader` | Sticky and transparent over the Hero until the page scrolls; mark, two links, one CTA. Below `md`, a text Menu/Close toggle opens a panel (`aria-expanded`, Esc closes and returns focus). |
| `Navigation` | One labelled `<nav>`; `header` and `footer` variants; underline reveal on hover and focus. |
| `PrimaryButton` | A link when given `href`, otherwise a button. Ivory fill, arrow nudge, 48px tall (44px at `sm`). |
| `SectionHeading` | Index and eyebrow with a fading rule, serif title with one italic word, optional lede. |
=======
| `SiteHeader` | Sticky and transparent over the Hero until the page scrolls; mark, two links, one CTA. Below `md`, a text Menu/Close toggle opens a panel (`aria-expanded`, Esc closes and returns focus); while it is open the page behind it is `inert`, so Tab cannot reach content the dimmed panel covers. |
| `Navigation` | One labelled `<nav>`; `header` and `footer` variants. The underline sweeps in from the left and leaves toward the right; the other links step back to the tertiary tone while one is engaged; keyboard focus mirrors hover. |
| `PrimaryButton` | A link when given `href`, otherwise a button. Ivory fill, arrow nudge, a hairline ring that opens around it on hover (a pseudo-element, so the focus ring keeps `outline` to itself), 48px tall (44px at `sm`). |
| `SectionHeading` | Index and eyebrow with a fading rule, serif title with one italic word (`title` is a string with `*emphasis*`), optional lede. A reveal host: it enters in reading order. |
| `ScrollProgress` | The page's scroll position as a hairline on the header's bottom edge. |
| `SwapText` | A label that rolls to its replacement (the Menu/Close toggle, the story rail's counter and label). Every item shares one grid cell (so nothing shifts), items before the active one wait above and items after it below, and only the active item is exposed to assistive technology. |
>>>>>>> Stashed changes
| `SectionIndicator` | "01 ——— 04". Presentational; the fill takes a 0–1 `progress` and animates. |
| `ScrollHint` | A real link to the next section, with a slow traveling highlight. |
| `ErrorBoundary` | The last line of defense around `App`: if rendering throws (a missing design token, say), a plain "Something went wrong" screen with a Reload button replaces what would be an empty dark page. It needs nothing from the app. The error is reported with `console.error`. |
| `SiteFooter` | Brand, links, contact, fictional-brand note, and a ghost wordmark. |

`ProductStage` draws the hero lens on a canvas with `animation/lens.ts`: a parametric, procedurally drawn front-on lens. It reads its colors from the CSS tokens and exposes `LensParams` (`irisOpen`, `ringRotation`, `lightAngle`) so it can be animated without pre-rendered frames. With `introduce`, the Hero plays a one-shot entrance (fade, settle, iris opening); a later scroll-driven scene can scrub the same parameters.

## Conventions

- **Tokens only.** No hex or rgb literals in `*.module.css`.
- **No inline styles** except dynamic values, through the typed `cssVars()` helper (only `SectionIndicator` uses it).
- **`className?: string | undefined`** on component props: CSS Module lookups are typed `string | undefined` (`noUncheckedIndexedAccess`), which `exactOptionalPropertyTypes` would otherwise reject.
- **Architecture guard.** `src/animation` and `src/content` may not import React or UI folders. `oxlint` enforces it (`.oxlintrc.json`).
- **Breakpoints.** Media-query widths must match a `--bp-*` token.
- **JS-driven animation must respect `prefers-reduced-motion`.** Use `usePrefersReducedMotion` and render the final state; CSS safety nets do not reach the Web Animations API or `requestAnimationFrame`.

## Accessibility

Skip link; one banner, one main, one contentinfo, and two distinctly labelled navs; a single `h1` and no skipped heading levels; real links and buttons with accessible names; a 2px accent focus ring that always sits on page or surface color; targets of 44px or more (`--target-min`); a text alternative for the canvas (and one that says "finished lens" when the story is not scrubbing); the page is `inert` behind the loading screen and behind an open mobile menu, so keyboard focus never lands on covered content; `<address>` holds only contact details; `forced-colors` rules for the button and the decorative wordmark (CSS only, see Known limitations); reduced motion handled in CSS tokens, in a safety net and in every script (and switchable at runtime); a story that falls back to unpinned chapters when the viewport is too short to pin them. Keyboard, focus-ring, reduced-motion and contrast results are in the verification report; screen readers were not used (see below).

## Roadmap

<<<<<<< Updated upstream
1. A preloader with real progress. The Hero intro starts on mount today; it will need to wait for the preloader.
2. Entrance choreography for the sections below the scroll story.
3. Open Graph image, analytics, tests (the story's timeline is pure, so it is the easiest place to start).

Done since the last revision: the scroll-driven scene (the story's own progress rail replaces feeding `SectionIndicator`, whose 520 ms transition would lag a per-frame value) and `useMediaQuery`.
=======
1. Real sequence frames (see [Asset preparation](#asset-preparation)), then flip `heroSequenceEnabled`, tune per-chapter `frames` in `story-config.ts` against the real art, and re-run the checks in the verification report that use the sequence.
2. Open Graph image and canonical URL (both need a deployment URL and art), analytics, and a real reservation flow behind the call to action (today it opens an email to a placeholder address).
3. More tests: the pure logic is covered (`npm test`); the React layer and the browser behavior are checked by hand-driven scripts that live outside the repo, which could be turned into an end-to-end suite.

## Asset preparation

The page is built to run without frames, so this is optional, and nothing else is needed to ship what is here. To play the real product sequence on the story's stage:

1. **Make 240 frames of one continuous move**, in order, all the same pixel size and fully opaque. Light the product on the page's own near-black (`#0a0a0b`, `--color-bg`) so the frames melt into the surround; the story's scrim and lighting sit over the canvas. The stage crops to fill (`fit: 'cover'`, centered), so keep what matters in the middle of the frame, and keep the bottom-left corner calm on desktop: the chapter copy sits there.
2. **Encode** at no more than 1920 × 1080, lossy WebP at quality 75 to 85, named `frame-0001.webp` to `frame-0240.webp`. Measure a few frames of your own footage before settling the size: the whole download is 240 times one frame. The ffmpeg and `cwebp` commands, the naming options, the memory budget and the hosting rules are in the [engine README](src/image-sequence/README.md#asset-structure). Do not commit generated placeholder frames.
3. **Put them in `public/sequences/aurelle-50/`** (or change `heroSequence.baseUrl` in `src/content/sequence.ts`) and serve that folder with `Cache-Control: public, max-age=31536000, immutable`, which is a setting of the host, not of this repo.
4. **Switch on**: set `heroSequenceEnabled = true` in `src/content/sequence.ts`. The loading screen then waits for the first 12 frames, and the story plays the sequence (the lens stays until the opening is ready, and for good if the frames never load).
5. **Map the chapters to frames.** With nothing declared the sequence plays at a constant pace. To give a chapter specific frames, add `frames: [first, last]` to its entry in `src/animation/story-config.ts` (zero-based, inclusive, never running backward).
6. **Check**: open `/story-demo.html?base=<your frames URL>` in `npm run dev`, scroll both ways, then `npm run build && npm run preview` and watch the Network panel: 240 requests under `/sequences/`, none failing.

Other assets: the favicon is `public/favicon.svg`; the fonts are self-hosted in `src/assets/fonts/` (licenses in `LICENSES.md`); an Open Graph image does not exist yet (see Known limitations).

## Known limitations

Stated plainly, so nobody has to find them out.

- **No real product frames exist.** The page shows a procedural lens drawn on a canvas. The sequence path is built and was exercised in a real browser with generated frames (instant, delayed, missing and hung) but never with real art.
- **Checked in Chrome only.** The checks were run in headless Google Chrome on one Mac. Safari, Firefox, real phones and tablets, and real touch input were not tested. The page uses `svh`, `inert`, `color-mix()`, `translate`/`scale` properties, CSS `@layer` and `overflow: clip`, which current Safari and Firefox support, but that is a claim about support tables, not a test.
- **No screen reader was used.** Semantics, names, landmarks, `inert`, focus order and live regions were checked in the DOM and with keyboard input, not by listening to NVDA, JAWS or VoiceOver.
- **No Lighthouse or field data of this page's final tree** was run for this stage; see [`docs/performance.md`](docs/performance.md) for the earlier lab numbers.
- **The reference was not compared visually or in motion.** Only the public listing text of Scrolltide's "Ora" template could be inspected (no live demo, screenshots or code), so no visual or motion equivalence is claimed. See [`docs/reference-analysis.md`](docs/reference-analysis.md).
- **Placeholders:** the reservation button opens an email to `hello@aurelle.example`, and the brand is fictional. There is no Open Graph image, canonical URL, `robots.txt`, sitemap or analytics (an Open Graph image and a canonical URL need a deployment URL).
- **A hung or offline network with the sequence on** is bounded (a stalled loading screen ends after 4 s, the story keeps the lens) but not retried: the loader gives up for good after repeated failures, with no "try again" control. With the sequence off nothing is fetched after load, so there is nothing to retry.
- **If the browser refuses a 2D canvas** the lens areas stay empty and the copy still works; there is no static poster image to fall back to. This comes from reading the code, not from a test.
- **Forced colors (Windows high contrast)** has CSS handling (the button, the decorative wordmark is hidden) that was not tested in a forced-colors browser.
- **Very short viewports unpin the story.** Below 20rem of viewport height (for example a window zoomed to 400%) the chapters are shown unpinned, by design; every height measured above that (down to 330 px, in landscape and portrait) fits between the header and the fold.
- **Sequence-engine memory and speed work** (byte budgets, look-ahead limits, a lighter tier for phones) is described in the engine README and `docs/performance.md`; it was written alongside this stage and is covered by its own unit tests, not by the browser checks here.

## Verification

[`docs/verification-report.md`](docs/verification-report.md) lists every check that was run for the final pass, with the tool, the viewports and the numbers, and what was not run. `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` are the in-repo gates.
>>>>>>> Stashed changes

## Credits

Fonts are self-hosted under the SIL Open Font License; see `src/assets/fonts/LICENSES.md`. The reference analysis, including what could and could not be verified, is in `docs/reference-analysis.md`.
