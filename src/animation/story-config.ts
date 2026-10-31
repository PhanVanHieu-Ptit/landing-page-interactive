import type { StoryChapterSpec } from './story-timeline'

/*
 * The story's tuning knobs, in one place: when each chapter owns the scroll
 * and where the lens is while it does. Ranges are fractions of the story's
 * scroll distance (0 = the stage pins, 1 = it lets go). The copy lives in
 * `src/content/story.ts`, matched to these entries by `id`.
 *
 * Reading a pose: `zoom` 1 fits the lens to the stage; the resting lens sits
 * at 0.74 so there is room for copy and the header. `pan` names the point of the lens that
 * lands at the center of the stage, in lens radii (0, -0.7 is the aperture
 * scale at twelve o'clock). Angles are radians, clockwise from +x.
 */

const REST_ZOOM = 0.74
const UPPER_LEFT = (-3 * Math.PI) / 4
const LOWER_RIGHT = Math.PI / 4

export const STORY_TIMING: readonly StoryChapterSpec[] = [
  {
    // Reveal: the lens comes up out of the dark, its iris opening as the light finds it.
    id: 'introduction',
    range: [0, 0.2],
    pose: {
      in: { zoom: 0.62, exposure: 0.22, irisOpen: 0.15, ringRotation: -0.6 },
      out: { zoom: REST_ZOOM },
    },
  },
  {
    // Silhouette: the body falls into shadow and a strong edge light walks over the top and down the right side.
    id: 'design',
    range: [0.2, 0.4],
    pose: {
      in: { zoom: 0.76, exposure: 0.14, rimStrength: 2.4, lightAngle: UPPER_LEFT },
      out: { zoom: 0.76, exposure: 0.14, rimStrength: 2.4, lightAngle: LOWER_RIGHT },
    },
  },
  {
    // Detail: a macro pass along the engraved aperture scale while it turns beneath the amber index.
    id: 'craftsmanship',
    range: [0.4, 0.6],
    pose: {
      in: { zoom: 2.6, panX: -0.2, panY: -0.58, ringRotation: -0.1 },
      out: { zoom: 2.6, panX: 0.2, panY: -0.58, ringRotation: 0.5 },
    },
  },
  {
    // Features: into the glass, with the iris sweeping from T16 to T1.4.
    id: 'innovation',
    range: [0.6, 0.82],
    pose: {
      in: { zoom: 1.7, ringRotation: 0.5, irisOpen: 0 },
      out: { zoom: 1.7, ringRotation: 0.5, irisOpen: 1 },
    },
  },
  {
    // The complete lens, at rest. The chapter's last stretch holds still so the call to action is stable.
    id: 'reveal',
    range: [0.82, 1],
    enter: 0.05,
    pose: { in: { zoom: REST_ZOOM } },
  },
]
