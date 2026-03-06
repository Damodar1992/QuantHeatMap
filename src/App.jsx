import { useState } from 'react'
import { Button } from '@radix-ui/themes'
import { MatrixHeatmap } from './components/MatrixHeatmap'
import QuantPage from './pages/QuantPage'

function App() {
  const [page, setPage] = useState('matrix')

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-left">
          <div className="brand-pill">Q</div>
          <span className="brand-title">QuantSandbox</span>
          <nav className="top-nav">
            <Button
              variant="soft"
              highContrast={page === 'matrix'}
              className={`nav-pill ${page === 'matrix' ? 'nav-pill-active' : 'nav-pill-muted'}`}
              size="2"
              onClick={() => setPage('matrix')}
            >
              Matrix Heatmap
            </Button>
            <Button
              variant="soft"
              highContrast={page === 'quant'}
              className={`nav-pill ${page === 'quant' ? 'nav-pill-active' : 'nav-pill-muted'}`}
              size="2"
              onClick={() => setPage('quant')}
            >
              Quant
            </Button>
          </nav>
        </div>
      </header>
      <main className="app-main">
        {page === 'matrix' && <MatrixHeatmap />}
        {page === 'quant' && <QuantPage />}
      </main>
    </div>
  )
}

export default App
