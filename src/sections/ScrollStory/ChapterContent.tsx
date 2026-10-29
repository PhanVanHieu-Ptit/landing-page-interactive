import { PrimaryButton } from '@/components/ui'
import type { StoryChapterCopy } from '@/content/types'
import { cx } from '@/lib/cx'
import { renderEmphasis } from '@/lib/emphasis'
import styles from './ChapterContent.module.css'

interface ChapterContentProps {
  copy: StoryChapterCopy
  /** 1-based position and the total, spoken and shown as "01 / 05". */
  position: number
  total: number
  /** False while the chapter is out of turn: its call to action is invisible, so it must not be reachable either. */
  interactive: boolean
}

const pad = (value: number) => String(value).padStart(2, '0')

/** The words of one chapter. Purely presentational: how it appears and disappears is the shell's business. */
export function ChapterContent({ copy, position, total, interactive }: ChapterContentProps) {
  const { label, title, body, facts, cta } = copy

  return (
    <div className={styles.content}>
      <p className={cx(styles.eyebrow, 'type-eyebrow')}>
        <span className={styles.position}>
          {pad(position)}
          <span className="visually-hidden"> of {pad(total)}</span>
        </span>
        <span className={styles.rule} aria-hidden="true" />
        <span>{label}</span>
      </p>
      <h3 className={cx(styles.title, 'type-title')}>{renderEmphasis(title)}</h3>
      <p className={cx(styles.body, 'type-body')}>{body}</p>

      {facts && facts.length > 0 ? (
        <ul className={styles.facts}>
          {facts.map((fact) => (
            <li key={fact} className="type-eyebrow">
              {fact}
            </li>
          ))}
        </ul>
      ) : null}

      {cta ? (
        <div className={styles.cta} inert={!interactive}>
          <PrimaryButton href={cta.href}>{cta.label}</PrimaryButton>
        </div>
      ) : null}
    </div>
  )
}
