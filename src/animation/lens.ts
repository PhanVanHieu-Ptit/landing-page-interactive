import { readToken } from './canvas'

/*
 * A front-on cinema lens, drawn procedurally with the Canvas 2D API: no
 * photographs, no pre-rendered frames. Everything is expressed relative to the
 * barrel radius, so it scales to any size, and `LensParams` exposes the
 * handful of values a scroll-driven scene can animate later.
 *
 * Layers, back to front: barrel, grip ring, aperture scale, bezel, glass
 * (with the iris deep inside), rim light.
 */

const TAU = Math.PI * 2
const BLACK = '#000000'

export interface LensPalette {
  charcoal950: string
  charcoal900: string
  charcoal850: string
  charcoal800: string
  charcoal700: string
  ivory100: string
  ivory300: string
  ivory500: string
  amber400: string
  amber500: string
  steel300: string
  fontMono: string
}

export interface LensParams {
  /** 0 = stopped down (T16), 1 = wide open (T1.4). */
  irisOpen: number
  /** Rotation of the engraved aperture scale, in radians. */
  ringRotation: number
  /** Direction the key light comes from, in radians clockwise from +x. Default: upper left. */
  lightAngle: number
  /** Camera distance: 1 fits the lens to the canvas, 2 shows half of it at twice the size. */
  zoom: number
  /** Which point of the lens sits at the center of the canvas, in lens radii from its center. (0, -1) centers its top edge. */
  panX: number
  panY: number
  /** 0 = body in shadow with only the rim light left (a silhouette), 1 = fully lit. */
  exposure: number
  /** Multiplier on the rim light's strength; above 1 it reads as a strong edge light. */
  rimStrength: number
}

export const DEFAULT_LENS_PARAMS: LensParams = {
  irisOpen: 0.62,
  ringRotation: 0,
  lightAngle: (-3 * Math.PI) / 4,
  zoom: 1,
  panX: 0,
  panY: 0,
  exposure: 1,
  rimStrength: 1,
}

/** Reads the palette from the design tokens on `element`, so the artwork never drifts from the stylesheet. */
export function readLensPalette(element: Element): LensPalette {
  const token = (name: `--${string}`) => readToken(element, name)
  return {
    charcoal950: token('--charcoal-950'),
    charcoal900: token('--charcoal-900'),
    charcoal850: token('--charcoal-850'),
    charcoal800: token('--charcoal-800'),
    charcoal700: token('--charcoal-700'),
    ivory100: token('--ivory-100'),
    ivory300: token('--ivory-300'),
    ivory500: token('--ivory-500'),
    amber400: token('--amber-400'),
    amber500: token('--amber-500'),
    steel300: token('--steel-300'),
    fontMono: token('--font-mono'),
  }
}

/**
 * Draws the lens centered in a `width` × `height` canvas. The context must
 * already be scaled to CSS pixels (see `fitCanvas`).
 */
export function drawLens(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: LensPalette,
  params: LensParams = DEFAULT_LENS_PARAMS,
): void {
  const dpr = ctx.getTransform().a
  ctx.clearRect(0, 0, width, height)
  ctx.save()

  // Zoom scales the radius, not the context: every size below is a fraction of it, while `shadowBlur` ignores the transform.
  const radius = Math.min(width, height) * 0.46 * params.zoom
  ctx.translate(width / 2 - params.panX * radius, height / 2 - params.panY * radius)

  const scene: Scene = { ctx, radius, palette, params, dpr }
  drawBarrel(scene)
  drawGripRing(scene)
  drawScaleRing(scene)
  drawBezel(scene)
  drawGlass(scene)
  drawShadow(scene)
  drawRimLight(scene)

  ctx.restore()
}

interface Scene {
  ctx: CanvasRenderingContext2D
  radius: number
  palette: LensPalette
  params: LensParams
  /** Device pixels per CSS pixel; `shadowBlur` is measured in device pixels. */
  dpr: number
}

/* ── Color helpers ─────────────────────────────────────────────────────── */

type Rgb = readonly [number, number, number]

function parseHex(hex: string): Rgb {
  const digits = hex.replace('#', '')
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((char) => char + char)
          .join('')
      : digits
  const value = Number.parseInt(full, 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex)
  return `rgb(${r} ${g} ${b} / ${alpha})`
}

function mix(from: string, to: string, amount: number): string {
  const [r1, g1, b1] = parseHex(from)
  const [r2, g2, b2] = parseHex(to)
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * amount)
  return `rgb(${lerp(r1, r2)} ${lerp(g1, g2)} ${lerp(b1, b2)})`
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/* ── Path helpers ───────────────────────────────────────────────────────── */

function circlePath(ctx: CanvasRenderingContext2D, radius: number) {
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, TAU)
}

function annulusPath(ctx: CanvasRenderingContext2D, outer: number, inner: number) {
  ctx.beginPath()
  ctx.arc(0, 0, outer, 0, TAU)
  ctx.moveTo(inner, 0)
  ctx.arc(0, 0, inner, 0, TAU, true)
}

function radialLine(ctx: CanvasRenderingContext2D, angle: number, from: number, to: number) {
  ctx.beginPath()
  ctx.moveTo(Math.cos(angle) * from, Math.sin(angle) * from)
  ctx.lineTo(Math.cos(angle) * to, Math.sin(angle) * to)
  ctx.stroke()
}

/** A stroked arc that fades to nothing at both ends, with an optional soft glow. */
function strokeFadingArc(
  ctx: CanvasRenderingContext2D,
  radius: number,
  centerAngle: number,
  halfSpan: number,
  color: string,
  alpha: number,
  width: number,
  glow = 0,
) {
  const start = centerAngle - halfSpan
  const end = centerAngle + halfSpan
  const gradient = ctx.createLinearGradient(
    Math.cos(start) * radius,
    Math.sin(start) * radius,
    Math.cos(end) * radius,
    Math.sin(end) * radius,
  )
  gradient.addColorStop(0, withAlpha(color, 0))
  gradient.addColorStop(0.5, withAlpha(color, alpha))
  gradient.addColorStop(1, withAlpha(color, 0))

  ctx.save()
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.strokeStyle = gradient
  if (glow > 0) {
    ctx.shadowColor = withAlpha(color, alpha)
    ctx.shadowBlur = glow
  }
  ctx.beginPath()
  ctx.arc(0, 0, radius, start, end)
  ctx.stroke()
  ctx.restore()
}

/** Lays text along a circle, upright at the bottom and reading left to right. */
function drawBottomArcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  radius: number,
  fontSize: number,
  font: string,
  color: string,
) {
  ctx.save()
  ctx.font = `500 ${fontSize}px ${font}`
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const characters = Array.from(text)
  const step = (fontSize * 0.72) / radius
  const first = Math.PI / 2 + (step * (characters.length - 1)) / 2
  for (const [index, character] of characters.entries()) {
    ctx.save()
    ctx.rotate(first - index * step - Math.PI / 2)
    ctx.fillText(character, 0, radius)
    ctx.restore()
  }
  ctx.restore()
}

/* ── Layers ─────────────────────────────────────────────────────────────── */

/** Anodized barrel: a brushed-metal sheen around the circumference, brightest on the key-light side. */
function drawBarrel({ ctx, radius: R, palette: p, params }: Scene) {
  const sheen = ctx.createConicGradient(params.lightAngle - 0.14 * TAU, 0, 0)
  sheen.addColorStop(0, mix(p.charcoal700, p.ivory100, 0.1))
  sheen.addColorStop(0.07, mix(p.charcoal700, p.ivory100, 0.3))
  sheen.addColorStop(0.14, mix(p.charcoal700, p.ivory100, 0.62))
  sheen.addColorStop(0.22, mix(p.charcoal800, p.ivory100, 0.16))
  sheen.addColorStop(0.36, p.charcoal900)
  sheen.addColorStop(0.47, p.charcoal950)
  sheen.addColorStop(0.58, p.charcoal800)
  sheen.addColorStop(0.64, mix(p.charcoal800, p.steel300, 0.24))
  sheen.addColorStop(0.71, p.charcoal850)
  sheen.addColorStop(0.86, p.charcoal950)
  sheen.addColorStop(1, mix(p.charcoal700, p.ivory100, 0.1))
  circlePath(ctx, R)
  ctx.fillStyle = sheen
  ctx.fill()

  // Machined edge: catches the light on one side and almost vanishes on the other.
  const dx = Math.cos(params.lightAngle) * R
  const dy = Math.sin(params.lightAngle) * R
  const edge = ctx.createLinearGradient(dx, dy, -dx, -dy)
  edge.addColorStop(0, withAlpha(p.ivory100, 0.55))
  edge.addColorStop(0.5, withAlpha(p.ivory100, 0.08))
  edge.addColorStop(1, withAlpha(p.steel300, 0.22))
  ctx.lineWidth = Math.max(1, R * 0.004)
  ctx.strokeStyle = edge
  circlePath(ctx, R - ctx.lineWidth / 2)
  ctx.stroke()
}

/** Knurled focus grip: radial ridges whose brightness follows the light. */
function drawGripRing({ ctx, radius: R, palette: p, params }: Scene) {
  const outer = R * 0.9
  const inner = R * 0.765

  annulusPath(ctx, outer, inner)
  ctx.fillStyle = p.charcoal950
  ctx.fill()

  const ridges = 144
  ctx.lineWidth = Math.max(0.7, R * 0.003)
  ctx.lineCap = 'butt'
  for (let index = 0; index < ridges; index++) {
    const angle = (index / ridges) * TAU
    const facing = Math.max(0, Math.cos(angle - params.lightAngle))
    ctx.strokeStyle = withAlpha(p.ivory100, 0.05 + 0.3 * facing ** 3)
    radialLine(ctx, angle, inner + R * 0.012, outer - R * 0.012)
  }

  ctx.lineWidth = Math.max(1, R * 0.003)
  ctx.strokeStyle = withAlpha(BLACK, 0.7)
  circlePath(ctx, outer)
  ctx.stroke()
  ctx.strokeStyle = withAlpha(p.ivory100, 0.08)
  circlePath(ctx, inner)
  ctx.stroke()
}

const APERTURE_STOPS = ['1.4', '2', '2.8', '4', '5.6', '8', '11', '16'] as const

/** Engraved aperture scale with a fixed amber index mark and the model line along the bottom. */
function drawScaleRing({ ctx, radius: R, palette: p, params, dpr }: Scene) {
  const outer = R * 0.76
  const inner = R * 0.645

  annulusPath(ctx, outer, inner)
  ctx.fillStyle = p.charcoal900
  ctx.fill()

  const dx = Math.cos(params.lightAngle) * R
  const dy = Math.sin(params.lightAngle) * R
  const sheen = ctx.createLinearGradient(dx, dy, -dx, -dy)
  sheen.addColorStop(0, withAlpha(p.ivory100, 0.1))
  sheen.addColorStop(0.55, withAlpha(p.ivory100, 0))
  sheen.addColorStop(1, withAlpha(p.steel300, 0.05))
  annulusPath(ctx, outer, inner)
  ctx.fillStyle = sheen
  ctx.fill()

  // Index mark: fixed at the top while the scale turns beneath it.
  ctx.save()
  ctx.strokeStyle = p.amber500
  ctx.lineWidth = Math.max(1.5, R * 0.006)
  ctx.lineCap = 'round'
  ctx.shadowColor = withAlpha(p.amber500, 0.6)
  ctx.shadowBlur = 6 * dpr
  radialLine(ctx, -Math.PI / 2, outer - R * 0.008, outer - R * 0.055)
  ctx.restore()

  const span = (260 / 180) * Math.PI
  const step = span / (APERTURE_STOPS.length - 1)
  const first = -Math.PI / 2 - span / 2 + params.ringRotation
  const labelRadius = inner + (outer - inner) * 0.3

  ctx.save()
  ctx.font = `500 ${Math.max(8, R * 0.05)}px ${p.fontMono}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineCap = 'butt'
  for (const [index, label] of APERTURE_STOPS.entries()) {
    const angle = first + index * step

    ctx.strokeStyle = withAlpha(p.ivory300, 0.9)
    ctx.lineWidth = Math.max(1, R * 0.0035)
    radialLine(ctx, angle, outer - R * 0.014, outer - R * 0.05)

    if (index < APERTURE_STOPS.length - 1) {
      ctx.strokeStyle = withAlpha(p.ivory500, 0.9)
      ctx.lineWidth = Math.max(0.8, R * 0.0025)
      for (const third of [1, 2]) {
        radialLine(ctx, angle + (step * third) / 3, outer - R * 0.014, outer - R * 0.032)
      }
    }

    ctx.save()
    ctx.rotate(angle + Math.PI / 2)
    ctx.fillStyle = withAlpha(p.ivory300, 0.92)
    ctx.fillText(label, 0, -labelRadius)
    ctx.restore()
  }
  ctx.restore()

  drawBottomArcText(ctx, 'AURELLE · 50 MM · T1.4', labelRadius, Math.max(7, R * 0.042), p.fontMono, withAlpha(p.ivory500, 0.85))
}

/** Front retaining ring: a narrow machined chamfer with one fine amber groove. */
function drawBezel({ ctx, radius: R, palette: p, params }: Scene) {
  const outer = R * 0.645
  const inner = R * 0.585

  const sheen = ctx.createConicGradient(params.lightAngle - 0.12 * TAU, 0, 0)
  sheen.addColorStop(0, mix(p.charcoal800, p.ivory100, 0.12))
  sheen.addColorStop(0.12, mix(p.charcoal700, p.ivory100, 0.7))
  sheen.addColorStop(0.22, p.charcoal800)
  sheen.addColorStop(0.4, p.charcoal950)
  sheen.addColorStop(0.55, p.charcoal850)
  sheen.addColorStop(0.62, mix(p.charcoal850, p.steel300, 0.3))
  sheen.addColorStop(0.72, p.charcoal900)
  sheen.addColorStop(0.88, p.charcoal950)
  sheen.addColorStop(1, mix(p.charcoal800, p.ivory100, 0.12))
  annulusPath(ctx, outer, inner)
  ctx.fillStyle = sheen
  ctx.fill()

  const hairline = Math.max(1, R * 0.003)
  ctx.lineWidth = hairline
  ctx.strokeStyle = withAlpha(BLACK, 0.7)
  circlePath(ctx, outer)
  ctx.stroke()
  ctx.strokeStyle = withAlpha(p.ivory100, 0.14)
  circlePath(ctx, outer - hairline)
  ctx.stroke()

  ctx.lineWidth = hairline * 2
  ctx.strokeStyle = withAlpha(BLACK, 0.85)
  circlePath(ctx, inner + hairline)
  ctx.stroke()

  ctx.lineWidth = Math.max(1, R * 0.0035)
  ctx.strokeStyle = withAlpha(p.amber500, 0.55)
  circlePath(ctx, R * 0.612)
  ctx.stroke()
}

/** Front element: deep glass, the iris seen far inside, and coating glints on both sides of the light. */
function drawGlass(scene: Scene) {
  const { ctx, radius: R, palette: p, params } = scene
  const glass = R * 0.585
  const lx = Math.cos(params.lightAngle)
  const ly = Math.sin(params.lightAngle)

  ctx.save()
  circlePath(ctx, glass)
  ctx.clip()

  // A blue-black base that lifts slightly toward the key light.
  const base = ctx.createRadialGradient(lx * glass * 0.14, ly * glass * 0.14, 0, 0, 0, glass)
  base.addColorStop(0, mix(p.charcoal950, p.steel300, 0.12))
  base.addColorStop(0.6, mix(p.charcoal950, p.steel300, 0.05))
  base.addColorStop(1, mix(p.charcoal950, BLACK, 0.8))
  ctx.fillStyle = base
  ctx.fillRect(-glass, -glass, glass * 2, glass * 2)

  // Element edges seen through the front glass.
  annulusPath(ctx, glass * 0.88, glass * 0.74)
  ctx.fillStyle = withAlpha(p.steel300, 0.035)
  ctx.fill()
  ctx.lineWidth = Math.max(1, R * 0.0028)
  for (const [index, factor] of ([0.88, 0.74, 0.58, 0.42] as const).entries()) {
    ctx.strokeStyle = withAlpha(p.ivory100, index === 0 ? 0.11 : 0.06)
    circlePath(ctx, glass * factor)
    ctx.stroke()
  }

  drawIris(scene, glass)

  // Coating glints: amber toward the light, cool steel on the far side.
  const glint = (factor: number, offset: number, halfSpan: number, color: string, alpha: number, width: number) =>
    strokeFadingArc(ctx, glass * factor, params.lightAngle + offset, halfSpan, color, alpha, glass * width, glass * width * 2.2 * scene.dpr)
  glint(0.84, 0, 0.95, p.amber500, 0.55, 0.05)
  glint(0.7, 0.25, 0.7, p.amber400, 0.3, 0.03)
  glint(0.55, Math.PI, 0.7, p.steel300, 0.35, 0.035)
  glint(0.8, Math.PI + 0.3, 0.5, p.steel300, 0.2, 0.02)

  // Soft bloom and a small specular hotspot on the lit side.
  const bloom = ctx.createRadialGradient(lx * glass * 0.34, ly * glass * 0.34, 0, lx * glass * 0.34, ly * glass * 0.34, glass * 0.6)
  bloom.addColorStop(0, withAlpha(p.ivory100, 0.16))
  bloom.addColorStop(1, withAlpha(p.ivory100, 0))
  ctx.fillStyle = bloom
  ctx.fillRect(-glass, -glass, glass * 2, glass * 2)

  const hotspot = ctx.createRadialGradient(lx * glass * 0.6, ly * glass * 0.6, 0, lx * glass * 0.6, ly * glass * 0.6, glass * 0.07)
  hotspot.addColorStop(0, withAlpha(p.ivory100, 0.5))
  hotspot.addColorStop(1, withAlpha(p.ivory100, 0))
  ctx.fillStyle = hotspot
  ctx.fillRect(-glass, -glass, glass * 2, glass * 2)

  // Edge falloff, so the glass reads as a dome.
  const vignette = ctx.createRadialGradient(0, 0, glass * 0.62, 0, 0, glass)
  vignette.addColorStop(0, withAlpha(BLACK, 0))
  vignette.addColorStop(1, withAlpha(BLACK, 0.6))
  ctx.fillStyle = vignette
  ctx.fillRect(-glass, -glass, glass * 2, glass * 2)

  ctx.restore()
}

/** Fifteen blades around a polygonal aperture, drawn dim: it sits deep behind the front element. */
function drawIris({ ctx, palette: p, params }: Scene, glass: number) {
  const blades = 15
  const aperture = glass * (0.09 + 0.25 * clamp01(params.irisOpen))
  const reach = glass * 0.4
  const twist = params.ringRotation * 0.5 + 0.2

  const tunnel = ctx.createRadialGradient(0, 0, aperture * 0.5, 0, 0, reach)
  tunnel.addColorStop(0, withAlpha(BLACK, 0.95))
  tunnel.addColorStop(1, withAlpha(BLACK, 0))
  circlePath(ctx, reach)
  ctx.fillStyle = tunnel
  ctx.fill()

  ctx.lineWidth = Math.max(0.8, glass * 0.004)
  ctx.strokeStyle = withAlpha(p.ivory100, 0.1)
  for (let index = 0; index < blades; index++) {
    const from = twist + (index / blades) * TAU
    const to = from + 0.62
    ctx.beginPath()
    ctx.moveTo(Math.cos(from) * aperture, Math.sin(from) * aperture)
    ctx.lineTo(Math.cos(to) * reach, Math.sin(to) * reach)
    ctx.stroke()
  }

  ctx.beginPath()
  for (let index = 0; index < blades; index++) {
    const angle = twist + (index / blades) * TAU
    const x = Math.cos(angle) * aperture
    const y = Math.sin(angle) * aperture
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.closePath()
  ctx.fillStyle = BLACK
  ctx.fill()
  ctx.strokeStyle = withAlpha(p.ivory100, 0.22)
  ctx.stroke()
}

/** Lowers the exposure: a black veil over the whole body, so only the rim light drawn after it survives. */
function drawShadow({ ctx, radius: R, params }: Scene) {
  const veil = 1 - clamp01(params.exposure)
  if (veil <= 0) return
  circlePath(ctx, R)
  ctx.fillStyle = withAlpha(BLACK, veil)
  ctx.fill()
}

/** Cinematic edge lighting: a warm highlight on the key side, a cool one opposite. */
function drawRimLight({ ctx, radius: R, palette: p, params, dpr }: Scene) {
  const radius = R - 0.5
  const strength = Math.max(0, params.rimStrength)
  const alpha = (base: number) => clamp01(base * strength)
  strokeFadingArc(ctx, radius, params.lightAngle, 0.6, p.ivory100, alpha(0.9), Math.max(1.2, R * 0.005) * strength, 4 * dpr * strength)
  strokeFadingArc(ctx, radius, params.lightAngle + Math.PI, 0.45, p.steel300, alpha(0.5), Math.max(1, R * 0.004) * strength, 3 * dpr * strength)
}
