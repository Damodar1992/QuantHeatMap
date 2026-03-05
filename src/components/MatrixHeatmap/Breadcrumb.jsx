export function Breadcrumb({ nodeStack, onGoToLevel, onReset }) {
  return (
    <div className="heatmap-breadcrumb">
      <button type="button" className="breadcrumb-btn" onClick={onReset}>
        Reset
      </button>
      <span className="breadcrumb-sep">|</span>
      {nodeStack.map((node, i) => (
        <span key={i} className="breadcrumb-item">
          {i > 0 && <span className="breadcrumb-sep"> › </span>}
          <button
            type="button"
            className={`breadcrumb-link ${i === nodeStack.length - 1 ? 'breadcrumb-link-current' : ''}`}
            onClick={() => onGoToLevel(i)}
          >
            {i === 0 ? 'Root' : `L${node.level}`}
          </button>
        </span>
      ))}
    </div>
  )
}
