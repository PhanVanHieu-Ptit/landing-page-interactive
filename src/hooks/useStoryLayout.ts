import { useSyncExternalStore } from 'react'
import { LAYOUT_QUERIES, resolveStoryLayout, type StoryLayout } from '@/animation/story-layout'

const queries = Object.values(LAYOUT_QUERIES)

function subscribe(onChange: () => void) {
  const lists = queries.map((query) => window.matchMedia(query))
  for (const list of lists) list.addEventListener('change', onChange)
  return () => {
    for (const list of lists) list.removeEventListener('change', onChange)
  }
}

function getSnapshot(): StoryLayout {
  return resolveStoryLayout({
    wide: window.matchMedia(LAYOUT_QUERIES.wide).matches,
    tall: window.matchMedia(LAYOUT_QUERIES.tall).matches,
    landscape: window.matchMedia(LAYOUT_QUERIES.landscape).matches,
  })
}

/**
 * Which composition the page is in right now (see `animation/story-layout.ts`),
 * live: it changes when the window is resized or the device rotated. It is one
 * subscription to all three queries, not three `useMediaQuery` calls, because a
 * rotation flips several at once and separate subscriptions could render in
 * between: a layout that is neither the one before nor the one after, and a
 * story rebuilt for nothing. Here every change re-reads all three, so the first
 * notification already sees the final answer.
 */
export function useStoryLayout(): StoryLayout {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'stacked')
}
