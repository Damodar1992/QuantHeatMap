import { useState, useMemo } from 'react'
import { Select, Button } from '@radix-ui/themes'

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
  const [addXValue, setAddXValue] = useState(undefined)
  const [addYValue, setAddYValue] = useState(undefined)
  const xSelected = useMemo(() => new Set(xParams), [xParams])
  const ySelected = useMemo(() => new Set(yParams), [yParams])
  const xAvailable = useMemo(
    () => specs.filter((s) => !xSelected.has(s.key) && !ySelected.has(s.key)),
    [specs, xSelected, ySelected]
  )
  const yAvailable = useMemo(
    () => specs.filter((s) => !ySelected.has(s.key) && !xSelected.has(s.key)),
    [specs, xSelected, ySelected]
  )

  const addX = (key) => {
    if (ySelected.has(key)) return
    const next = [...xParamOrder]
    if (!next.includes(key)) next.push(key)
    onAxisChange({ xParamOrder: next, yParamOrder })
    setAddXValue(undefined)
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
    setAddYValue(undefined)
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
                <Button type="button" variant="ghost" color="gray" size="1" className="axis-tag-remove" onClick={() => removeX(key)} aria-label="Remove">
                  ×
                </Button>
              </span>
            ))}
          </div>
          <Select.Root
            value={addXValue ?? '__add__'}
            onValueChange={(k) => {
              if (k && k !== '__add__') addX(k)
              setAddXValue(undefined)
            }}
            disabled={xAvailable.length === 0}
          >
            <Select.Trigger className="axis-select" size="2" />
            <Select.Content>
              <Select.Item value="__add__" disabled>
                {xAvailable.length === 0 ? 'All params used' : '+ Add param'}
              </Select.Item>
              {xAvailable.map((s) => (
                <Select.Item key={s.key} value={s.key}>{s.label}</Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div className="axis-block">
          <div className="axis-block-title">Axis Y</div>
          <div className="axis-tags">
            {yParamOrder.map((key) => (
              <span key={key} className="axis-tag">
                {specs.find((s) => s.key === key)?.label || key}
                <Button type="button" variant="ghost" color="gray" size="1" className="axis-tag-remove" onClick={() => removeY(key)} aria-label="Remove">
                  ×
                </Button>
              </span>
            ))}
          </div>
          <Select.Root
            value={addYValue ?? '__add__'}
            onValueChange={(k) => {
              if (k && k !== '__add__') addY(k)
              setAddYValue(undefined)
            }}
            disabled={yAvailable.length === 0}
          >
            <Select.Trigger className="axis-select" size="2" />
            <Select.Content>
              <Select.Item value="__add__" disabled>
                {yAvailable.length === 0 ? 'All params used' : '+ Add param'}
              </Select.Item>
              {yAvailable.map((s) => (
                <Select.Item key={s.key} value={s.key}>{s.label}</Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
      </div>
      <div className="axis-config-row axis-aggregator">
        <label className="axis-label">Aggregator</label>
        <Select.Root value={aggregator} onValueChange={setAggregator} size="2">
          <Select.Trigger className="aggregator-select" />
          <Select.Content>
            {AGGREGATORS.map((a) => (
              <Select.Item key={a.value} value={a.value}>{a.label}</Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>
    </div>
  )
}
