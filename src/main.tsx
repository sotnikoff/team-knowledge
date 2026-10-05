import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './presentation/app/App'
import { createContainer } from './presentation/app/container'
import { initTheme } from './presentation/theme/theme'

initTheme()

// Make sure the hand-written font is available before text gets measured.
void document.fonts.load('20px "Caveat"')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App dependencies={createContainer()} />
  </StrictMode>,
)
