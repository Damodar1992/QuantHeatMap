export function Breadcrumb({ nodeStack, onGoToLevel }) {
  return (
    <nav className="heatmap-breadcrumb" aria-label="Drill-down path">
      {nodeStack.map((node, i) => {
        const isCurrent = i === nodeStack.length - 1
        const label = i === 0 ? 'Root' : i === 1 ? 'Level 1' : `level ${node.level}`
        return (
          <span key={i} className="breadcrumb-item">
            {i > 0 && <span className="breadcrumb-sep" aria-hidden>›</span>}
            <button
              type="button"
              className={`breadcrumb-segment ${isCurrent ? 'breadcrumb-segment-current' : ''}`}
              onClick={() => onGoToLevel(i)}
            >
              {label}
            </button>
          </span>
        )
      })}
    </nav>
  )
}
