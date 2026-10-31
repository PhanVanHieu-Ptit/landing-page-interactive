import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import { ErrorBoundary } from '@/components/layout'
import '@/styles/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root was not found in index.html')

// Lab measurements (see lib/perf/vitals.ts): `?perf` in development, or in a build made with `VITE_PERF=1`. The
// shipping build drops the import altogether, so it carries neither the module nor Vite's dynamic-import helper.
if ((import.meta.env.DEV || import.meta.env.VITE_PERF) && new URLSearchParams(location.search).has('perf')) {
  void import('@/lib/perf/vitals').then((module) => module.startVitals())
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
