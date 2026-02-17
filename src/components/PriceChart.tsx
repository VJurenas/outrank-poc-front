import { useEffect, useRef } from 'react'
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  CrosshairMode,
  LineStyle,
  LineType,
} from 'lightweight-charts'
import { useTheme } from '../contexts/ThemeContext.tsx'

export type ChartPrediction = {
  label: string
  price: number
  zone?: 'gold' | 'silver' | 'dead'
}

type Props = {
  asset: string
  latestPrice?: number
  predictions?: ChartPrediction[]
  height?: number
}

const WINDOW_SECONDS = 5 * 60   // 5-minute sliding window
const LOOKAHEAD = 60             // right-side padding — one empty minute on the right
const TICK_MS = 40               // 25 fps (redraws current 1-second bar smoothly)
const TOP_EDGE_PX    = 3    // inset from top when clamping (no time-scale margin up here)
const BOTTOM_EDGE_PX = 30   // inset from bottom — must clear the ~26px time-scale area

function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function zoneColor(zone?: 'gold' | 'silver' | 'dead'): string {
  if (zone === 'gold') return readVar('--gold')
  if (zone === 'silver') return readVar('--silver')
  if (zone === 'dead') return readVar('--dead')
  return readVar('--chart-pred')
}

// Stores the live price line handle plus the original (unclamped) prediction data.
type PredLine = {
  line: ReturnType<ISeriesApi<'Line'>['createPriceLine']>
  originalPrice: number
  label: string
  zone?: ChartPrediction['zone']
  isClamped: boolean   // tracks current state so we only call applyOptions on transitions
}

export default function PriceChart({ asset, latestPrice, predictions = [], height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const seriesRef    = useRef<ISeriesApi<'Line'> | null>(null)
  const predLinesRef = useRef<PredLine[]>([])

  // Refs used inside the animation loop to avoid stale closures
  const latestPriceRef  = useRef<number | undefined>(latestPrice)
  const predictionsRef  = useRef<ChartPrediction[]>(predictions)
  const heightRef       = useRef(height)

  useEffect(() => { latestPriceRef.current  = latestPrice }, [latestPrice])
  useEffect(() => { predictionsRef.current  = predictions }, [predictions])
  useEffect(() => { heightRef.current       = height },      [height])

  const { theme } = useTheme()

  // ─── Prediction price lines ─────────────────────────────────────────────────

  function applyPredictionLines(preds: ChartPrediction[]) {
    if (!seriesRef.current) return
    for (const { line } of predLinesRef.current) seriesRef.current.removePriceLine(line)
    predLinesRef.current = preds
      .filter(p => p.price > 0)
      .map(p => {
        const line = seriesRef.current!.createPriceLine({
          price:            p.price,
          color:            zoneColor(p.zone),
          lineWidth:        1,
          lineStyle:        LineStyle.Dashed,
          axisLabelVisible: true,
          title:            p.label,
        })
        return { line, originalPrice: p.price, label: p.label, zone: p.zone, isClamped: false }
      })
  }

  // Called every animation frame. Clamps each prediction line to the currently
  // visible price range so it is always visible on screen.
  //
  // Range detection uses priceToCoordinate (price → pixel), which reliably returns
  // values outside [0, h] for out-of-range prices. coordinateToPrice is only used
  // to find the edge price when we need to reposition the line.
  //
  // A `isClamped` flag on each PredLine means we only call applyOptions when the
  // visibility state *changes*, which avoids floating-point false positives that
  // would otherwise hide the axis label on within-range lines.
  //
  // When within range:   line sits at originalPrice, title = label, axisLabel visible.
  // When out of range:   line sits at edge price,    title = "label  price", axisLabel hidden.
  function updatePredictionLinePrices() {
    if (!seriesRef.current || predLinesRef.current.length === 0) return
    const series = seriesRef.current
    const h = heightRef.current

    for (const pred of predLinesRef.current) {
      const coord = series.priceToCoordinate(pred.originalPrice)
      if (coord === null) continue  // series not ready yet

      const isAbove = coord < 0
      const isBelow = coord > h

      if (!isAbove && !isBelow) {
        // Within the visible range. Only update if transitioning back from a clamped state.
        if (pred.isClamped) {
          pred.isClamped = false
          pred.line.applyOptions({
            price:            pred.originalPrice,
            title:            pred.label,
            axisLabelVisible: true,
          })
        }
        continue
      }

      // Out of visible range — snap to top or bottom edge.
      // TOP_EDGE_PX is safe (no margin at top).
      // BOTTOM_EDGE_PX is generous enough to clear the ~26px time-scale area.
      const edgePrice = series.coordinateToPrice(isAbove ? TOP_EDGE_PX : h - BOTTOM_EDGE_PX)
      if (edgePrice === null) continue

      pred.isClamped = true
      pred.line.applyOptions({
        price:            edgePrice,
        title:            `${pred.label}   ${pred.originalPrice.toLocaleString()}`,
        axisLabelVisible: true,
      })
    }
  }

  // ─── Chart creation, history load, animation loop ──────────────────────────

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    const chart = createChart(container, {
      width:   container.clientWidth,
      height,
      layout: {
        background: { color: readVar('--chart-bg') },
        textColor:  readVar('--chart-text'),
      },
      grid: {
        vertLines: { color: readVar('--chart-grid') },
        horzLines: { color: readVar('--chart-grid') },
      },
      crosshair:       { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: readVar('--chart-border') },
      timeScale: {
        borderColor:                readVar('--chart-border'),
        timeVisible:                true,
        secondsVisible:             true,   // shows HH:MM:SS in crosshair
        tickMarkFormatter: (time: UTCTimestamp) => {
          // Only show tick labels at 30-second boundaries; returning '' suppresses mark + label
          if ((time as number) % 30 !== 0) return ''
          const d  = new Date((time as number) * 1000)
          const hh = d.getUTCHours().toString().padStart(2, '0')
          const mm = d.getUTCMinutes().toString().padStart(2, '0')
          const ss = d.getUTCSeconds().toString().padStart(2, '0')
          return `${hh}:${mm}:${ss}`
        },
        rightOffset:                3,
        lockVisibleTimeRangeOnResize: true,
      },
      handleScroll: false,
      handleScale:  false,
    })
    chartRef.current = chart

    const series = chart.addLineSeries({
      color:                  readVar('--chart-line'),
      lineWidth:              2,
      lineType:               LineType.Curved,
      priceFormat:            { type: 'price', precision: 2, minMove: 0.01 },
      crosshairMarkerVisible: false,
    })
    seriesRef.current = series

    // Load 5 min of history then set initial visible range
    fetch(`/api/prices/history/${asset}`)
      .then(r => r.json())
      .then((ticks: { time: number; price: number }[]) => {
        if (!seriesRef.current) return
        for (const tick of ticks) {
          seriesRef.current.update({ time: tick.time as UTCTimestamp, value: tick.price })
        }
        const t = Date.now() / 1000
        chart.timeScale().setVisibleRange({
          from: (Math.floor(t) - WINDOW_SECONDS) as UTCTimestamp,
          to:   (Math.floor(t) + LOOKAHEAD)      as UTCTimestamp,
        })
        // Draw prediction lines after history is loaded so series is populated
        applyPredictionLines(predictionsRef.current)
      })
      .catch(() => {})

    // 25 fps animation loop.
    // Series time is floored to whole seconds so data density matches the 1-pt/s history,
    // keeping the x-axis uniformly spaced. Calling update() 25×/s with the same integer
    // second just refreshes the current bar's value, giving smooth price animation.
    const loopId = setInterval(() => {
      if (!seriesRef.current || latestPriceRef.current === undefined) return
      const nowMs = Date.now()
      const t     = nowMs / 1000
      const tSec  = Math.floor(t) as UTCTimestamp   // 1 bar/second — uniform with history
      seriesRef.current.update({ time: tSec, value: latestPriceRef.current })
      chart.timeScale().setVisibleRange({
        from: (t - WINDOW_SECONDS) as UTCTimestamp,
        to:   (t + LOOKAHEAD)      as UTCTimestamp,
      })
      updatePredictionLinePrices()
    }, TICK_MS)

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth })
    })
    ro.observe(container)

    return () => {
      clearInterval(loopId)
      ro.disconnect()
      chart.remove()
      chartRef.current  = null
      seriesRef.current = null
      predLinesRef.current = []
    }
  }, [asset, height]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Redraw prediction lines when predictions or theme change ───────────────

  useEffect(() => {
    applyPredictionLines(predictions)
  }, [predictions]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Use rAF so readVar() fires after the browser has committed the new
    // data-theme attribute and recomputed CSS custom property values.
    // Without this, the first theme switch reads stale variable values and
    // subsequent switches appear inverted.
    requestAnimationFrame(() => {
      if (!chartRef.current || !seriesRef.current) return
      chartRef.current.applyOptions({
        layout: {
          background: { color: readVar('--chart-bg') },
          textColor:  readVar('--chart-text'),
        },
        grid: {
          vertLines: { color: readVar('--chart-grid') },
          horzLines: { color: readVar('--chart-grid') },
        },
        rightPriceScale: { borderColor: readVar('--chart-border') },
        timeScale:       { borderColor: readVar('--chart-border') },
      })
      seriesRef.current.applyOptions({ color: readVar('--chart-line') })
      applyPredictionLines(predictions)
    })
  }, [theme]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 4 }}>
        {asset} / USDT
        {latestPrice !== undefined && (
          <span style={{ color: 'var(--text)', marginLeft: 12, fontSize: 16, fontWeight: 700 }}>
            {latestPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        )}
      </div>
      <div ref={containerRef} style={{ width: '100%', height }} />
    </div>
  )
}
