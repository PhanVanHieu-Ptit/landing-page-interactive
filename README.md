# Aurelle: a cinematic product landing page

A premium, dark, editorial landing page for a fictional product, **The Aurelle 50** (a hand-built 50 mm cinema prime), and the visual design system behind it.

Built with React 19, TypeScript 7 (strict), Vite 8, vanilla CSS with custom properties, and the native Canvas API. No CSS framework, no animation library, no 3D library.

> Aurelle is a fictional brand created for this demonstration. Check trademarks before using the name for anything real.

**Status:** foundation, visual design system, and the cinematic Hero (entrance choreography and a scroll-linked exit). A preloader and a scroll-driven lens scene are deliberately not built yet. See the [roadmap](#roadmap).

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
    layout/      Container, SkipLink, SiteHeader, Navigation, SiteFooter
    ui/          PrimaryButton, SectionHeading, SectionIndicator, ScrollHint
    icons/       Inline SVG icons and the logo mark (currentColor)
    stage/       ProductStage: the canvas that hosts the hero product
  sections/      Hero, Anatomy, Specifications, Reserve
  hooks/         useDisclosure, useElementSize, usePrefersReducedMotion, useScrolled
  animation/     Canvas helpers, the lens renderer, tween, Hero intro, scroll progress: no React, no UI
  lib/           cx, cssVars, renderEmphasis, renderRevealWords
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
| Motion | `motion.css` | `--duration-instant … --duration-cinematic`, `--ease-*` |
| Breakpoints and layout | `layout.css` | `--bp-sm / md / lg / xl`, `--container-*`, `--header-h`, `--z-*` |

### Typography

Instrument Serif for display, Inter for body and UI, JetBrains Mono for labels. The scale is fluid: every `--text-*` step interpolates linearly between a 360px and a 1440px viewport with `clamp()`.

Roles are bound to tokens by the `type-*` classes in `src/styles/type.css`: `type-display`, `type-title-xl`, `type-title`, `type-subtitle`, `type-lede`, `type-body`, `type-body-sm`, `type-eyebrow`, `type-figure`, `type-data`. Use a role, not ad-hoc font properties. Instrument Serif's "1" reads like "l", so numbers use `type-figure` (Inter Light).

### Spacing and alignment

Everything sits inside `Container`, which uses one `--gutter`, so the header mark, hero text, section headings and footer brand share a left edge. On desktop, the Anatomy rows and the Specifications grid share the same four columns and gap.

### Color and contrast

Warm near-black surfaces, ivory text, one amber accent. Measured WCAG 2.x ratios on the weakest surface each color can sit on: primary text 14.25:1, secondary 7.47:1, tertiary 4.67:1, accent text 8.45:1, focus ring 7.40:1; button label 16.96:1 (11.45:1 on hover). Hairlines are decorative and never carry information alone.

### Motion

Everything animates through `--duration-*` and `--ease-*` (default: `--ease-out-quint`). Under `prefers-reduced-motion: reduce`, the duration tokens collapse to 1ms, smooth scrolling turns off, and a safety net in `reset.css` neutralizes any stray transition or keyframe. The ScrollHint animation runs only under `no-preference`. Motion driven from JavaScript (Web Animations, the lens tween, scroll-linked values) ignores those CSS rules, so it checks `usePrefersReducedMotion` instead and renders the final state.

### Hero motion

The lens leads and the copy follows, about 2 seconds in total. Entrance animations use the Web Animations API with `fill: 'backwards'`: the resting look lives in the stylesheet, the start pose is held until the animation plays, and webfonts are awaited (up to 600 ms) so the headline never reflows mid-reveal. The iris opens through a one-shot `requestAnimationFrame` tween of `LensParams`. Scrolling away writes `--hero-progress` (0 to 1) on the section, which the stylesheet turns into a drifting lens and fading copy; the bottom of the Hero ends on exactly `--color-bg`, so the next section continues the same black. The header floats over the Hero and takes its scrim and hairline once the page scrolls.

### Breakpoints

Mobile-first. `md` 48rem: inline navigation and two-column rows. `lg` 64rem: a larger Hero lens, a three-column Hero rail, and four-column grids. CSS cannot read custom properties inside `@media`, so the `--bp-*` tokens are the documented source of truth and every query repeats the same literal rem value.

### Components

| Component | Notes |
| --- | --- |
| `SiteHeader` | Sticky and transparent over the Hero until the page scrolls; mark, two links, one CTA. Below `md`, a text Menu/Close toggle opens a panel (`aria-expanded`, Esc closes and returns focus). |
| `Navigation` | One labelled `<nav>`; `header` and `footer` variants; underline reveal on hover and focus. |
| `PrimaryButton` | A link when given `href`, otherwise a button. Ivory fill, arrow nudge, 48px tall (44px at `sm`). |
| `SectionHeading` | Index and eyebrow with a fading rule, serif title with one italic word, optional lede. |
| `SectionIndicator` | "01 ——— 04". Presentational; the fill takes a 0–1 `progress` and animates. |
| `ScrollHint` | A real link to the next section, with a slow traveling highlight. |
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

Skip link; one banner, one main, one contentinfo, and two distinctly labelled navs; a single `h1` and no skipped heading levels; real links and buttons with accessible names; a 2px accent focus ring that always sits on page or surface color; targets of 44px or more; a text alternative for the canvas; `forced-colors` fallback on the button; reduced motion handled in CSS tokens and in a safety net.

## Roadmap

1. A preloader with real progress. The Hero intro starts on mount today; it will need to wait for the preloader.
2. A scroll-driven scene that scrubs `LensParams` and feeds `SectionIndicator`'s `progress`.
3. Entrance choreography for the sections below the Hero.
4. A `useMediaQuery` hook, when something needs one.
5. Open Graph image, analytics, tests.

## Credits

Fonts are self-hosted under the SIL Open Font License; see `src/assets/fonts/LICENSES.md`. The reference analysis, including what could and could not be verified, is in `docs/reference-analysis.md`.
