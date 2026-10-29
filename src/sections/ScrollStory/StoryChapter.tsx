import type { ReactNode, Ref } from 'react'
import { cx } from '@/lib/cx'
import styles from './StoryChapter.module.css'

interface StoryChapterProps {
  /** The story writes `--chapter-presence` and `--chapter-shift` on this element, once per frame, without rendering. */
  ref: Ref<HTMLLIElement>
  /** Whether this is the chapter whose turn it is. Discrete, so it is safe to render from. */
  active: boolean
  className?: string | undefined
  children: ReactNode
}

/**
 * One chapter's slot on the stage. All chapters share a single grid cell, so
 * they never push each other around; each is only as visible as the story says
 * (opacity) and sits as far from its resting place (translate). Both are
 * compositor-only properties, so a frame of motion costs no layout.
 */
export function StoryChapter({ ref, active, className, children }: StoryChapterProps) {
  return (
    <li ref={ref} className={cx(styles.chapter, className)} aria-current={active ? 'step' : undefined}>
      {children}
    </li>
  )
}
