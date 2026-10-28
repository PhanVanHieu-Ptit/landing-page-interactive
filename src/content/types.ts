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
