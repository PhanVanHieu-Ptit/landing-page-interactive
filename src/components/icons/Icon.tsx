import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export interface IconProps extends Omit<ComponentPropsWithoutRef<'svg'>, 'children'> {
  /** Accessible name. Leave unset for decorative icons, which are hidden from assistive technology. */
  title?: string
}

interface IconShellProps extends IconProps {
  children: ReactNode
}

/** Shared SVG shell: a 24×24 grid with thin `currentColor` strokes. */
export function Icon({ title, children, ...rest }: IconShellProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}
