/**
 * Build ordered values for a parameter from its spec (allowedValues or min/max/step).
 */
function buildOrderedValues(spec) {
  const d = spec.domain
  if (d.allowedValues) {
    const arr = [...d.allowedValues]
    if (spec.type === 'float') {
      arr.sort((a, b) => a - b)
    }
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
 * Generate mock records for all combinations of a small subset of params (for demo).
 * In production these would come from API.
 */
export function generateMockRecords(specs, paramKeys, count = 8000) {
  const valuesByKey = {}
  for (const key of paramKeys) {
    const spec = specs.find((s) => s.key === key)
    if (spec) valuesByKey[key] = buildOrderedValues(spec)
  }
  const keys = Object.keys(valuesByKey)
  const records = []
  const seen = new Set()
  let attempts = 0
  const maxAttempts = count * 3
  while (records.length < count && attempts < maxAttempts) {
    attempts++
    const params = {}
    let hash = ''
    for (const k of keys) {
      const arr = valuesByKey[k]
      const idx = Math.floor(Math.random() * arr.length)
      params[k] = arr[idx]
      hash += `${idx},`
    }
    if (seen.has(hash)) continue
    seen.add(hash)
    const score = 0.5 + Math.random() * 0.5
    records.push({ id: records.length + 1, params, score })
  }
  return records
}

export function getMockRecordsStatic() {
  const specs = [
    { key: 'MACD.fast', type: 'int', domain: { min: 8, max: 24, step: 2 } },
    { key: 'MACD.slow', type: 'int', domain: { min: 20, max: 40, step: 2 } },
    { key: 'BB.time', type: 'int', domain: { min: 14, max: 30, step: 2 } },
    { key: 'BB.devUp', type: 'float', domain: { min: 0.5, max: 2.5, step: 0.5, precision: 1 } },
  ]
  return generateMockRecords(specs, ['MACD.fast', 'MACD.slow', 'BB.time', 'BB.devUp'], 6000)
}
