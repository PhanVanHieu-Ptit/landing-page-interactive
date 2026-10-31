import { Fragment, type ReactNode } from 'react'

/**
 * Turns copy such as "Every frame begins in *glass.*" into text with an <em>
 * around the starred span. Content stays plain strings (easy to edit and to
 * translate) while headings still get their one italic word.
 */
export function renderEmphasis(text: string): ReactNode {
  return text
    .split(/\*([^*]+)\*/)
    .map((part, index) => (index % 2 === 1 ? <em key={index}>{part}</em> : <Fragment key={index}>{part}</Fragment>))
}

/**
<<<<<<< Updated upstream
 * `renderEmphasis` with every word wrapped for a mask-rise entrance: an outer
 * mask and an inner span marked `data-reveal-word`. The spaces between words
 * stay real text nodes, so the heading still reads as one sentence to assistive
 * technology and wraps at the same points.
 */
export function renderRevealWords(text: string, classes: RevealWordClasses): ReactNode {
  let key = 0
=======
 * `renderEmphasis` with every word wrapped for a mask-rise entrance through the
 * reveal system (src/styles/reveal.css): an outer mask and an inner span that
 * is an item of the nearest `data-reveal` host, with its place in that host's
 * sequence as `--i`, starting at `firstIndex`, so a heading's other parts can be
 * slotted before or after its words. The spaces between words stay real text
 * nodes, so the heading still reads as one sentence to assistive technology and
 * wraps at the same points.
 */
export function renderStaggeredWords(text: string, firstIndex = 0): ReactNode {
  let key = 0
  let word = firstIndex
>>>>>>> Stashed changes
  return text.split(/\*([^*]+)\*/).flatMap((part, index) =>
    part.split(/(\s+)/).map((piece) => {
      if (piece === '') return null
      key += 1
      if (/^\s+$/.test(piece)) return <Fragment key={key}>{piece}</Fragment>
      const content = index % 2 === 1 ? <em>{piece}</em> : piece
<<<<<<< Updated upstream
      return (
        <span key={key} className={classes.word}>
          <span className={classes.inner} data-reveal-word="">
=======
      const position = word
      word += 1
      return (
        <span key={key} className="reveal-mask">
          <span className="reveal-mask-inner" data-reveal-item="mask" style={cssVars({ '--i': position })}>
>>>>>>> Stashed changes
            {content}
          </span>
        </span>
      )
    }),
  )
}
