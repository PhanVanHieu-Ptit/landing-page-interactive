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
