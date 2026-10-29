export interface NavItem {
  readonly label: string
  readonly href: string
}

export interface Chapter {
  readonly id: string
  readonly index: string
  readonly title: string
  readonly body: string
  readonly fact: string
}

/** One chapter of the scroll story. Its `id` matches an entry in `animation/story-config.ts`, which owns the timing. */
export interface StoryChapterCopy {
  readonly id: string
  /** Short name, shown as the eyebrow and on the progress rail. */
  readonly label: string
  /** Wrap the one emphasized word in asterisks, as in `SectionCopy`. */
  readonly title: string
  readonly body: string
  readonly facts?: readonly string[]
  readonly cta?: NavItem
}

export interface Spec {
  readonly label: string
  readonly value: string
}

/** Copy for a section heading. Wrap the one emphasized word in asterisks: "Taken apart, *one chapter* at a time." */
export interface SectionCopy {
  readonly index: string
  readonly eyebrow: string
  readonly title: string
  readonly lede: string
}
