/*
 * Keeping the reader's place in the story when the layout changes under them.
 *
 * The story's position is a scroll offset, but what the reader has is a place in
 * the story: "halfway through the macro chapter". Rotate a phone, or resize a
 * window, and the track's height changes (it is measured in viewport heights),
 * so the same pixel offset is suddenly a different place: a rotation mid-story
 * can land the reader chapters away. These two functions say when to carry the
 * place across and where to scroll to, so the controller can do it.
 *
 * It is the one place the page writes the scroll position itself, and only when
 * the layout has just changed under a reader who is partway through. Scrolling,
 * flicking and jumping stay entirely the browser's.
 */

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** True partway through the story. At either end there is nothing to preserve: the story starts, or has let go, and the page's own scroll position is already right. */
export function isMidStory(progress: number): boolean {
  return progress > 0 && progress < 1
}

/**
 * Whether a re-measure moved the story enough to carry the reader's place. The
 * distance must have changed (a mere shift of the track, a font arriving
 * above it, is the browser's scroll anchoring to handle), and by more than a
 * pixel of rounding.
 */
export function shouldCarryProgress(previousDistance: number, distance: number, progress: number): boolean {
  return Math.abs(distance - previousDistance) > 1 && isMidStory(progress)
}

/**
 * The scroll offset at which the story, whose track starts `trackTop` pixels
 * down the page and pins for `distance` pixels, shows `progress`. The inverse
 * of how the controller reads progress from the scroll position.
 */
export function scrollTopForProgress(trackTop: number, distance: number, progress: number): number {
  return Math.round(trackTop + clamp01(progress) * Math.max(0, distance))
}
