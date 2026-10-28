# Reference analysis: Scrolltide "Ora"

Reference: https://www.scrolltide.co/#t-ora (inspected 2026-10-28).

## How it was inspected

No browser tool was available. Everything here comes from static analysis of public responses: the page HTML, CSS and JavaScript text, the template's public listing metadata, and one poster image.

**Nothing about scroll feel, motion, timing or real responsive behavior was observed.** Those are not claimed anywhere in this project.

## What `#t-ora` is

It is not an element id on scrolltide.co. "Ora" is one card in the site's template library, a "Premium" template in the "Landing Page" category, linking to `/templates/ora`. Its public listing reads:

> A Geneva watch storefront built on a scroll-scrubbed canvas: 240 decoded WebP frames taken apart chapter by chapter behind a real-progress preloader, with no animation library anywhere in the dependency list.

Tags: landing, canvas, scrub, luxury, editorial, dark, react, vite.

The prompt and source are paywalled and there is no live demo, so the template itself could not be inspected.

## What was verified

**Ora poster frame (one image, not the live page).** A near-black navy field with a full-bleed product. A giant all-caps Didone serif headline in warm ivory. Tracked-caps labels. An ivory block CTA with a thin arrow. A centered, letterspaced wordmark. A "01 ——— 04" chapter indicator and a "SCROLL" cue.

**The host site (scrolltide.co).**
- Next.js with Tailwind-style CSS. Fonts: Bricolage Grotesque, Inter, Space Mono.
- Dark tokens: ink `#07080a`, surface `#101318`, bone `#f3f5f8`, mist `#9aa2ad`, a hairline at about 8% white, and a `#46b7ff` accent.
- Breakpoints at 40, 48, 64 and 80rem. An `--ease-out-quint` easing token: `cubic-bezier(.22, 1, .36, 1)`.
- `prefers-reduced-motion` is honored, and hover effects are gated behind `(hover: hover)`.
- Semantic structure: header, nav, main, section, footer, one h1. About 105 muted, looping preview videos on the homepage.
- Of 13 homepage JavaScript chunks scanned: native IntersectionObserver, ResizeObserver and requestAnimationFrame, plus one raw-WebGL chunk. No GSAP, Lenis, Framer Motion or Three.js signatures. This is a string scan and says nothing about what the code does.

## Not verified

Scroll feel and any smoothing; easing in motion; transitions; the preloader's look and timing; real responsive layouts; and Ora's actual layout, typography, colors, copy and code.

## How it informed Aurelle, and what was not copied

Taken as ideas: a dark editorial register; a full-bleed hero product; a chapter indicator and a scroll cue; reduced motion and hover gating handled properly; a canvas-based product scene with no animation library.

Not reused: the name, copy, imagery, code, typefaces (Aurelle pairs Instrument Serif, Inter and JetBrains Mono), palette (warm amber on charcoal, not navy), product category (a cinema lens, not a watch), or composition. The hero art is drawn procedurally and is original to this project.

## Open question for the scroll phase

Ora scrubs a pre-rendered 240-frame image sequence. Aurelle's renderer is parametric (`LensParams`), so the scroll phase can animate parameters directly. Whether that is enough, or a frame sequence is wanted, is a decision for that phase.
