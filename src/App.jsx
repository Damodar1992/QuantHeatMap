import { Button } from '@radix-ui/themes'
import { MatrixHeatmap } from './components/MatrixHeatmap'

function App() {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-left">
          <div className="brand-pill">Q</div>
          <span className="brand-title">QuantSandbox</span>
          <nav className="top-nav">
            <Button variant="soft" highContrast className="nav-pill nav-pill-active" size="2">
              Matrix Heatmap
            </Button>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <MatrixHeatmap />
      </main>
    </div>
  )
}

export default App
