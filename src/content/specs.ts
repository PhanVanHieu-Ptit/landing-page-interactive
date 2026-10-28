import type { SectionCopy, Spec } from './types'

export const specsCopy: SectionCopy = {
  index: '03',
  eyebrow: 'Specifications',
  title: 'The *numbers,* plainly.',
  lede: 'Everything the Aurelle 50 promises, and nothing it does not.',
}

export const specs: readonly Spec[] = [
  { label: 'Focal length', value: '50 mm' },
  { label: 'Aperture', value: 'T1.4 – T16' },
  { label: 'Elements / groups', value: '11 / 9' },
  { label: 'Iris', value: '15 blades' },
  { label: 'Image circle', value: 'Ø 46.5 mm' },
  { label: 'Mount', value: 'PL, swappable' },
  { label: 'Weight', value: '1.1 kg' },
  { label: 'Close focus', value: '0.45 m' },
]
