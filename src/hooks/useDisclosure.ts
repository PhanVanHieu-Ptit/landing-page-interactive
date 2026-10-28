import { useCallback, useEffect, useState, type RefObject } from 'react'

interface DisclosureOptions {
  /** Element that receives focus when Escape closes the disclosure (normally its toggle button). */
  restoreFocusTo?: RefObject<HTMLElement | null>
}

/** Open/closed state for a disclosure widget, with Escape-to-close built in. */
export function useDisclosure({ restoreFocusTo }: DisclosureOptions = {}) {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((value) => !value), [])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      restoreFocusTo?.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, restoreFocusTo])

  return { open, toggle, close } as const
}
