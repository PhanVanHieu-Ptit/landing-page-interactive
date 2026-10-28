import { Icon, type IconProps } from './Icon'

/** The Aurelle mark: a lens ring around a six-blade aperture. */
export function LogoMark(props: IconProps) {
  return (
    <Icon strokeWidth="1.25" {...props}>
      <circle cx="12" cy="12" r="10.5" />
      <path d="M12 6.25 16.98 9.125v5.75L12 17.75l-4.98-2.875v-5.75z" />
      <path d="M12 6.25V1.5M16.98 9.125l4.11-2.375M16.98 14.875l4.11 2.375M12 17.75v4.75M7.02 14.875l-4.11 2.375M7.02 9.125 2.91 6.75" />
    </Icon>
  )
}
