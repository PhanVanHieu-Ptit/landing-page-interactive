import { useSyncExternalStore } from 'react'
import type { StoryController } from '@/animation/story-controller'

/**
 * Index of the chapter whose turn it is. The story's scroll progress never
 * reaches React (it would mean a render per frame); only this discrete value
 * does, and it changes a handful of times per pass. Use it for what is truly
 * discrete: `inert`, `aria-current`, a label.
 */
export function useActiveChapter(controller: StoryController): number {
  return useSyncExternalStore(controller.subscribe, controller.getActive, controller.getActive)
}
