import type { Chapter, SectionCopy } from './types'

export const anatomyCopy: SectionCopy = {
  index: '03',
  eyebrow: 'Anatomy',
  title: 'Taken apart, *one chapter* at a time.',
  lede: 'Four chapters, front to back: what the light meets first, and what each part does with it.',
}

export const chapters: readonly Chapter[] = [
  {
    id: 'glass',
    index: 'I',
    title: 'Glass',
    body: 'Eleven elements in nine groups, each ground and coated in-house. Flare resolves into a soft amber bloom instead of a veil.',
    fact: '11 elements · 9 groups',
  },
  {
    id: 'iris',
    index: 'II',
    title: 'Iris',
    body: 'Fifteen rounded blades hold a true circle from T1.4 to T16, so out-of-focus highlights stay round and calm.',
    fact: '15 blades · T1.4 – T16',
  },
  {
    id: 'barrel',
    index: 'III',
    title: 'Barrel',
    body: 'Turned from a single billet of aerospace aluminum, bead-blasted, then hard-anodized. It weighs what a lens should: just enough.',
    fact: 'Single billet · 1.1 kg',
  },
  {
    id: 'motion',
    index: 'IV',
    title: 'Motion',
    body: 'A 300° focus throw on a geared helicoid, with witness marks engraved for the pullers who never look at the monitor.',
    fact: '300° throw · geared',
  },
]
