import { useMemo } from 'react'

const AGGREGATORS = [
  { value: 'MIN', label: 'Min score' },
  { value: 'AVG', label: 'Avg score' },
  { value: 'MAX', label: 'Max score' },
]

export function AxisConfig({
  specs,
  xParams,
  yParams,
  xParamOrder,
  yParamOrder,
  aggregator,
  onAxisChange,
}) {
  const xSelected = useMemo(() => new Set(xParams), [xParams])
  const ySelected = useMemo(() => new Set(yParams), [yParams])

  const addX = (key) => {
    if (ySelected.has(key)) return
    const next = [...xParamOrder]
    if (!next.includes(key)) next.push(key)
    onAxisChange({ xParamOrder: next, yParamOrder })
  }
  const removeX = (key) => {
    onAxisChange({
      xParamOrder: xParamOrder.filter((k) => k !== key),
      yParamOrder,
    })
  }
  const addY = (key) => {
    if (xSelected.has(key)) return
    const next = [...yParamOrder]
    if (!next.includes(key)) next.push(key)
    onAxisChange({ xParamOrder, yParamOrder: next })
  }
  const removeY = (key) => {
    onAxisChange({
      xParamOrder,
      yParamOrder: yParamOrder.filter((k) => k !== key),
    })
  }
  const setAggregator = (val) => onAxisChange({ aggregator: val })

  return (
    <div className="axis-config">
      <div className="axis-config-row">
        <div className="axis-block">
          <div className="axis-block-title">Axis X</div>
          <div className="axis-tags">
            {xParamOrder.map((key) => (
              <span key={key} className="axis-tag">
                {specs.find((s) => s.key === key)?.label || key}
                <button type="button" className="axis-tag-remove" onClick={() => removeX(key)} aria-label="Remove">
                  ×
                </button>
              </span>
            ))}
          </div>
          <select
            className="axis-select"
            value=""
            onChange={(e) => {
              const k = e.target.value
              if (k) addX(k)
              e.target.value = ''
            }}
          >
            <option value="">+ Add param</option>
            {specs
              .filter((s) => !xSelected.has(s.key) && !ySelected.has(s.key))
              .map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            {xSelected.size + ySelected.size >= specs.length && (
              <option value="" disabled>All params used</option>
            )}
          </select>
        </div>
        <div className="axis-block">
          <div className="axis-block-title">Axis Y</div>
          <div className="axis-tags">
            {yParamOrder.map((key) => (
              <span key={key} className="axis-tag">
                {specs.find((s) => s.key === key)?.label || key}
                <button type="button" className="axis-tag-remove" onClick={() => removeY(key)} aria-label="Remove">
                  ×
                </button>
              </span>
            ))}
          </div>
          <select
            className="axis-select"
            value=""
            onChange={(e) => {
              const k = e.target.value
              if (k) addY(k)
              e.target.value = ''
            }}
          >
            <option value="">+ Add param</option>
            {specs
              .filter((s) => !ySelected.has(s.key) && !xSelected.has(s.key))
              .map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
          </select>
        </div>
      </div>
      <div className="axis-config-row axis-aggregator">
        <label className="axis-label">Aggregator</label>
        <select
          className="axis-select aggregator-select"
          value={aggregator}
          onChange={(e) => setAggregator(e.target.value)}
        >
          {AGGREGATORS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
