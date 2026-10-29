import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import { SequenceDemo } from './SequenceDemo'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root was not found in sequence-demo.html')

createRoot(container).render(
  <StrictMode>
    <SequenceDemo />
  </StrictMode>,
)
