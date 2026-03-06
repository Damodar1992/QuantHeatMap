/**
 * Full-Axis Rank Partition: rank computation, 25×25 bucketing, aggregation, drill-down ranges.
 * Matrix size fixed at 25.
 */

const MATRIX_SIZE = 25

function buildOrderedValues(spec) {
  const d = spec.domain
  if (d.allowedValues) {
    const arr = [...d.allowedValues]
    if (spec.type === 'float') arr.sort((a, b) => a - b)
    return arr
  }
  const { min, max, step = 1, precision } = d
  const values = []
  let v = min
  const eps = precision != null ? Math.pow(10, -precision) : 1e-9
  while (v <= max + eps) {
    values.push(precision != null ? Number(v.toFixed(precision)) : v)
    v += step
  }
  return values
}

/**
 * For each param in order, get ordered values and base (size).
 * Returns { valuesMap: Map<key, values[]>, bases: number[], total: number }
 */
export function prepareAxis(paramOrder, specsMap) {
  const valuesMap = new Map()
  const bases = []
  for (const key of paramOrder) {
    const spec = specsMap.get(key)
    if (!spec) continue
    const values = buildOrderedValues(spec)
    valuesMap.set(key, values)
    bases.push(values.length)
  }
  const total = bases.reduce((a, b) => a * b, 1)
  return { valuesMap, bases, total }
}

/**
 * Index of value in ordered list (for enum/float must match).
 */
function indexOfValue(values, val) {
  const idx = values.indexOf(val)
  if (idx >= 0) return idx
  const num = Number(val)
  if (Number.isNaN(num)) return 0
  for (let i = 0; i < values.length; i++) {
    if (values[i] >= num) return i
  }
  return values.length - 1
}

/**
 * Mixed-radix rank for one axis.
 * rank = (((idx0 * base1 + idx1) * base2 + idx2) ... ) * base_k + idx_k
 */
export function computeRank(recordParams, paramOrder, valuesMap) {
  let rank = 0
  for (let i = 0; i < paramOrder.length; i++) {
    const key = paramOrder[i]
    const values = valuesMap.get(key)
    if (!values || values.length === 0) continue
    const v = recordParams[key]
    const idx = indexOfValue(values, v)
    rank = rank * values.length + idx
  }
  return rank
}

/**
 * Bucket index 0..24 for a rank inside [rangeStart, rangeEnd).
 */
export function rankToBucket(rank, rangeStart, rangeEnd, size = MATRIX_SIZE) {
  const rangeSize = rangeEnd - rangeStart
  if (rangeSize <= 0) return 0
  const local = rank - rangeStart
  const bucket = Math.floor((local * size) / rangeSize)
  return Math.max(0, Math.min(size - 1, bucket))
}

/**
 * Get bucket range [start, end) for bucketIndex inside node range.
 * Must be the inverse of rankToBucket: every rank R in [bStart, bEnd) has rankToBucket(R,...) === bucketIndex.
 * Uses ceil so that when rangeSize < size we still get correct non-empty ranges for buckets that have data.
 */
export function getBucketRange(rangeStart, rangeEnd, bucketIndex, size = MATRIX_SIZE) {
  const rangeSize = rangeEnd - rangeStart
  if (rangeSize <= 0) return [rangeStart, rangeStart]
  const bStart = rangeStart + Math.ceil((rangeSize * bucketIndex) / size)
  let bEnd = rangeStart + Math.ceil((rangeSize * (bucketIndex + 1)) / size)
  bEnd = Math.min(bEnd, rangeEnd)
  if (bEnd <= bStart) return [bStart, bStart]
  return [bStart, bEnd]
}

/**
 * For a rank range [rankStart, rankEnd), get min/max value of each axis parameter
 * (mixed-radix decoding). Returns array of { key, minValue, maxValue }.
 */
export function getParamValueRangesForRankRange(paramOrder, valuesMap, rankStart, rankEnd) {
  const bases = paramOrder.map((key) => valuesMap.get(key)?.length ?? 0)
  const result = []
  for (let i = 0; i < paramOrder.length; i++) {
    const key = paramOrder[i]
    const values = valuesMap.get(key)
    if (!values || values.length === 0) continue
    const base = values.length
    let divisor = 1
    for (let j = i + 1; j < bases.length; j++) divisor *= bases[j] || 1
    const qMin = Math.floor(rankStart / divisor)
    const qMax = Math.floor((rankEnd - 1) / divisor)
    const n = qMax - qMin + 1
    let idxMin, idxMax
    if (n >= base) {
      idxMin = 0
      idxMax = base - 1
    } else {
      const a = qMin % base
      const b = qMax % base
      if (a <= b) {
        idxMin = a
        idxMax = b
      } else {
        idxMin = 0
        idxMax = base - 1
      }
    }
    result.push({
      key,
      minValue: values[idxMin],
      maxValue: values[idxMax],
    })
  }
  return result
}

/**
 * Get param values for a single rank (inverse of computeRank).
 * Returns object { [paramKey]: value }.
 */
export function getParamsFromRank(paramOrder, valuesMap, rank) {
  const ranges = getParamValueRangesForRankRange(paramOrder, valuesMap, rank, rank + 1)
  return Object.fromEntries(ranges.map((r) => [r.key, r.minValue]))
}

/**
 * Percentile (sorted array, 0..1).
 */
function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (i - lo) * (sorted[hi] - sorted[lo])
}

/**
 * Build 25×25 matrix for given records, axis config, node, and aggregator.
 * Returns { cells: { x, y, count, max, p95, median, value }[], summary: { recordsInNode, nonEmptyCells } }
 */
export function buildMatrix(records, axisConfig, node, aggregator = 'MAX') {
  const { xParamOrder, yParamOrder, xParams, yParams } = axisConfig
  const xRange = [node.xRange.start, node.xRange.end]
  const yRange = [node.yRange.start, node.yRange.end]
  const xSize = xRange[1] - xRange[0]
  const ySize = yRange[1] - yRange[0]

  const cells = []
  for (let y = 0; y < MATRIX_SIZE; y++) {
    for (let x = 0; x < MATRIX_SIZE; x++) {
      cells.push({
        x,
        y,
        count: 0,
        max: 0,
        p95: 0,
        median: 0,
        value: 0,
        scores: [],
      })
    }
  }

  const cellIndex = (x, y) => y * MATRIX_SIZE + x
  const MAX_RECORDS_IN_NODE = MATRIX_SIZE * MATRIX_SIZE

  const nodeRecords = []
  for (const rec of records) {
    const rankX = computeRank(rec.params, xParamOrder, axisConfig.xValuesMap)
    const rankY = computeRank(rec.params, yParamOrder, axisConfig.yValuesMap)
    if (rankX < xRange[0] || rankX >= xRange[1] || rankY < yRange[0] || rankY >= yRange[1]) continue
    nodeRecords.push(rec)
  }

  let workRecords = nodeRecords
  if (nodeRecords.length > MAX_RECORDS_IN_NODE) {
    const shuffled = [...nodeRecords]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    workRecords = shuffled.slice(0, MAX_RECORDS_IN_NODE)
  }
  const recordsInNode = workRecords.length

  for (const rec of workRecords) {
    const rankX = computeRank(rec.params, xParamOrder, axisConfig.xValuesMap)
    const rankY = computeRank(rec.params, yParamOrder, axisConfig.yValuesMap)
    const xBucket = rankToBucket(rankX, xRange[0], xRange[1], MATRIX_SIZE)
    const yBucket = rankToBucket(rankY, yRange[0], yRange[1], MATRIX_SIZE)
    const cell = cells[cellIndex(xBucket, yBucket)]
    cell.count++
    cell.scores.push(rec.score)
  }

  for (const cell of cells) {
    if (cell.scores.length === 0) {
      cell.scores = []
      continue
    }
    const sorted = [...cell.scores].sort((a, b) => a - b)
    const sum = cell.scores.reduce((a, b) => a + b, 0)
    cell.min = sorted[0]
    cell.max = sorted[sorted.length - 1]
    cell.avg = sum / cell.scores.length
    cell.p95 = percentile(sorted, 0.95)
    cell.median = percentile(sorted, 0.5)
    if (aggregator === 'MIN') cell.value = cell.min
    else if (aggregator === 'AVG') cell.value = cell.avg
    else if (aggregator === 'MAX') cell.value = cell.max
    else if (aggregator === 'P95') cell.value = cell.p95
    else cell.value = cell.median
    cell.scores = []
  }

  const nonEmptyCells = cells.filter((c) => c.count > 0).length
  return {
    matrixSize: MATRIX_SIZE,
    node: {
      level: node.level,
      xRange: { start: node.xRange.start, end: node.xRange.end },
      yRange: { start: node.yRange.start, end: node.yRange.end },
    },
    cells: cells.map(({ x, y, count, min, max, avg, p95, median, value }) => ({
      x,
      y,
      count,
      min: min ?? 0,
      max,
      avg: avg ?? 0,
      p95,
      median,
      value,
    })),
    summary: {
      recordsInNode,
      nonEmptyCells,
    },
  }
}

/**
 * Create initial root node from axis totals.
 */
export function createRootNode(xTotal, yTotal) {
  return {
    level: 0,
    xRange: { start: 0, end: xTotal },
    yRange: { start: 0, end: yTotal },
  }
}

/**
 * Create child node when drilling into cell (xBucket, yBucket).
 */
export function drillDown(node, xBucket, yBucket, xTotal, yTotal) {
  const [xBStart, xBEnd] = getBucketRange(
    node.xRange.start,
    node.xRange.end,
    xBucket,
    MATRIX_SIZE
  )
  const [yBStart, yBEnd] = getBucketRange(
    node.yRange.start,
    node.yRange.end,
    yBucket,
    MATRIX_SIZE
  )
  return {
    level: node.level + 1,
    xRange: { start: xBStart, end: xBEnd },
    yRange: { start: yBStart, end: yBEnd },
  }
}

export { MATRIX_SIZE }
