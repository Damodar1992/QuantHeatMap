/**
 * Parameter metadata for Matrix Heatmap.
 * Each param has: key, type, domain (allowedValues OR min/max/step), label, group, indicator.
 */

export const PARAM_TYPES = {
  INT: 'int',
  FLOAT: 'float',
  ENUM: 'enum',
  BOOL: 'bool',
}

/**
 * Domains must match the data in public.Heatmap (see server/seed-heatmap.js).
 * Otherwise rank computation and cell counts will be wrong.
 */
export const parameterSpecs = [
  {
    key: 'MACD.fast',
    type: PARAM_TYPES.INT,
    domain: { min: 12, max: 20, step: 1 },
    label: 'MACD Fast',
    group: 'Trend',
    indicator: 'MACD',
  },
  {
    key: 'MACD.slow',
    type: PARAM_TYPES.INT,
    domain: { min: 26, max: 35, step: 1 },
    label: 'MACD Slow',
    group: 'Trend',
    indicator: 'MACD',
  },
  {
    key: 'MACD.signal',
    type: PARAM_TYPES.INT,
    domain: { min: 1, max: 5, step: 1 },
    label: 'MACD Signal',
    group: 'Trend',
    indicator: 'MACD',
  },
  {
    key: 'BB.time',
    type: PARAM_TYPES.INT,
    domain: { min: 1, max: 10, step: 1 },
    label: 'BB Period',
    group: 'Volatility',
    indicator: 'BB',
  },
  {
    key: 'BB.devUp',
    type: PARAM_TYPES.FLOAT,
    domain: { min: 0.1, max: 1, step: 0.1, precision: 1 },
    label: 'BB Dev Up',
    group: 'Volatility',
    indicator: 'BB',
  },
  {
    key: 'BB.devDown',
    type: PARAM_TYPES.FLOAT,
    domain: { min: 0.1, max: 1, step: 0.1, precision: 1 },
    label: 'BB Dev Down',
    group: 'Volatility',
    indicator: 'BB',
  },
]

export function getSpecByKey(specs, key) {
  return specs.find((s) => s.key === key) ?? null
}
