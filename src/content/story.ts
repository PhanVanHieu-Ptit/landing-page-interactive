import type { StoryChapterCopy } from './types'

export const storyCopy = {
  /** Section number in the page's indicator. */
  index: '02',
  /** The story's heading. Visually hidden: the chapters carry the visible type. */
  title: 'The Aurelle 50, in five chapters',
} as const

/** The order and `id`s must match `STORY_TIMING` in `animation/story-config.ts`. */
export const storyChapters: readonly StoryChapterCopy[] = [
  {
    id: 'introduction',
    label: 'Introduction',
    title: 'Meet the *Aurelle 50.*',
    body: 'A 50 mm T1.4 cinema prime, assembled by hand in a numbered run of 250. Every frame it will ever make begins here, in the dark.',
    facts: ['50 mm · T1.4'],
  },
  {
    id: 'design',
    label: 'Design',
    title: 'A form drawn by *light.*',
    body: 'No badge to hide behind: one circle, one barrel, and edges machined to catch a single source and hold it. The silhouette is the design.',
    facts: ['Single billet · 1.1 kg'],
  },
  {
    id: 'craftsmanship',
    label: 'Craftsmanship',
    title: 'Engraved, never *printed.*',
    body: 'Every stop on the aperture scale is cut into the ring, and the amber index is the only color on the barrel. Witness marks sit where a puller’s fingers will find them.',
    facts: ['Engraved scale', '300° throw · geared'],
  },
  {
    id: 'innovation',
    label: 'Innovation',
    title: 'Fifteen blades, *one circle.*',
    body: 'The iris holds a true circle from T1.4 to T16, and eleven elements in nine groups turn flare into a soft amber bloom instead of a veil.',
    facts: ['15 blades · T1.4 – T16', '11 elements · 9 groups'],
  },
  {
    id: 'reveal',
    label: 'The reveal',
    title: 'Ready for its *first frame.*',
    body: 'Eleven elements, fifteen blades, one billet. Assembled by hand, numbered, and limited to a first run of 250.',
    cta: { label: 'Reserve a lens', href: '#reserve' },
  },
]
