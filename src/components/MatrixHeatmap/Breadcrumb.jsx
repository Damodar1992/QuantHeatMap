import { Button } from '@radix-ui/themes'

export function Breadcrumb({ nodeStack, onGoToLevel, onReset }) {
  return (
    <div className="heatmap-breadcrumb">
      <Button variant="soft" size="1" className="breadcrumb-btn" onClick={onReset}>
        Reset
      </Button>
      <span className="breadcrumb-sep">|</span>
      {nodeStack.map((node, i) => (
        <span key={i} className="breadcrumb-item">
          {i > 0 && <span className="breadcrumb-sep"> - </span>}
          <Button
            type="button"
            variant="ghost"
            size="1"
            className={`breadcrumb-link ${i === nodeStack.length - 1 ? 'breadcrumb-link-current' : ''}`}
            onClick={() => onGoToLevel(i)}
          >
            {i === 0 ? 'Root' : i === 1 ? 'Level 1' : `level ${node.level}`}
          </Button>
        </span>
      ))}
    </div>
  )
}
