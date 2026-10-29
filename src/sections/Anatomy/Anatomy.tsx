import { Container } from '@/components/layout'
import { SectionHeading } from '@/components/ui'
import { anatomyCopy, chapters } from '@/content/chapters'
import { cx } from '@/lib/cx'
import { cssVars } from '@/lib/css-vars'
import styles from './Anatomy.module.css'

/** The lens in four chapters: an editorial list, one row per part. */
export function Anatomy() {
  return (
    <section id="anatomy" className={styles.section} aria-labelledby="anatomy-title">
      <Container>
        <SectionHeading
          id="anatomy-title"
          index={anatomyCopy.index}
          eyebrow={anatomyCopy.eyebrow}
          title={anatomyCopy.title}
          lede={anatomyCopy.lede}
        />

        <ol className={styles.rows}>
          {chapters.map((chapter) => (
            <li key={chapter.id} data-reveal="" className={cx(styles.row, 'reveal-line')}>
              <div data-reveal-item="" className={styles.lead} style={cssVars({ '--i': 1 })}>
                <span className={cx(styles.index, 'type-eyebrow')} aria-hidden="true">
                  {chapter.index}
                </span>
                <h3 className={cx(styles.title, 'type-subtitle')}>{chapter.title}</h3>
              </div>
              <div data-reveal-item="" className={styles.detail} style={cssVars({ '--i': 2 })}>
                <p className={cx(styles.body, 'type-body')}>{chapter.body}</p>
                <p className={cx(styles.fact, 'type-eyebrow')}>{chapter.fact}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
