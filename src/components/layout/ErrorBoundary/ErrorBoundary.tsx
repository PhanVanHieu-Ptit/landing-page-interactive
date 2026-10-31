import { Component, type ErrorInfo, type ReactNode } from 'react'
import { crash } from '@/content/site'
import { cx } from '@/lib/cx'
import styles from './ErrorBoundary.module.css'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

/**
 * The last line of defense. Without it, an error while rendering unmounts the
 * whole tree and leaves an empty dark page. With it, the visitor gets a plain
 * explanation and a way out. It is a class because React offers no hook for
 * this. The fallback needs nothing from the app: no context, no canvas, no
 * webfont, and it reads fine in the system's own type if the stylesheet is the
 * thing that failed.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // The one place a crash is recorded; a reporting service would be called here.
    console.error('[aurelle] The page failed to render.', error, info.componentStack)
  }

  override render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className={styles.screen} role="alert">
        <div className={styles.body}>
          <h1 className={cx(styles.title, 'type-title')}>{crash.title}</h1>
          <p className={cx(styles.text, 'type-body')}>{crash.body}</p>
          <button type="button" className={cx(styles.reload, 'type-eyebrow')} onClick={() => window.location.reload()}>
            {crash.reload}
          </button>
        </div>
      </main>
    )
  }
}
