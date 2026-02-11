import { useEffect, useRef } from 'react'
import { createChart, type IChartApi, type ISeriesApi, CrosshairMode, LineStyle } from 'lightweight-charts'

type Props = {
  asset: string
  latestPrice?: number
  predictions?: { label: string; price: number }[]
  height?: number
}

export default function PriceChart({ asset, latestPrice, predictions = [], height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const priceLines = useRef<ReturnType<ISeriesApi<'Line'>['createPriceLine']>[]>([])

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: { background: { color: '#0d0d0d' }, textColor: '#aaa' },
      grid: { vertLines: { color: '#1a1a1a' }, horzLines: { color: '#1a1a1a' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#2a2a2a' },
      timeScale: { borderColor: '#2a2a2a', timeVisible: true },
    })
    chartRef.current = chart

    const series = chart.addLineSeries({
      color: '#4af',
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    })
    seriesRef.current = series

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: containerRef.current!.clientWidth })
    })
    ro.observe(containerRef.current)

    return () => { ro.disconnect(); chart.remove() }
  }, [height])

  // Push new price point
  useEffect(() => {
    if (!seriesRef.current || latestPrice === undefined) return
    const time = Math.floor(Date.now() / 1000) as unknown as import('lightweight-charts').Time
    seriesRef.current.update({ time, value: latestPrice })
  }, [latestPrice])

  // Draw prediction lines
  useEffect(() => {
    if (!seriesRef.current) return
    for (const line of priceLines.current) seriesRef.current.removePriceLine(line)
    priceLines.current = predictions.map((p) =>
      seriesRef.current!.createPriceLine({
        price: p.price,
        color: '#f5c518',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: p.label,
      })
    )
  }, [predictions])

  return (
    <div>
      <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 4 }}>
        {asset} / USDT
        {latestPrice !== undefined && (
          <span style={{ color: 'white', marginLeft: 12, fontSize: 16, fontWeight: 700 }}>
            {latestPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        )}
      </div>
      <div ref={containerRef} style={{ width: '100%', height }} />
    </div>
  )
}
