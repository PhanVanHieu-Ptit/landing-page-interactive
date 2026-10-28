import { SiteFooter, SiteHeader, SkipLink } from '@/components/layout'
import { Anatomy, Hero, Reserve, Specifications } from '@/sections'

export function App() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Anatomy />
        <Specifications />
        <Reserve />
      </main>
      <SiteFooter />
    </>
  )
}
