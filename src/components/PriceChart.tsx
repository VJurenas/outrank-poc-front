import { useEffect, useRef } from 'react'
import { createChart, type IChartApi, type ISeriesApi, CrosshairMode, LineStyle } from 'lightweight-charts'
import { useTheme } from '../contexts/ThemeContext.tsx'

type Props = {
  asset: string
  latestPrice?: number
  predictions?: { label: string; price: number }[]
  height?: number
}

function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export default function PriceChart({ asset, latestPrice, predictions = [], height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const priceLines = useRef<ReturnType<ISeriesApi<'Line'>['createPriceLine']>[]>([])
  const { theme } = useTheme()

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: { background: { color: readVar('--chart-bg') }, textColor: readVar('--chart-text') },
      grid: { vertLines: { color: readVar('--chart-grid') }, horzLines: { color: readVar('--chart-grid') } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: readVar('--chart-border') },
      timeScale: { borderColor: readVar('--chart-border'), timeVisible: true },
    })
    chartRef.current = chart

    const series = chart.addLineSeries({
      color: readVar('--chart-line'),
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

  // Re-apply theme colours when theme changes (no chart recreation)
  useEffect(() => {
    if (!chartRef.current) return
    chartRef.current.applyOptions({
      layout: { background: { color: readVar('--chart-bg') }, textColor: readVar('--chart-text') },
      grid: { vertLines: { color: readVar('--chart-grid') }, horzLines: { color: readVar('--chart-grid') } },
      rightPriceScale: { borderColor: readVar('--chart-border') },
      timeScale: { borderColor: readVar('--chart-border') },
    })
    seriesRef.current?.applyOptions({ color: readVar('--chart-line') })
    // Re-draw prediction lines with updated colour
    for (const line of priceLines.current) seriesRef.current?.removePriceLine(line)
    priceLines.current = predictions.map(p =>
      seriesRef.current!.createPriceLine({
        price: p.price,
        color: readVar('--chart-pred'),
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: p.label,
      })
    )
  }, [theme]) // eslint-disable-line react-hooks/exhaustive-deps

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
        color: readVar('--chart-pred'),
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
          <span style={{ color: 'var(--text)', marginLeft: 12, fontSize: 16, fontWeight: 700 }}>
            {latestPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        )}
      </div>
      <div ref={containerRef} style={{ width: '100%', height }} />
    </div>
  )
}
