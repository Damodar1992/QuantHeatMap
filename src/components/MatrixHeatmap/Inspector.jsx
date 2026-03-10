import { useMemo } from 'react'
import { prepareAxis, getParamValueRangesForRankRange } from '../../lib/matrixEngine'

function formatRange(minVal, maxVal) {
  if (minVal === maxVal) return String(minVal)
  return `${minVal} .. ${maxVal}`
}

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
  const { minVal, maxVal, minScore, maxScore, avgScore } = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    let minS = Infinity
    let maxS = -Infinity
    let sumWeighted = 0
    let totalCount = 0
    for (const c of cells) {
      if (c.count > 0) {
        if (c.value < min) min = c.value
        if (c.value > max) max = c.value
        if (c.min != null && c.min < minS) minS = c.min
        if (c.max != null && c.max > maxS) maxS = c.max
        sumWeighted += (c.avg ?? c.value) * c.count
        totalCount += c.count
      }
    }
    if (min === Infinity) min = 0
    if (max === -Infinity) max = 1
    if (min === max) max = min + 1
    if (minS === Infinity) minS = 0
    if (maxS === -Infinity) maxS = 1
    const avg = totalCount > 0 ? sumWeighted / totalCount : 0
    return { minVal: min, maxVal: max, minScore: minS, maxScore: maxS, avgScore: avg }
  }, [cells])

  const xAxis = useMemo(
    () => (xParamOrder.length && specsMap ? prepareAxis(xParamOrder, specsMap) : { valuesMap: new Map(), bases: [], total: 0 }),
    [xParamOrder, specsMap]
  )
  const yAxis = useMemo(
    () => (yParamOrder.length && specsMap ? prepareAxis(yParamOrder, specsMap) : { valuesMap: new Map(), bases: [], total: 0 }),
    [yParamOrder, specsMap]
  )

  const xRangesAtLevel = useMemo(() => {
    if (!node?.xRange || !xAxis.valuesMap?.size) return []
    return getParamValueRangesForRankRange(xParamOrder, xAxis.valuesMap, node.xRange.start, node.xRange.end)
  }, [node, xParamOrder, xAxis.valuesMap])

  const yRangesAtLevel = useMemo(() => {
    if (!node?.yRange || !yAxis.valuesMap?.size) return []
    return getParamValueRangesForRankRange(yParamOrder, yAxis.valuesMap, node.yRange.start, node.yRange.end)
  }, [node, yParamOrder, yAxis.valuesMap])

  const totalX = node?.xRange ? node.xRange.end - node.xRange.start : 0
  const totalY = node?.yRange ? node.yRange.end - node.yRange.start : 0
  const filledCells = summary?.nonEmptyCells ?? 0

  return (
    <div className="inspector">
      <div className="inspector-title">Node inspector</div>

      <div className="inspector-section">
        <div className="inspector-label">Значения на оси X (текущий уровень)</div>
        <div className="inspector-params">
          {xRangesAtLevel.map((r) => (
            <div key={r.key} className="inspector-param">
              <span className="inspector-param-key">{specs.find((s) => s.key === r.key)?.label || r.key}</span>
              <span className="inspector-param-range">[{formatRange(r.minValue, r.maxValue)}]</span>
            </div>
          ))}
        </div>
        <div className="inspector-total">Комбинаций по оси X: {totalX}</div>
      </div>

      <div className="inspector-section">
        <div className="inspector-label">Значения на оси Y (текущий уровень)</div>
        <div className="inspector-params">
          {yRangesAtLevel.map((r) => (
            <div key={r.key} className="inspector-param">
              <span className="inspector-param-key">{specs.find((s) => s.key === r.key)?.label || r.key}</span>
              <span className="inspector-param-range">[{formatRange(r.minValue, r.maxValue)}]</span>
            </div>
          ))}
        </div>
        <div className="inspector-total">Комбинаций по оси Y: {totalY}</div>
      </div>

      <div className="inspector-section">
        <div className="inspector-label">Score</div>
        <div className="inspector-stats">
          <div>Min score: {minScore.toFixed(3)}</div>
          <div>Max score: {maxScore.toFixed(3)}</div>
          <div>Avg score: {avgScore.toFixed(3)}</div>
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-label">Ячейки</div>
        <div className="inspector-stats">
          <div>Заполненных ячеек: {filledCells}</div>
        </div>
      </div>

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
