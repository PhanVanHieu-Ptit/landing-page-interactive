import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { ArrowRightIcon } from '@/components/icons'
import { cx } from '@/lib/cx'
import styles from './PrimaryButton.module.css'

interface OwnProps {
  children: ReactNode
  size?: 'sm' | 'md'
  /** Trailing arrow. On by default: it is part of the button's character. */
  icon?: boolean
}

type AnchorProps = OwnProps & Omit<ComponentPropsWithoutRef<'a'>, keyof OwnProps> & { href: string }
type NativeButtonProps = OwnProps & Omit<ComponentPropsWithoutRef<'button'>, keyof OwnProps> & { href?: undefined }

export type PrimaryButtonProps = AnchorProps | NativeButtonProps

function isAnchor(props: PrimaryButtonProps): props is AnchorProps {
  return props.href !== undefined
}

function ButtonContent({ icon, children }: { icon: boolean; children: ReactNode }) {
  return (
    <>
      <span className={styles.label}>{children}</span>
      {icon ? <ArrowRightIcon className={styles.icon} /> : null}
    </>
  )
}

/** The one primary call to action. Renders a link when given an `href`, a button otherwise. */
export function PrimaryButton(props: PrimaryButtonProps) {
  if (isAnchor(props)) {
    const { children, size = 'md', icon = true, className, ...anchor } = props
    return (
      <a className={cx(styles.button, size === 'sm' && styles.sm, className)} {...anchor}>
        <ButtonContent icon={icon}>{children}</ButtonContent>
      </a>
    )
  }

  const { children, size = 'md', icon = true, className, ...button } = props
  return (
    <button type="button" className={cx(styles.button, size === 'sm' && styles.sm, className)} {...button}>
      <ButtonContent icon={icon}>{children}</ButtonContent>
    </button>
  )
}
