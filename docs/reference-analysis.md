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

## Re-check at the final review (2026-10-30)

The final pass asked for a comparison against the reference "only where the reference can be directly inspected". I fetched `https://www.scrolltide.co/templates/ora` again. It returned the same public listing text as before and nothing more: the title, the "Premium / Landing Page" tags, the one-sentence description quoted above, the tag list, a pricing banner, a notice that the full prompt is locked, three related templates and the site navigation. There is **no live demo link, no screenshot or video of the template, no palette, no font names, no layout description and no code** in what could be fetched, and the preloader and scroll behavior are described in words only.

So the only things that can be compared with the reference are the claims in its listing, and only as claims:

| The listing says | What the Aurelle page does | Compared how |
| --- | --- | --- |
| A scroll-scrubbed canvas | The story scrubs a canvas from scroll progress. By default the canvas draws a procedural lens, not a decoded image sequence | Behavior of this page was measured; the reference's was not observed |
| 240 decoded WebP frames, taken apart chapter by chapter | The engine supports a 240-frame WebP sequence mapped to five chapters, but **this repo ships no frames**, so the live page does not play one | Code and a generated-frame run; no real art |
| A real-progress preloader | A loading screen whose percentage is the share of what it waits for that actually arrived (webfonts today, frames when the sequence is on); nothing is simulated | Measured here; the reference's was not seen |
| No animation library in the dependency list | None here either: React, native Canvas, Web Animations, CSS, `IntersectionObserver` and `requestAnimationFrame` | `package.json` |

What was **not** compared, and is therefore not claimed: typography, color, spacing, easing, timing, transitions, responsive behavior, scroll feel and the look of the preloader. The earlier analysis of the poster frame (a near-black field, a large high-contrast serif, tracked caps labels, an ivory block call to action, a chapter indicator and a scroll cue) stands as a description of one still image. The Aurelle page shares that general register by design and shares no assets, copy, code, name, palette or composition with it (see "What was not copied" above). Nothing here says the two look or feel alike.
