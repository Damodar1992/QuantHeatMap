import { useMemo } from 'react'
import {
  MATRIX_SIZE,
  getBucketRange,
  getParamValueRangesForRankRange,
} from '../../lib/matrixEngine'

function clamp(v, min, max) {
  if (v <= min) return min
  if (v >= max) return max
  return v
}

function formatParamRange(spec, minVal, maxVal) {
  const label = spec?.label || spec?.key || ''
  if (minVal === maxVal) return `${label}: ${minVal}`
  return `${label}: ${minVal}-${maxVal}`
}

/** Number of distinct values for this param in [minVal, maxVal] from values array */
function countValuesInRange(values, minVal, maxVal) {
  if (!values || !values.length) return 0
  return values.filter((v) => v >= minVal && v <= maxVal).length
}

export function HeatmapGrid({
  cells,
  aggregator,
  onCellClick,
  canDrillDown = true,
  node,
  xAxisLabel,
  yAxisLabel,
  xParamOrder = [],
  yParamOrder = [],
  xValuesMap,
  yValuesMap,
  specs = [],
}) {
  const specByKey = useMemo(() => {
    const m = new Map()
    specs.forEach((s) => m.set(s.key, s))
    return m
  }, [specs])
  const { minVal, maxVal } = useMemo(() => {
    let minVal = Infinity
    let maxVal = -Infinity
    for (const c of cells) {
      if (c.count > 0) {
        if (c.value < minVal) minVal = c.value
        if (c.value > maxVal) maxVal = c.value
      }
    }
    if (minVal === Infinity) minVal = 0
    if (maxVal === -Infinity) maxVal = 1
    if (minVal === maxVal) maxVal = minVal + 1
    return { minVal, maxVal }
  }, [cells])

  const getColor = (value, count) => {
    if (count === 0) return 'var(--heatmap-empty)'
    const t = (value - minVal) / (maxVal - minVal)
    const t2 = clamp(t, 0, 1)
    const lerp = (a, b, x) => Math.round(a + (b - a) * x)
    const stops = [
      [220, 53, 69],
      [236, 90, 45],
      [253, 126, 20],
      [255, 193, 7],
      [40, 167, 69],
    ]
    const i = Math.min(3, Math.floor(t2 * 4))
    const local = (t2 * 4) - i
    const localClamped = clamp(local, 0, 1)
    const r = lerp(stops[i][0], stops[i + 1][0], localClamped)
    const g = lerp(stops[i][1], stops[i + 1][1], localClamped)
    const b = lerp(stops[i][2], stops[i + 1][2], localClamped)
    return `rgb(${r},${g},${b})`
  }

  const cellMap = useMemo(() => {
    const m = new Map()
    for (const c of cells) m.set(c.y * MATRIX_SIZE + c.x, c)
    return m
  }, [cells])

  const xRanges = useMemo(() => {
    if (!node?.xRange) return []
    return Array.from({ length: MATRIX_SIZE }, (_, i) =>
      getBucketRange(node.xRange.start, node.xRange.end, i, MATRIX_SIZE)
    )
  }, [node])
  const yRanges = useMemo(() => {
    if (!node?.yRange) return []
    return Array.from({ length: MATRIX_SIZE }, (_, i) =>
      getBucketRange(node.yRange.start, node.yRange.end, i, MATRIX_SIZE)
    )
  }, [node])

  const xParamRangesPerBucket = useMemo(() => {
    if (!xValuesMap?.size || !xParamOrder.length) return []
    return xRanges.map(([start, end]) =>
      getParamValueRangesForRankRange(xParamOrder, xValuesMap, start, end)
    )
  }, [xRanges, xParamOrder, xValuesMap])

  const yParamRangesPerBucket = useMemo(() => {
    if (!yValuesMap?.size || !yParamOrder.length) return []
    return yRanges.map(([start, end]) =>
      getParamValueRangesForRankRange(yParamOrder, yValuesMap, start, end)
    )
  }, [yRanges, yParamOrder, yValuesMap])

  const totalAxisX = node?.xRange ? node.xRange.end - node.xRange.start : 0
  const totalAxisY = node?.yRange ? node.yRange.end - node.yRange.start : 0

  return (
    <div className={`heatmap-wrap${canDrillDown ? '' : ' heatmap-max-level'}`}>
      <div className="heatmap-layout">
        <div className="heatmap-corner">
          <div className="heatmap-axis-title heatmap-axis-title-y">
            {yAxisLabel || 'Y'}
          </div>
        </div>
        <div className="heatmap-x-axis">
          <div className="heatmap-axis-title heatmap-axis-title-x">
            {xAxisLabel || 'X'}
          </div>
          <div className="heatmap-axis-ticks heatmap-axis-ticks-x">
              {xRanges.map((_, i) => {
                const params = xParamRangesPerBucket[i] || []
                const [start, end] = xRanges[i] || [0, 0]
                const count = end - start
                const title = [
                  '——— Axis X info ———',
                  ...params.map((r) => {
                    const spec = specByKey.get(r.key)
                    const label = spec?.label || r.key
                    const rangeStr = r.minValue === r.maxValue ? String(r.minValue) : `${r.minValue} .. ${r.maxValue}`
                    const valCount = countValuesInRange(xValuesMap?.get(r.key), r.minValue, r.maxValue)
                    return `${label}: [${rangeStr}] — ${valCount} знач.`
                  }),
                  `Комбинаций в колонке: ${count}`,
                  `Всего по Axis X: ${totalAxisX} комбинаций`,
                ].join('\n')
              return (
                <div key={i} className="heatmap-axis-tick" title={title}>
                  <span className="heatmap-tick-index">{i}</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="heatmap-axis-ticks heatmap-axis-ticks-y">
          {yRanges.map((_, i) => {
            const params = yParamRangesPerBucket[i] || []
            const [start, end] = yRanges[i] || [0, 0]
            const count = end - start
            const title = [
              '——— Axis Y info ———',
              ...params.map((r) => {
                const spec = specByKey.get(r.key)
                const label = spec?.label || r.key
                const rangeStr = r.minValue === r.maxValue ? String(r.minValue) : `${r.minValue} .. ${r.maxValue}`
                const valCount = countValuesInRange(yValuesMap?.get(r.key), r.minValue, r.maxValue)
                return `${label}: [${rangeStr}] — ${valCount} знач.`
              }),
              `Комбинаций в строке: ${count}`,
              `Всего по Axis Y: ${totalAxisY} комбинаций`,
            ].join('\n')
            return (
              <div key={i} className="heatmap-axis-tick" title={title}>
                <span className="heatmap-tick-index">{i}</span>
              </div>
            )
          })}
        </div>
        <div
          className="heatmap-grid"
          style={{ '--matrix-size': MATRIX_SIZE }}
        >
            {Array.from({ length: MATRIX_SIZE * MATRIX_SIZE }, (_, i) => {
              const x = i % MATRIX_SIZE
              const y = Math.floor(i / MATRIX_SIZE)
              const cell = cellMap.get(y * MATRIX_SIZE + x) || {
                x, y, count: 0, nextNonEmptyCells: 0, min: 0, max: 0, avg: 0, p95: 0, median: 0, value: 0,
              }
              const color = getColor(cell.value, cell.count)
              const xRankRange = xRanges[x]
              const yRankRange = yRanges[y]
              const xRankCount = xRankRange ? xRankRange[1] - xRankRange[0] : 0
              const yRankCount = yRankRange ? yRankRange[1] - yRankRange[0] : 0
              const rankCombinations = xRankCount * yRankCount
              const xParamRanges =
                xRankRange && xValuesMap && xParamOrder.length
                  ? getParamValueRangesForRankRange(
                      xParamOrder,
                      xValuesMap,
                      xRankRange[0],
                      xRankRange[1]
                    )
                  : []
              const yParamRanges =
                yRankRange && yValuesMap && yParamOrder.length
                  ? getParamValueRangesForRankRange(
                      yParamOrder,
                      yValuesMap,
                      yRankRange[0],
                      yRankRange[1]
                    )
                  : []
              const titleLines = [
                '——— Axis X info ———',
                ...(xParamRanges.length
                  ? [
                      ...xParamRanges.map((r) => {
                        const spec = specByKey.get(r.key)
                        const label = spec?.label || r.key
                        const rangeStr = r.minValue === r.maxValue ? String(r.minValue) : `${r.minValue} .. ${r.maxValue}`
                        const valCount = countValuesInRange(xValuesMap?.get(r.key), r.minValue, r.maxValue)
                        return `${label}: [${rangeStr}] — ${valCount} знач.`
                      }),
                      `Комбинаций в колонке: ${xRankCount}`,
                      `Всего по Axis X: ${totalAxisX} комбинаций`,
                    ]
                  : ['—']),
                '——— Axis Y info ———',
                ...(yParamRanges.length
                  ? [
                      ...yParamRanges.map((r) => {
                        const spec = specByKey.get(r.key)
                        const label = spec?.label || r.key
                        const rangeStr = r.minValue === r.maxValue ? String(r.minValue) : `${r.minValue} .. ${r.maxValue}`
                        const valCount = countValuesInRange(yValuesMap?.get(r.key), r.minValue, r.maxValue)
                        return `${label}: [${rangeStr}] — ${valCount} знач.`
                      }),
                      `Комбинаций в строке: ${yRankCount}`,
                      `Всего по Axis Y: ${totalAxisY} комбинаций`,
                    ]
                  : ['—']),
                '——— Total info ———',
                `Непустых ячеек на следующем уровне: ${cell.nextNonEmptyCells ?? 0}`,
                `Записей в ячейке: ${cell.count}`,
                cell.count > 0
                  ? [
                      'Min Score: ' + (cell.min ?? 0).toFixed(3),
                      'Avg Score: ' + (cell.avg ?? cell.median ?? 0).toFixed(3),
                      'Max Score: ' + (cell.max ?? 0).toFixed(3),
                    ].join('\n')
                  : 'Min Score: —\nAvg Score: —\nMax Score: —',
              ].filter(Boolean)
              return (
                <button
                  key={`${x}-${y}`}
                  type="button"
                  className="heatmap-cell"
                  style={{ backgroundColor: color }}
                  onClick={() => onCellClick(x, y)}
                  title={titleLines.join('\n')}
                >
                  {cell.count > 0 ? (
                    <span className="heatmap-cell-inner">
                      <span className="heatmap-cell-score">{cell.value.toFixed(3)}</span>
                      <span className="heatmap-cell-count">{cell.nextNonEmptyCells ?? 0}</span>
                    </span>
                  ) : null}
                </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
