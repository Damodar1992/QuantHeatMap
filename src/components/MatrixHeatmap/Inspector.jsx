import { useMemo } from 'react'
import { prepareAxis } from '../../lib/matrixEngine'

export function Inspector({
  specs,
  xParamOrder,
  yParamOrder,
  node,
  summary,
  specsMap,
  cells = [],
  aggregator = 'MAX',
}) {
  const { minVal, maxVal } = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    for (const c of cells) {
      if (c.count > 0) {
        if (c.value < min) min = c.value
        if (c.value > max) max = c.value
      }
    }
    if (min === Infinity) min = 0
    if (max === -Infinity) max = 1
    if (min === max) max = min + 1
    return { minVal: min, maxVal: max }
  }, [cells])

  const xAxis = useMemo(
    () => (xParamOrder.length && specsMap ? prepareAxis(xParamOrder, specsMap) : { bases: [], total: 0 }),
    [xParamOrder, specsMap]
  )
  const yAxis = useMemo(
    () => (yParamOrder.length && specsMap ? prepareAxis(yParamOrder, specsMap) : { bases: [], total: 0 }),
    [yParamOrder, specsMap]
  )

  return (
    <div className="inspector">
      <div className="inspector-title">Node inspector</div>
      <div className="inspector-section">
        <div className="inspector-label">Axis X</div>
        <div className="inspector-params">
          {xParamOrder.map((key, i) => (
            <div key={key} className="inspector-param">
              <span className="inspector-param-key">{specs.find((s) => s.key === key)?.label || key}</span>
              <span className="inspector-param-base">base={xAxis.bases[i] ?? 0}</span>
            </div>
          ))}
        </div>
        <div className="inspector-total">xTotal = {xAxis.total}</div>
      </div>
      <div className="inspector-section">
        <div className="inspector-label">Axis Y</div>
        <div className="inspector-params">
          {yParamOrder.map((key, i) => (
            <div key={key} className="inspector-param">
              <span className="inspector-param-key">{specs.find((s) => s.key === key)?.label || key}</span>
              <span className="inspector-param-base">base={yAxis.bases[i] ?? 0}</span>
            </div>
          ))}
        </div>
        <div className="inspector-total">yTotal = {yAxis.total}</div>
      </div>
      {node && (
        <div className="inspector-section">
          <div className="inspector-label">Current node</div>
          <div className="inspector-ranges">
            <div>xRange: [{node.xRange.start}, {node.xRange.end}) size={node.xRange.end - node.xRange.start}</div>
            <div>yRange: [{node.yRange.start}, {node.yRange.end}) size={node.yRange.end - node.yRange.start}</div>
            <div>level: {node.level}</div>
          </div>
        </div>
      )}
      {summary && (
        <div className="inspector-section">
          <div className="inspector-label">Stats</div>
          <div className="inspector-stats">
            <div>recordsInNode: {summary.recordsInNode}</div>
            <div>nonEmptyCells: {summary.nonEmptyCells}</div>
          </div>
        </div>
      )}
      <div className="inspector-section inspector-legend-section">
        <div className="heatmap-legend">
          <div className="heatmap-legend-title">Value ({aggregator})</div>
          <div className="heatmap-legend-bar" />
          <div className="heatmap-legend-labels">
            <span>{minVal.toFixed(3)}</span>
            <span>{maxVal.toFixed(3)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
