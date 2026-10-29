# Aurelle: a cinematic product landing page

A premium, dark, editorial landing page for a fictional product, **The Aurelle 50** (a hand-built 50 mm cinema prime), and the visual design system behind it.

Built with React 19, TypeScript 7 (strict), Vite 8, vanilla CSS with custom properties, and the native Canvas API. No CSS framework, no animation library, no 3D library.

> Aurelle is a fictional brand created for this demonstration. Check trademarks before using the name for anything real.

**Status:** foundation, visual design system, the cinematic Hero (entrance choreography and a scroll-linked exit), a pinned, five-chapter scroll story that scrubs the lens, and a reusable [image-sequence engine](src/image-sequence/README.md) (the page starts its loader for the preloader but draws nothing from it yet; there are no frames to show), and a [preloader](#preloader) that waits for the opening frames of that sequence. See the [roadmap](#roadmap).

## Quick start

Needs Node `^20.19.0 || >=22.12.0` (`.nvmrc` pins 22). `npm test` needs 22.12 or newer.

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
| `npm test` | Vitest, once: pure logic and the frame loader against fakes |

## Project structure

```
src/
  styles/        Global CSS: tokens/, fonts, reset, base, type roles, utilities, scroll reveals
  assets/fonts/  Self-hosted latin woff2 files and their OFL licenses
  content/       Typed copy and data: plain TypeScript, no React
  components/
    layout/      Container, SkipLink, SiteHeader, Navigation, SiteFooter, Preloader
    ui/          PrimaryButton, SectionHeading, SectionIndicator, ScrollHint, ScrollProgress, SwapText
    icons/       Inline SVG icons and the logo mark (currentColor)
    stage/       ProductStage: the canvas that hosts the hero product
  sections/      Hero, ScrollStory, Anatomy, Specifications, Reserve
  hooks/         useActiveChapter, useDisclosure, useElementSize, useIntroGate, useMediaQuery, usePrefersReducedMotion, useReveal, useScrolled
  image-sequence/ Scroll-scrubbed canvas image-sequence engine: its own README, a React-free core/, and a dev-only demo
  animation/     Canvas helpers, the lens renderer, tween, Hero intro, intro gate, scroll reveals, scroll progress, the story's timeline and frame loop: no React, no UI
  lib/           cx, cssVars, renderEmphasis, renderRevealWords, renderStaggeredWords
docs/            Reference analysis
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
| Motion | `motion.css` | `--duration-instant … --duration-ambient`, `--ease-*`, `--reveal-*`, `--stagger-*` |
| Breakpoints and layout | `layout.css` | `--bp-sm / md / lg / xl`, `--container-*`, `--header-h`, `--z-*` |

### Typography

Instrument Serif for display, Inter for body and UI, JetBrains Mono for labels. The scale is fluid: every `--text-*` step interpolates linearly between a 360px and a 1440px viewport with `clamp()`.

Roles are bound to tokens by the `type-*` classes in `src/styles/type.css`: `type-display`, `type-title-xl`, `type-title`, `type-subtitle`, `type-lede`, `type-body`, `type-body-sm`, `type-eyebrow`, `type-figure`, `type-data`. Use a role, not ad-hoc font properties. Instrument Serif's "1" reads like "l", so numbers use `type-figure` (Inter Light).

Display and body are deliberately two voices. The serif is large and tight (`--tracking-display` −0.03em; section titles scale from 40 to 72px and the closing statement from 48 to 104px), while the lede is Inter Light and body copy Inter Regular, each with its own slightly negative tracking token (`--tracking-lede`, `--tracking-body`) and the mono eyebrow stays wide and uppercase. Kerning and ligatures are on everywhere; headings also ask for `text-rendering: optimizeLegibility`, which is only worth its cost on short text.

### Spacing and alignment

Everything sits inside `Container`, which uses one `--gutter`, so the header mark, hero text, section headings and footer brand share a left edge. On desktop, the Anatomy rows and the Specifications grid share the same four columns and gap.

### Color and contrast

Warm near-black surfaces, ivory text, one amber accent. Measured WCAG 2.x ratios on the weakest surface each color can sit on: primary text 14.25:1, secondary 7.47:1, tertiary 4.67:1, accent text 8.45:1, focus ring 7.40:1; button label 16.96:1 (11.45:1 on hover). Hairlines are decorative and never carry information alone.

### Motion

Everything animates through `--duration-*` and `--ease-*` (default: `--ease-out-quint`). Under `prefers-reduced-motion: reduce`, the duration tokens collapse to 1ms, smooth scrolling turns off, and a safety net in `reset.css` neutralizes any stray transition or keyframe. The ScrollHint animation runs only under `no-preference`. Motion driven from JavaScript (Web Animations, the lens tween, scroll-linked values) ignores those CSS rules, so it checks `usePrefersReducedMotion` instead and renders the final state.

Durations are roles, not free choices, so every motion on the page feels related. Nothing overshoots, bounces or springs: each curve lands softly and stays put.

| Role | Duration | Easing | Used for |
| --- | --- | --- | --- |
| Feedback | `--duration-fast` (160 ms) | `--ease-standard` | color and opacity on hover and focus |
| Small movement | `--duration-base` (280 ms) | `--ease-out-quint` | underlines, the CTA ring, arrows |
| Swap | `--duration-slow` (520 ms) | `--ease-out-quint` | `SwapText`: the Menu/Close toggle (and, later, the story rail) |
| Reveal | `--duration-slower` (800 ms) | `--ease-out-expo` | text, rules and copy entering (`--reveal-duration`, `--reveal-ease`) |
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

### Hero motion

The lens leads and the copy follows, about 2 seconds in total. Entrance animations use the Web Animations API with `fill: 'backwards'`: the resting look lives in the stylesheet, the start pose is held until the animation plays, and webfonts are awaited (up to 600 ms) so the headline never reflows mid-reveal. The iris opens through a one-shot `requestAnimationFrame` tween of `LensParams`. Scrolling away writes `--hero-progress` (0 to 1) on the section, which the stylesheet turns into a drifting lens and fading copy; the bottom of the Hero ends on exactly `--color-bg`, so the next section continues the same black. The header floats over the Hero and takes its scrim and hairline once the page scrolls.

### Scroll story

Section 02 pins the lens and tells the product in five chapters (Introduction, Design, Craftsmanship, Innovation, The reveal) while the page scrolls natively. By default the "frames" are keyframed poses of the procedural lens, so it stays sharp at any zoom and costs no download. Given a `sequence` prop, the story plays an [image sequence](#image-sequence-engine) on the same stage instead (see "With an image sequence" below).

**How it is built.** A tall `.track` holds a `position: sticky` 100svh `.stage`; how far the page has scrolled through the track is the story's progress (0 to 1). Everything that depends on it lives outside React:

| File | Job |
| --- | --- |
| `animation/story-config.ts` | **The tuning knobs.** Each chapter's range of progress, copy fade lengths and lens poses; per-layout scroll length, zoom gain, smoothing and DPR cap |
| `animation/story-timeline.ts` | Pure functions of progress: which chapter is active, each chapter's `presence` and `shift`, the lens pose. Validates the config and throws on overlapping ranges |
| `animation/story-controller.ts` | The one `requestAnimationFrame` loop: reads the scroll position, eases toward it, writes CSS variables, paints the lens or notifies its `progress` feed |
| `animation/story-frames.ts` | Pure map from story progress to a position in an image sequence, from each chapter's optional `frames` |
| `animation/lens-renderer.ts` | A long-lived painter that owns the context and palette |
| `sections/ScrollStory/` | `ScrollStory` (shell and modes), `StoryChapter` (the animated slot), `ChapterContent` (the words), `StoryCanvas` (the lens), `StorySequence` (an image sequence) |
| `hooks/useActiveChapter.ts` | The active chapter index: the only story state React ever sees |

**Changing it.** Edit ranges and poses in `story-config.ts` and the words in `content/story.ts`, matched by chapter `id` and order. Ranges are fractions of the scroll distance and may not overlap. A chapter's copy fades in over `enter` and out over `exit` (default `DEFAULT_FADE`); the lens holds the `in` pose while the copy is readable and travels to the next chapter's pose while it swaps. One chapter's exit and the next one's enter are back to back, so two blocks of copy are never on screen together. `ScrollStory` also takes `timing` and `scrollLength` props.

**With an image sequence.** `<ScrollStory sequence={{ source, label }} />` swaps the lens for `CanvasSequence`, fed by the same eased progress that drives the copy (the controller's `progress` feed), so the picture and the words cannot drift apart and there is still one scroll listener and one frame loop. Each chapter in the timing may declare `frames: [first, last]`, the zero-based frames that play across its range; chapters that declare nothing share what is left, so with nothing declared the sequence plays at a constant pace. `createFrameMap` rejects frames that run backward or leave the sequence. The live page still uses the lens because the repo has no frames; run `npm run dev` and open `/story-demo.html` to see the sequence-backed story (with no frames, the engine's labeled fallback shows the frame number the real sequence would be on).

**Performance rules.** The scroll listener is passive and only schedules a frame; each frame re-reads `scrollY`, so a flick or a jump collapses into the newest target and nothing queues. The shown progress eases toward it (a short exponential, frame-rate independent) and drives the canvas and the copy together. The loop stops itself once settled and sleeps while the story is more than a screen away. Layout is measured on attach and when the track or document resizes, never per frame, and everything written per frame is a custom property (read by `opacity` and `translate`) or canvas pixels. The canvas repaints only when progress moved enough to see.

**Layouts.** `full` (48rem and up); `compact` below that: a shorter story, gentler close-ups, the lens lifted above the copy, a lower DPR cap and no figures line; `static` under `prefers-reduced-motion`: no pinning and no scrubbing, the finished lens followed by the chapters in order. The copy is always in the DOM and readable by assistive technology; only the call to action is `inert` while its chapter is out of turn.

### Image sequence engine

`src/image-sequence/` scrubs a numbered series of frames (240 WebP files by default) on a canvas from scroll progress, and is independent of any page layout: the page owns a tall track and a sticky stage, and the engine fills the stage. It prioritizes frames near the playhead, limits concurrent requests, keeps only a window of decoded bitmaps, draws only when the picture changes, and follows the pixel ratio and the box size. The live page does not use it yet because the repo has no frames (the scroll story can play it; see above); without frames it draws a labeled development fallback. Run `npm run dev` and open `/sequence-demo.html` to see the engine on its own. The [engine README](src/image-sequence/README.md) has the exact asset structure (`public/sequences/<slug>/frame-0001.webp` to `frame-0240.webp`), usage, and the loading and memory rules.

### Preloader

`components/layout/Preloader/` covers the page with a lens ring, the brand name and a percentage while the opening of the image sequence loads, then lifts away. `App` owns the loader (`useImageSequence` over `heroSequence` in `src/content/sequence.ts`, 240 frames at `public/sequences/aurelle-50/`) and hands it to `<Preloader sequence={…} />`, which only reads it. The loader lives for the whole visit, so the rest of the frames keep arriving after the overlay is gone.

- **Real progress only.** The number is the share of the first `criticalFrames` (12) that have arrived: `readiness()` in `src/image-sequence/core/readiness.ts`, from `SequenceState.criticalLoaded / criticalTotal`. Frames that failed are not progress, and 100% is shown only when the page is actually ready to open (frames decoded and the critical webfonts loaded). Nothing is simulated; the ring only eases between real values.
- **The page never waits for all 240 frames.** The opening scene is the frames the loader fetches first anyway (nearest the start, or the last frame under reduced motion), so there is no separate priority list.
- **It cannot block for good.** The rules live in `preloadPolicy.ts` and are unit tested: at least 900 ms on screen (300 ms with reduced motion) so a fast load never flashes; the exit after ready holds 280 ms so the ring is seen to finish; no frame settling for 4 s ends the wait (`stalled`); 8 s from mount is a hard ceiling (`timeout`); a sequence that cannot load at all ends it as soon as the minimum has passed (`unavailable`). In the engine, a single request that never answers is aborted after 15 s and retried (`requestTimeoutMs`), so a hung request cannot occupy a download slot forever.
- **Handover.** On exit the preloader opens the **intro gate** (`animation/intro-gate.ts`, read through `useIntroGate()` from `hooks/`). Anything with an entrance should start on `gate.released`, so it plays under the lifting overlay and not before it. The lens (`ProductStage`) already does. The overlay then fades over `--duration-slower`; only opacity and transform change, so nothing shifts.
- **Accessibility.** The ring is decorative; a visually hidden native `<progress>` carries the value, and a visually hidden `<output>` announces progress in 25% steps, then the outcome. While loading, the page is `inert` and the document does not scroll, so Tab cannot reach invisible content; the one control, **Skip**, is focusable from the start, appears after 2.5 s (or on focus) and ends the wait. There is no dialog and no focus trap. Under reduced motion the motion tokens collapse to 1 ms and the minimum dwell is shorter; the percentage is still real.

### Breakpoints

Mobile-first. `md` 48rem: inline navigation and two-column rows. `lg` 64rem: a larger Hero lens, a three-column Hero rail, and four-column grids. CSS cannot read custom properties inside `@media`, so the `--bp-*` tokens are the documented source of truth and every query repeats the same literal rem value.

### Components

| Component | Notes |
| --- | --- |
| `SiteHeader` | Sticky and transparent over the Hero until the page scrolls; mark, two links, one CTA. Below `md`, a text Menu/Close toggle opens a panel (`aria-expanded`, Esc closes and returns focus). |
| `Navigation` | One labelled `<nav>`; `header` and `footer` variants. The underline sweeps in from the left and leaves toward the right; the other links step back to the tertiary tone while one is engaged; keyboard focus mirrors hover. |
| `PrimaryButton` | A link when given `href`, otherwise a button. Ivory fill, arrow nudge, a hairline ring that opens around it on hover (a pseudo-element, so the focus ring keeps `outline` to itself), 48px tall (44px at `sm`). |
| `SectionHeading` | Index and eyebrow with a fading rule, serif title with one italic word (`title` is a string with `*emphasis*`), optional lede. A reveal host: it enters in reading order. |
| `ScrollProgress` | The page's scroll position as a hairline on the header's bottom edge. |
| `SwapText` | A label that rolls to its replacement. Every item shares one grid cell (so nothing shifts), items before the active one wait above and items after it below, and only the active item is exposed to assistive technology. |
| `SectionIndicator` | "01 ——— 04". Presentational; the fill takes a 0–1 `progress` and animates. |
| `ScrollHint` | A real link to the next section, with a slow traveling highlight. |
| `SiteFooter` | Brand, links, contact, fictional-brand note, and a ghost wordmark. |

`ProductStage` draws the hero lens on a canvas with `animation/lens.ts`: a parametric, procedurally drawn front-on lens. It reads its colors from the CSS tokens and exposes `LensParams` (`irisOpen`, `ringRotation`, `lightAngle`) so it can be animated without pre-rendered frames. With `introduce`, the Hero plays a one-shot entrance (fade, settle, iris opening); a later scroll-driven scene can scrub the same parameters.

## Conventions

- **Tokens only.** No hex or rgb literals in `*.module.css`.
- **No inline styles** except dynamic values, through the typed `cssVars()` helper (a progress ratio, a reveal's `--i`).
- **Entrances use the reveal system.** Mark a host and its items (see "Scroll reveals") and take timing from the tokens; do not hand-roll a per-section entrance or hardcode a delay.
- **`className?: string | undefined`** on component props: CSS Module lookups are typed `string | undefined` (`noUncheckedIndexedAccess`), which `exactOptionalPropertyTypes` would otherwise reject.
- **Architecture guard.** `src/animation` and `src/content` may not import React or UI folders. `oxlint` enforces it (`.oxlintrc.json`).
- **Breakpoints.** Media-query widths must match a `--bp-*` token.
- **JS-driven animation must respect `prefers-reduced-motion`.** Use `usePrefersReducedMotion` and render the final state; CSS safety nets do not reach the Web Animations API or `requestAnimationFrame`.

## Accessibility

Skip link; one banner, one main, one contentinfo, and two distinctly labelled navs; a single `h1` and no skipped heading levels; real links and buttons with accessible names; a 2px accent focus ring that always sits on page or surface color; targets of 44px or more; a text alternative for the canvas; `forced-colors` fallback on the button; reduced motion handled in CSS tokens and in a safety net.

## Roadmap

1. Make the Hero's entrance wait for the intro gate. Its copy (`playHeroIntro`, or the `data-reveal` system that replaces it) starts on mount, so it plays under the preloader; it should start on `useIntroGate().released` the way the lens does.
2. Finish the motion pass on the files the preloader work was editing: move the Hero's copy onto the reveal system (`hero-intro.ts` has its own hardcoded delays and no opacity on the headline words; the reveal system would start it on `useIntroGate().released` and share the page's timing tokens), and give the story rail's counter and label `SwapText` so chapter changes roll instead of swapping.
3. Open Graph image, analytics, and tests beyond the engine's (the story's timeline is pure, so it is the easiest place to start).
4. Real sequence frames, then giving the live story a `sequence` (and per-chapter `frames` in `story-config.ts`) instead of the procedural lens. `StorySequence` makes its own `useImageSequence`, which would load the frames twice next to the one `App` starts for the preloader; give it the sequence `App` already has (a context, or a prop) so the preloader and the canvas share one loader.

Done since the last revision: the typography and motion pass (a shared motion vocabulary, scroll reveals for every section below the story, the page progress line, sweeping nav underlines, the CTA ring, the Menu/Close roll and the chapter stagger), the image-sequence engine with unit tests for its pure logic and loader (`npm test`), the scroll-driven scene (the story's own progress rail replaces feeding `SectionIndicator`, whose 520 ms transition would lag a per-frame value) and `useMediaQuery`.

## Credits

Fonts are self-hosted under the SIL Open Font License; see `src/assets/fonts/LICENSES.md`. The reference analysis, including what could and could not be verified, is in `docs/reference-analysis.md`.
