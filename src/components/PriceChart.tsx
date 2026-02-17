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

function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function zoneColor(zone?: 'gold' | 'silver' | 'dead'): string {
  if (zone === 'gold') return readVar('--gold')
  if (zone === 'silver') return readVar('--silver')
  if (zone === 'dead') return readVar('--dead')
  return readVar('--chart-pred')
}

export default function PriceChart({ asset, latestPrice, predictions = [], height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef   = useRef<HTMLDivElement>(null)
  const chartRef  = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const predLinesRef    = useRef<ReturnType<ISeriesApi<'Line'>['createPriceLine']>[]>([])
  const overlayDivsRef  = useRef<Map<string, HTMLDivElement>>(new Map())

  // Refs used inside the animation loop to avoid stale closures
  const latestPriceRef  = useRef<number | undefined>(latestPrice)
  const predictionsRef  = useRef<ChartPrediction[]>(predictions)
  const heightRef       = useRef(height)

  useEffect(() => { latestPriceRef.current  = latestPrice }, [latestPrice])
  useEffect(() => { predictionsRef.current  = predictions }, [predictions])
  useEffect(() => { heightRef.current       = height },      [height])

  const { theme } = useTheme()

  // ─── Out-of-bounds overlay helpers ─────────────────────────────────────────

  function updateOutOfBoundsOverlays() {
    if (!seriesRef.current || !overlayRef.current) return
    const preds = predictionsRef.current
    const h     = heightRef.current
    const EDGE  = 24   // px from the edge where the indicator sits

    for (const pred of preds) {
      if (!pred.price || pred.price <= 0) continue
      const coord = seriesRef.current.priceToCoordinate(pred.price)
      const isAbove = coord !== null && coord < 0
      const isBelow = coord !== null && coord > h

      let el = overlayDivsRef.current.get(pred.label)

      if (!isAbove && !isBelow) {
        if (el) el.style.display = 'none'
        continue
      }

      if (!el) {
        el = document.createElement('div')
        el.style.cssText = [
          'position:absolute', 'left:6px',
          'padding:2px 7px', 'border-radius:3px',
          'font-size:10px', 'font-weight:700',
          'pointer-events:none', 'white-space:nowrap',
          'opacity:0.65',
        ].join(';')
        overlayRef.current.appendChild(el)
        overlayDivsRef.current.set(pred.label, el)
      }

      const color = zoneColor(pred.zone)
      el.style.display     = 'block'
      el.style.color       = color
      el.style.background  = `${color}20`
      el.style.border      = `1px solid ${color}55`
      el.style.top         = isAbove ? `${EDGE}px` : 'auto'
      el.style.bottom      = isBelow ? `${EDGE}px` : 'auto'
      el.textContent       = isAbove ? `↑ ${pred.label}` : `↓ ${pred.label}`
    }

    // Remove divs whose prediction is gone
    for (const [label, el] of overlayDivsRef.current) {
      if (!preds.find(p => p.label === label)) {
        el.remove()
        overlayDivsRef.current.delete(label)
      }
    }
  }

  // ─── Prediction price lines ─────────────────────────────────────────────────

  function applyPredictionLines(preds: ChartPrediction[]) {
    if (!seriesRef.current) return
    for (const line of predLinesRef.current) seriesRef.current.removePriceLine(line)
    predLinesRef.current = preds
      .filter(p => p.price > 0)
      .map(p =>
        seriesRef.current!.createPriceLine({
          price:            p.price,
          color:            zoneColor(p.zone),
          lineWidth:        1,
          lineStyle:        LineStyle.Dashed,
          axisLabelVisible: true,
          title:            p.label,
        })
      )
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
      // LineType.Curved uses Catmull-Rom splines. lightweight-charts v4 does not
      // expose a tension parameter — the curvature is fixed. Using fractional-
      // second timestamps (Date.now()/1000) gives 25 genuine control points per
      // second so the curve naturally follows the x-axis rather than making
      // large vertical S-curves between 1-second buckets.
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
      updateOutOfBoundsOverlays()
    }, TICK_MS)

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth })
    })
    ro.observe(container)

    return () => {
      clearInterval(loopId)
      ro.disconnect()
      // Clear overlay DOM elements
      for (const el of overlayDivsRef.current.values()) el.remove()
      overlayDivsRef.current.clear()
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
      <div style={{ position: 'relative' }}>
        <div ref={containerRef} style={{ width: '100%', height }} />
        {/* Overlay for out-of-bounds prediction indicators */}
        <div
          ref={overlayRef}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        />
      </div>
    </div>
  )
}
