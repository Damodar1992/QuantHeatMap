import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import './colors.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Theme appearance="dark" radius="medium">
      <div className="app-root">
        <App />
      </div>
    </Theme>
  </StrictMode>,
)
