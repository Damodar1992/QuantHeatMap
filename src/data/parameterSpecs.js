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

export const parameterSpecs = [
  {
    key: 'MACD.fast',
    type: PARAM_TYPES.INT,
    domain: { min: 8, max: 24, step: 2 },
    label: 'MACD Fast',
    group: 'Trend',
    indicator: 'MACD',
  },
  {
    key: 'MACD.slow',
    type: PARAM_TYPES.INT,
    domain: { min: 20, max: 40, step: 2 },
    label: 'MACD Slow',
    group: 'Trend',
    indicator: 'MACD',
  },
  {
    key: 'MACD.signal',
    type: PARAM_TYPES.INT,
    domain: { min: 6, max: 14, step: 1 },
    label: 'MACD Signal',
    group: 'Trend',
    indicator: 'MACD',
  },
  {
    key: 'BB.time',
    type: PARAM_TYPES.INT,
    domain: { min: 14, max: 30, step: 2 },
    label: 'BB Period',
    group: 'Volatility',
    indicator: 'BB',
  },
  {
    key: 'BB.devUp',
    type: PARAM_TYPES.FLOAT,
    domain: { min: 0.5, max: 2.5, step: 0.1, precision: 1 },
    label: 'BB Dev Up',
    group: 'Volatility',
    indicator: 'BB',
  },
  {
    key: 'BB.devDown',
    type: PARAM_TYPES.FLOAT,
    domain: { min: 0.5, max: 2.5, step: 0.1, precision: 1 },
    label: 'BB Dev Down',
    group: 'Volatility',
    indicator: 'BB',
  },
  {
    key: 'RSI.period',
    type: PARAM_TYPES.INT,
    domain: { min: 10, max: 22, step: 2 },
    label: 'RSI Period',
    group: 'Momentum',
    indicator: 'RSI',
  },
  {
    key: 'RSI.overbought',
    type: PARAM_TYPES.INT,
    domain: { allowedValues: [65, 70, 75, 80] },
    label: 'RSI Overbought',
    group: 'Momentum',
    indicator: 'RSI',
  },
  {
    key: 'EMA.period',
    type: PARAM_TYPES.INT,
    domain: { min: 8, max: 32, step: 4 },
    label: 'EMA Period',
    group: 'Trend',
    indicator: 'EMA',
  },
]

export function getSpecByKey(specs, key) {
  return specs.find((s) => s.key === key) ?? null
}
