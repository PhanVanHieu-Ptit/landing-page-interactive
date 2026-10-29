import { createContext, useContext } from 'react'
import { OPEN_GATE, type IntroGate } from '@/animation/intro-gate'

/**
 * The page-level latch that the preloader opens when it hands over. The default
 * is an open gate, so a section rendered on its own plays its entrance at once.
 */
export const IntroGateContext = createContext<IntroGate>(OPEN_GATE)

export function useIntroGate(): IntroGate {
  return useContext(IntroGateContext)
}
