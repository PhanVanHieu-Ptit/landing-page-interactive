import type { NavItem } from './types'

/** "Aurelle" is a fictional placeholder brand. Check trademarks before using it for real. */
export const site = {
  name: 'Aurelle',
  product: 'The Aurelle 50',
  tagline: 'Light, taken apart.',
  description:
    'The Aurelle 50 is a hand-assembled 50 mm T1.4 cinema prime: eleven elements, fifteen iris blades and one machined barrel.',
  email: 'hello@aurelle.example',
  year: 2026,
  disclaimer: 'Aurelle is a fictional brand created for this demonstration.',
} as const

export const navItems: readonly NavItem[] = [
  { label: 'Anatomy', href: '#anatomy' },
  { label: 'Specifications', href: '#specifications' },
]

export const headerCta: NavItem = { label: 'Reserve', href: '#reserve' }

export const footerItems: readonly NavItem[] = [...navItems, headerCta]

export const hero = {
  eyebrow: 'Cinema prime · 50 mm T1.4',
  title: 'Every frame begins in *glass.*',
  lede: 'Eleven elements, fifteen iris blades and a barrel machined from a single billet. Assembled by hand, one lens at a time.',
  cta: { label: 'Reserve a lens', href: '#reserve' },
  scrollTo: { href: '#story', destination: 'the story' },
  /** Hero, Story, Anatomy, Specifications, Reserve: what the section indicator counts. */
  sectionCount: 5,
} as const

export const reserve = {
  index: '05',
  eyebrow: 'First run',
  title: 'First run of *250.*',
  body: 'Reservations are open for the first numbered run. No deposit is taken until your serial number is confirmed.',
  cta: {
    label: 'Reserve a lens',
    href: `mailto:${site.email}?subject=${encodeURIComponent('Reserve an Aurelle 50')}`,
  },
} as const
