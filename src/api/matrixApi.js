/**
 * Matrix Heatmap API. Build uses data from Neon public.Heatmap via /api/db/heatmap/records.
 */

import {
  buildMatrix,
  createRootNode,
  prepareAxis,
} from '../lib/matrixEngine'
import { parameterSpecs } from '../data/parameterSpecs'
import { generateMockRecords } from '../data/mockRecords'

let cachedNeonRecords = null

async function getRecordsFromNeon() {
  if (cachedNeonRecords) return cachedNeonRecords
  const res = await fetch('/api/db/heatmap/records')
  if (!res.ok) throw new Error('Neon Heatmap records failed: ' + res.status)
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error('Invalid heatmap records response')
  cachedNeonRecords = data
  return cachedNeonRecords
}

function getRecordsMock(axisConfig) {
  const allKeys = [...(axisConfig.xParams || []), ...(axisConfig.yParams || [])]
  return generateMockRecords(
    parameterSpecs,
    allKeys.length ? allKeys : ['MACD.fast', 'MACD.slow', 'BB.time', 'BB.devUp'],
    400000,
    true
  )
}

function buildSpecsMap() {
  const m = new Map()
  for (const s of parameterSpecs) m.set(s.key, s)
  return m
}

/**
 * Build matrix response for given request (same shape as spec).
 * @param {Object} body - { datasetId, axis: { xParams, yParams, xParamOrder, yParamOrder, aggregator }, node }
 * @returns {Promise<{ matrixSize, node, cells, summary }>}
 */
export async function postMatrixBuild(body) {
  const { axis: axisReq, node } = body
  const xParamOrder = axisReq.xParamOrder || axisReq.xParams || []
  const yParamOrder = axisReq.yParamOrder || axisReq.yParams || []
  const xParams = axisReq.xParams || xParamOrder
  const yParams = axisReq.yParams || yParamOrder
  const aggregator = axisReq.aggregator || 'MAX'

  const specsMap = buildSpecsMap()
  const axisConfig = {
    xParams,
    yParams,
    xParamOrder,
    yParamOrder,
    aggregator,
  }

  const xAxis = prepareAxis(xParamOrder, specsMap)
  const yAxis = prepareAxis(yParamOrder, specsMap)
  axisConfig.xValuesMap = xAxis.valuesMap
  axisConfig.yValuesMap = yAxis.valuesMap

  const xTotal = xAxis.total
  const yTotal = yAxis.total

  const effectiveNode = node && node.xRange && node.yRange
    ? node
    : createRootNode(xTotal, yTotal)

  let records
  try {
    records = await getRecordsFromNeon()
  } catch (err) {
    records = getRecordsMock(axisConfig)
  }

  const result = buildMatrix(records, axisConfig, effectiveNode, aggregator)

  // Root: заполнить пустые ячейки одной синтетической записью (count=1, value=0.5)
  if (effectiveNode.level === 0 && result.cells) {
    const defaultScore = 0.5
    for (const cell of result.cells) {
      if (cell.count === 0) {
        cell.count = 1
        cell.min = defaultScore
        cell.max = defaultScore
        cell.avg = defaultScore
        cell.value = defaultScore
      }
    }
  }

  return result
}
