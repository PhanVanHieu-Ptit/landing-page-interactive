import type { ComponentPropsWithoutRef } from 'react'
import { cx } from '@/lib/cx'
import styles from './Container.module.css'

interface ContainerProps extends ComponentPropsWithoutRef<'div'> {
  width?: 'default' | 'narrow'
}

/**
 * The page's single horizontal rail: every section, the header and the footer
 * sit inside one, so their left edges line up at every viewport width.
 */
export function Container({ width = 'default', className, ...rest }: ContainerProps) {
  return <div className={cx(styles.container, width === 'narrow' && styles.narrow, className)} {...rest} />
}
