/**
 * Matrix Heatmap API. POST /api/matrix/build implemented locally (no backend).
 */

import {
  buildMatrix,
  createRootNode,
  prepareAxis,
} from '../lib/matrixEngine'
import { parameterSpecs } from '../data/parameterSpecs'
import { generateMockRecords } from '../data/mockRecords'

let cachedRecords = null
let cacheAxisKey = null

function getRecords(axisConfig) {
  const allKeys = [...(axisConfig.xParams || []), ...(axisConfig.yParams || [])]
  const key = allKeys.sort().join('|')
  if (cachedRecords && cacheAxisKey === key) return cachedRecords
  cachedRecords = generateMockRecords(
    parameterSpecs,
    allKeys.length ? allKeys : ['MACD.fast', 'MACD.slow', 'BB.time', 'BB.devUp'],
    6000
  )
  cacheAxisKey = key
  return cachedRecords
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

  const records = getRecords(axisConfig)
  const result = buildMatrix(records, axisConfig, effectiveNode, aggregator)
  return result
}
