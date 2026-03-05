import { MatrixHeatmap } from './components/MatrixHeatmap'

function App() {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-left">
          <div className="brand-pill">Q</div>
          <span className="brand-title">QuantSandbox</span>
          <nav className="top-nav">
            <button type="button" className="nav-pill nav-pill-active">
              Matrix Heatmap
            </button>
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
