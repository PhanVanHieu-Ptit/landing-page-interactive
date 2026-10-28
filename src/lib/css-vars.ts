import type { CSSProperties } from 'react'

type CssVariable = `--${string}`

/**
 * Builds a `style` object that only sets CSS custom properties. Inline styles
 * are reserved for values that change at runtime (a progress ratio, say); this
 * keeps them typed and limited to custom properties the stylesheet consumes.
 */
export function cssVars(vars: Record<CssVariable, string | number>): CSSProperties {
  return vars as CSSProperties
}
