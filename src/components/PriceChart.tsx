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

type Props = {
  asset: string
  latestPrice?: number
  predictions?: { label: string; price: number }[]
  height?: number
}

const WINDOW_SECONDS = 5 * 60   // 5-minute sliding window
const LOOKAHEAD = 10             // right-side padding seconds
const TICK_MS = 40               // 25 fps

function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function now(): UTCTimestamp {
  return Math.floor(Date.now() / 1000) as UTCTimestamp
}

export default function PriceChart({ asset, latestPrice, predictions = [], height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const predLinesRef = useRef<ReturnType<ISeriesApi<'Line'>['createPriceLine']>[]>([])
  const latestPriceRef = useRef<number | undefined>(latestPrice)
  const { theme } = useTheme()

  // Keep latest price accessible from the animation loop without stale closure
  useEffect(() => { latestPriceRef.current = latestPrice }, [latestPrice])

  // ─── Chart creation, history load, animation loop ─────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { color: readVar('--chart-bg') },
        textColor: readVar('--chart-text'),
      },
      grid: {
        vertLines: { color: readVar('--chart-grid') },
        horzLines: { color: readVar('--chart-grid') },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: readVar('--chart-border') },
      timeScale: {
        borderColor: readVar('--chart-border'),
        timeVisible: true,
        secondsVisible: true,
        rightOffset: 3,
        lockVisibleTimeRangeOnResize: true,
      },
      handleScroll: false,
      handleScale: false,
    })
    chartRef.current = chart

    const series = chart.addLineSeries({
      color: readVar('--chart-line'),
      lineWidth: 2,
      lineType: LineType.Curved,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      crosshairMarkerVisible: false,
    })
    seriesRef.current = series

    // Load 5 min of history, then draw prediction lines on top
    fetch(`/api/prices/history/${asset}`)
      .then(r => r.json())
      .then((ticks: { time: number; price: number }[]) => {
        if (!seriesRef.current) return
        for (const tick of ticks) {
          seriesRef.current.update({ time: tick.time as UTCTimestamp, value: tick.price })
        }
        // Slide window to current position after history loads
        const t = now()
        chart.timeScale().setVisibleRange({
          from: (t - WINDOW_SECONDS) as UTCTimestamp,
          to: (t + LOOKAHEAD) as UTCTimestamp,
        })
      })
      .catch(() => {})

    // 25 fps animation loop — repeat last known price every frame
    const loopId = setInterval(() => {
      if (!seriesRef.current || latestPriceRef.current === undefined) return
      const t = now()
      seriesRef.current.update({ time: t, value: latestPriceRef.current })
      chart.timeScale().setVisibleRange({
        from: (t - WINDOW_SECONDS) as UTCTimestamp,
        to: (t + LOOKAHEAD) as UTCTimestamp,
      })
    }, TICK_MS)

    // Resize observer
    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth })
    })
    ro.observe(container)

    return () => {
      clearInterval(loopId)
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      predLinesRef.current = []
    }
  }, [asset, height]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Prediction price lines ────────────────────────────────────────────────
  function applyPredictionLines(preds: { label: string; price: number }[]) {
    if (!seriesRef.current) return
    for (const line of predLinesRef.current) seriesRef.current.removePriceLine(line)
    predLinesRef.current = preds
      .filter(p => p.price > 0)
      .map(p =>
        seriesRef.current!.createPriceLine({
          price: p.price,
          color: readVar('--chart-pred'),
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: p.label,
        })
      )
  }

  useEffect(() => {
    applyPredictionLines(predictions)
  }, [predictions]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Theme colour update (no chart recreation) ─────────────────────────────
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return
    chartRef.current.applyOptions({
      layout: { background: { color: readVar('--chart-bg') }, textColor: readVar('--chart-text') },
      grid: { vertLines: { color: readVar('--chart-grid') }, horzLines: { color: readVar('--chart-grid') } },
      rightPriceScale: { borderColor: readVar('--chart-border') },
      timeScale: { borderColor: readVar('--chart-border') },
    })
    seriesRef.current.applyOptions({ color: readVar('--chart-line') })
    applyPredictionLines(predictions)
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
