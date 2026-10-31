import type { SequenceFallback } from '../imageSequence.types'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

/** Breaks `text` into at most `maxLines` lines no wider than `maxWidth`, ending the last one with an ellipsis if it had to cut. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const candidate = line === '' ? word : `${line} ${word}`
    if (line !== '' && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = word
      if (lines.length === maxLines) break
    } else {
      line = candidate
    }
  }
  if (lines.length < maxLines) lines.push(line)
  const clipped = lines.join(' ').length < text.trim().length
  const last = lines.length - 1
  if (clipped && last >= 0) lines[last] = `${lines[last]}…`
  return lines
}

/**
 * Stand-in artwork for a sequence whose frames could not be loaded. It is
 * procedural (no image files) and is a scrub test as much as a placeholder: the
 * hue follows progress, and the large number is the frame the real sequence
 * would be showing, so you can see the scroll mapping work before any art
 * exists. It stamps `drawFallbackBadge` over itself, so it can never pass for
 * the real sequence. Only development uses it (`CanvasSequence` falls back to
 * nothing in a production build), so a production bundle carries neither.
 */
export const devFallback: SequenceFallback = (ctx, { width, height, progress, frameIndex, frameCount, error }) => {
  const hue = Math.round(progress * 300)
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, `hsl(${hue} 50% 20%)`)
  gradient.addColorStop(1, `hsl(${(hue + 70) % 360} 55% 8%)`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  const unit = Math.min(width, height)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
  ctx.font = `600 ${Math.round(unit * 0.2)}px ${MONO}`
  ctx.fillText(String(frameIndex + 1).padStart(String(frameCount).length, '0'), width / 2, height * 0.46)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.font = `${Math.round(Math.max(12, unit * 0.04))}px ${MONO}`
  ctx.fillText(`of ${frameCount}`, width / 2, height * 0.46 + unit * 0.15)

  const barWidth = Math.min(width * 0.6, 480)
  const barX = (width - barWidth) / 2
  const barY = height * 0.78
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
  ctx.fillRect(barX, barY, barWidth, 4)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.fillRect(barX, barY, barWidth * progress, 4)

  const note = `${error ?? 'No frames were loaded.'} Expected frame-0001.webp to frame-${String(frameCount).padStart(4, '0')}.webp: see src/image-sequence/README.md.`
  const noteSize = Math.round(Math.max(11, Math.min(14, unit * 0.028)))
  ctx.font = `${noteSize}px ${MONO}`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  const lines = wrapText(ctx, note, Math.min(width - 32, 640), 4)
  for (const [index, line] of lines.entries()) ctx.fillText(line, width / 2, barY + 28 + index * (noteSize + 5))

  drawFallbackBadge(ctx)
}

/**
 * A loud badge in the top-left corner, drawn over `devFallback` so a stand-in
 * can never pass for the real thing. The context is expected to be scaled to
 * CSS pixels.
 */
export function drawFallbackBadge(ctx: CanvasRenderingContext2D): void {
  const text = 'DEV FALLBACK · NO FRAMES'
  ctx.font = `700 12px ${MONO}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const paddingX = 10
  const boxHeight = 26
  const boxWidth = ctx.measureText(text).width + paddingX * 2
  ctx.fillStyle = '#ff2d95'
  ctx.fillRect(16, 16, boxWidth, boxHeight)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, 16 + paddingX, 16 + boxHeight / 2 + 1)
}
