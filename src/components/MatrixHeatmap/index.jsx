import { useState, useEffect, useCallback, useMemo } from 'react'
import { postMatrixBuild } from '../../api/matrixApi'
import { createRootNode, drillDown, prepareAxis } from '../../lib/matrixEngine'
import { parameterSpecs } from '../../data/parameterSpecs'
import { AxisConfig } from './AxisConfig'
import { HeatmapGrid } from './HeatmapGrid'
import { Inspector } from './Inspector'
import { Breadcrumb } from './Breadcrumb'

const defaultX = ['MACD.fast', 'MACD.slow']
const defaultY = ['BB.time', 'BB.devUp']

function buildSpecsMap() {
  const m = new Map()
  for (const s of parameterSpecs) m.set(s.key, s)
  return m
}

export function MatrixHeatmap() {
  const [xParamOrder, setXParamOrder] = useState(defaultX)
  const [yParamOrder, setYParamOrder] = useState(defaultY)
  const [aggregator, setAggregator] = useState('MAX')
  const [nodeStack, setNodeStack] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const specsMap = useMemo(() => buildSpecsMap(), [])
  const xAxisPrep = useMemo(
    () => prepareAxis(xParamOrder, specsMap),
    [xParamOrder, specsMap]
  )
  const yAxisPrep = useMemo(
    () => prepareAxis(yParamOrder, specsMap),
    [yParamOrder, specsMap]
  )
  const xTotal = xAxisPrep.total
  const yTotal = yAxisPrep.total

  const currentNode = nodeStack.length > 0 ? nodeStack[nodeStack.length - 1] : null
  const rootNode = useMemo(
    () => createRootNode(xTotal, yTotal),
    [xTotal, yTotal]
  )
  const effectiveNode = currentNode || rootNode

  const build = useCallback(async () => {
    if (xParamOrder.length === 0 || yParamOrder.length === 0) {
      setResult(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await postMatrixBuild({
        datasetId: 'default',
        axis: {
          xParams: xParamOrder,
          yParams: yParamOrder,
          xParamOrder,
          yParamOrder,
          aggregator,
        },
        node: effectiveNode,
      })
      setResult(res)
    } catch (e) {
      setError(e.message || 'Build failed')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [xParamOrder, yParamOrder, aggregator, effectiveNode])

  useEffect(() => {
    build()
  }, [build])

  const handleAxisChange = useCallback((patch) => {
    if (patch.xParamOrder != null) setXParamOrder(patch.xParamOrder)
    if (patch.yParamOrder != null) setYParamOrder(patch.yParamOrder)
    if (patch.aggregator != null) setAggregator(patch.aggregator)
    setNodeStack([])
  }, [])

  const handleCellClick = useCallback(
    (xBucket, yBucket) => {
      const node = effectiveNode
      const next = drillDown(node, xBucket, yBucket, xTotal, yTotal)
      setNodeStack((prev) => [...prev, next])
    },
    [effectiveNode, xTotal, yTotal]
  )

  const handleGoToLevel = useCallback((levelIndex) => {
    setNodeStack((prev) => prev.slice(0, levelIndex + 1))
  }, [])

  const handleReset = useCallback(() => {
    setNodeStack([])
  }, [])

  const displayStack = useMemo(
    () => [rootNode, ...nodeStack],
    [rootNode, nodeStack]
  )

  return (
    <div className="matrix-heatmap-page">
      <header className="matrix-page-header">
        <h1 className="matrix-page-title">Matrix Heatmap 25×25</h1>
        <p className="matrix-page-subtitle">
          Full-axis rank partition • drill-down by cell
        </p>
      </header>

      <section className="matrix-config-section">
        <AxisConfig
          specs={parameterSpecs}
          xParams={xParamOrder}
          yParams={yParamOrder}
          xParamOrder={xParamOrder}
          yParamOrder={yParamOrder}
          aggregator={aggregator}
          onAxisChange={handleAxisChange}
        />
      </section>

      <Breadcrumb
        nodeStack={displayStack}
        onGoToLevel={handleGoToLevel}
        onReset={handleReset}
      />

      {error && <div className="matrix-error">{error}</div>}
      {loading && <div className="matrix-loading">Building matrix…</div>}

      {result && !loading && (
        <section className="matrix-content">
          <div className="matrix-main">
            <HeatmapGrid
              cells={result.cells}
              aggregator={aggregator}
              onCellClick={handleCellClick}
              node={result.node}
              xAxisLabel={`X: ${xParamOrder.join(', ')}`}
              yAxisLabel={`Y: ${yParamOrder.join(', ')}`}
              xParamOrder={xParamOrder}
              yParamOrder={yParamOrder}
              xValuesMap={xAxisPrep.valuesMap}
              yValuesMap={yAxisPrep.valuesMap}
              specs={parameterSpecs}
            />
          </div>
          <aside className="matrix-sidebar">
            <Inspector
              specs={parameterSpecs}
              xParamOrder={xParamOrder}
              yParamOrder={yParamOrder}
              node={result.node}
              summary={result.summary}
              specsMap={specsMap}
              cells={result.cells}
              aggregator={aggregator}
            />
          </aside>
        </section>
      )}

      {!result && !loading && xParamOrder.length > 0 && yParamOrder.length > 0 && (
        <div className="matrix-empty">Select at least one parameter per axis.</div>
      )}
    </div>
  )
}
