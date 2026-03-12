import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Button } from '@radix-ui/themes'
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
  const [aggregator, setAggregator] = useState('AVG')
  const [nodeStack, setNodeStack] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showJsonModal, setShowJsonModal] = useState(false)
  const [jsonModalContent, setJsonModalContent] = useState('')
  const [jsonModalTitle, setJsonModalTitle] = useState('Matrix data')

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

  const nodeCacheKey = useMemo(() => {
    const n = effectiveNode
    if (!n || !n.xRange || !n.yRange) return null
    return `${n.level}:${n.xRange.start},${n.xRange.end}:${n.yRange.start},${n.yRange.end}`
  }, [effectiveNode])

  const resultCacheRef = useRef(null)
  if (!resultCacheRef.current) resultCacheRef.current = new Map()
  /** Ref to the result actually displayed on the grid; used for JSON so modal always matches the heatmap. */
  const displayedResultRef = useRef(null)

  const build = useCallback(async () => {
    if (xParamOrder.length === 0 || yParamOrder.length === 0) {
      setResult(null)
      setLoading(false)
      return
    }
    const cache = resultCacheRef.current
    const axisKey = [xParamOrder.join(','), yParamOrder.join(','), aggregator].join('|')
    const cacheKey = axisKey + '::' + nodeCacheKey
    if (cacheKey && cache.has(cacheKey)) {
      setResult(cache.get(cacheKey))
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
      if (cacheKey) cache.set(cacheKey, res)
      setResult(res)
    } catch (e) {
      setError(e.message || 'Build failed')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [xParamOrder, yParamOrder, aggregator, effectiveNode, nodeCacheKey])

  useEffect(() => {
    build()
  }, [build])

  const handleAxisChange = useCallback((patch) => {
    if (patch.xParamOrder != null) setXParamOrder(patch.xParamOrder)
    if (patch.yParamOrder != null) setYParamOrder(patch.yParamOrder)
    if (patch.aggregator != null) setAggregator(patch.aggregator)
    setNodeStack([])
    if (resultCacheRef.current) resultCacheRef.current.clear()
  }, [])

  const MAX_DRILL_LEVEL = 3

  const handleCellClick = useCallback(
    (xBucket, yBucket) => {
      const node = effectiveNode
      if (node.level >= MAX_DRILL_LEVEL) return
      const next = drillDown(node, xBucket, yBucket, xTotal, yTotal)
      setNodeStack((prev) => [...prev, next])
    },
    [effectiveNode, xTotal, yTotal]
  )

  const handleGoToLevel = useCallback((levelIndex) => {
    setNodeStack((prev) => prev.slice(0, levelIndex))
  }, [])

  const handleReset = useCallback(() => {
    setNodeStack([])
  }, [])

  const displayStack = useMemo(
    () => [rootNode, ...nodeStack],
    [rootNode, nodeStack]
  )

  /** Result is only valid for display when it matches the current effective node (avoids stale data after breadcrumb nav). */
  const resultMatchesCurrentNode = useMemo(() => {
    if (!result?.node || !effectiveNode) return Boolean(result && !effectiveNode)
    const r = result.node
    const e = effectiveNode
    return (
      r.level === e.level &&
      r.xRange?.start === e.xRange?.start &&
      r.xRange?.end === e.xRange?.end &&
      r.yRange?.start === e.yRange?.start &&
      r.yRange?.end === e.yRange?.end
    )
  }, [result, effectiveNode])

  useEffect(() => {
    if (result && !loading && resultMatchesCurrentNode) {
      displayedResultRef.current = result
    } else {
      displayedResultRef.current = null
    }
  }, [result, loading, resultMatchesCurrentNode])

  const handleShowJson = useCallback(() => {
    const displayed = displayedResultRef.current
    if (!displayed) {
      setJsonModalTitle('Matrix data')
      setJsonModalContent(
        JSON.stringify(
          { message: 'Нет данных для текущего уровня. Дождитесь загрузки матрицы.' },
          null,
          2
        )
      )
      setShowJsonModal(true)
      return
    }
    const node = displayed.node
    const levelLabel =
      node?.level === 0
        ? 'Root'
        : node?.level === 1
          ? 'Level 1'
          : node != null
            ? `Level ${node.level}`
            : 'Root'
    setJsonModalTitle(`Matrix data: ${levelLabel}`)
    const nonEmptyCells = Array.isArray(displayed.cells)
      ? displayed.cells.filter((c) => c && c.count > 0)
      : []
    const payload = {
      axis: { xParamOrder, yParamOrder, aggregator },
      level: node?.level ?? 0,
      levelLabel,
      node,
      summary: displayed.summary,
      cells: nonEmptyCells,
      _note: 'Данные в этом JSON соответствуют тому, что отображается на тепловой карте для данного уровня.',
    }
    setJsonModalContent(JSON.stringify(payload, null, 2))
    setShowJsonModal(true)
  }, [xParamOrder, yParamOrder, aggregator])

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

      <div className="matrix-toolbar">
        <Breadcrumb
          nodeStack={displayStack}
          onGoToLevel={handleGoToLevel}
        />
        <div className="matrix-toolbar-actions">
          <Button variant="soft" size="2" onClick={handleReset}>
            Reset
          </Button>
          <Button
            variant="soft"
            size="2"
            onClick={handleShowJson}
            disabled={!result || !resultMatchesCurrentNode}
          >
            Show JSON
          </Button>
        </div>
      </div>

      {error && <div className="matrix-error">{error}</div>}
      {loading && <div className="matrix-loading">Building matrix…</div>}

      {result && !loading && resultMatchesCurrentNode && (
        <section className="matrix-content">
          <div className="matrix-main">
            <HeatmapGrid
              cells={result.cells}
              aggregator={aggregator}
              onCellClick={handleCellClick}
              canDrillDown={effectiveNode.level < MAX_DRILL_LEVEL}
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

      {showJsonModal && (
        <div className="json-modal-overlay" onClick={() => setShowJsonModal(false)} role="presentation">
          <div className="json-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="JSON data">
            <div className="json-modal-header">
              <h2 className="json-modal-title">{jsonModalTitle}</h2>
              <Button variant="soft" size="2" onClick={() => setShowJsonModal(false)}>
                Close
              </Button>
            </div>
            <pre className="json-modal-content">{jsonModalContent}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
