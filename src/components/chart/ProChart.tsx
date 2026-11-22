import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  LineStyle,
  createChart,
  type CandlestickData,
  type IChartApi,
  type LineData,
  type LogicalRange,
  type Time,
} from 'lightweight-charts';
import { Star } from 'lucide-react';
import type { OHLCVBar, StockAsset, TechnicalSnapshot, TimeframeKey } from '../../types/market';
import {
  IndicatorToolbar,
  type OverlayConfig,
  type SubChartKey,
} from './IndicatorToolbar';

interface ProChartProps {
  asset: StockAsset;
  technical: TechnicalSnapshot;
  timeframe: TimeframeKey;
  onTimeframeChange: (tf: TimeframeKey) => void;
  overlays: OverlayConfig;
  onToggleOverlay: (key: keyof OverlayConfig) => void;
  activeSubCharts: SubChartKey[];
  onToggleSubChart: (key: SubChartKey) => void;
  isWatched: boolean;
  onToggleWatchlist: () => void;
  onVisibleRangeChange?: (range: LogicalRange | null) => void;
}

const TIMEFRAME_BAR_COUNTS: Record<TimeframeKey, number> = {
  '1G': 5,
  '1H': 10,
  '1A': 22,
  '3A': 66,
  '6A': 132,
  '1Y': 252,
};

function toLineData(bars: OHLCVBar[], values: (number | null)[]): LineData<Time>[] {
  const out: LineData<Time>[] = [];
  for (let i = 0; i < bars.length; i++) {
    const v = values[i];
    if (v !== null && Number.isFinite(v)) {
      out.push({ time: bars[i].time as Time, value: v });
    }
  }
  return out;
}

export function ProChart({
  asset,
  technical,
  timeframe,
  onTimeframeChange,
  overlays,
  onToggleOverlay,
  activeSubCharts,
  onToggleSubChart,
  isWatched,
  onToggleWatchlist,
  onVisibleRangeChange,
}: ProChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rangeCallbackRef = useRef(onVisibleRangeChange);

  useEffect(() => {
    rangeCallbackRef.current = onVisibleRangeChange;
  }, [onVisibleRangeChange]);

  const [chartStyle, setChartStyle] = useState<'LINE' | 'CANDLE'>('LINE');
  const [hoveredBar, setHoveredBar] = useState<OHLCVBar | null>(null);

  const bars = asset.bars;
  const barMap = useMemo(() => {
    const map = new Map<string, OHLCVBar>();
    for (const b of bars) map.set(b.time, b);
    return map;
  }, [bars]);

  const visibleCount = TIMEFRAME_BAR_COUNTS[timeframe] ?? 132;
  const startIdx = Math.max(0, bars.length - visibleCount);
  const periodStartBar = bars[startIdx] ?? bars[0] ?? null;
  const lastBar = bars[bars.length - 1] ?? null;

  const displayBar = hoveredBar ?? lastBar;
  const basePrice = periodStartBar?.close ?? displayBar?.close ?? 0;
  const periodDiff = displayBar ? displayBar.close - basePrice : 0;
  const periodPct = basePrice > 0 ? (periodDiff / basePrice) * 100 : 0;
  const isPeriodUp = (lastBar?.close ?? 0) >= basePrice;
  const mainLineColor = isPeriodUp ? '#10b981' : '#f43f5e';
  const currencySym = asset.currency === 'TRY' ? '₺' : '$';

  useEffect(() => {
    const container = containerRef.current;
    if (!container || bars.length === 0) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 360,
      layout: {
        background: { type: ColorType.Solid, color: '#09090b' },
        textColor: '#71717a',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#18181b' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#52525b', width: 1, style: LineStyle.Dashed },
        horzLine: { color: '#52525b', width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: false,
        rightOffset: 5,
      },
    });

    chartRef.current = chart;

    const primarySeries =
      chartStyle === 'LINE'
        ? chart.addSeries(LineSeries, {
            color: mainLineColor,
            lineWidth: 2,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
            priceLineVisible: true,
            priceLineColor: mainLineColor,
            priceLineStyle: LineStyle.Dotted,
          })
        : chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#f43f5e',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#f43f5e',
          });

    if (chartStyle === 'LINE') {
      const closeData: LineData<Time>[] = bars.map((b) => ({
        time: b.time as Time,
        value: b.close,
      }));
      primarySeries.setData(closeData);

      if (periodStartBar) {
        primarySeries.createPriceLine({
          price: periodStartBar.close,
          color: '#3f3f46',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: '',
        });
      }
    } else {
      const candleData: CandlestickData<Time>[] = bars.map((b) => ({
        time: b.time as Time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }));
      primarySeries.setData(candleData);
    }

    const addLineOverlay = (
      values: (number | null)[],
      color: string,
      lineWidth: 1 | 2 = 1,
      lineStyle: LineStyle = LineStyle.Solid
    ) => {
      const data = toLineData(bars, values);
      if (data.length === 0) return;
      const line = chart.addSeries(LineSeries, {
        color,
        lineWidth,
        lineStyle,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      line.setData(data);
    };

    if (overlays.ema9) addLineOverlay(technical.ema9, '#38bdf8', 1);
    if (overlays.ema21) addLineOverlay(technical.ema21, '#f59e0b', 1);
    if (overlays.ema50) addLineOverlay(technical.ema50, '#a855f7', 1);
    if (overlays.ema200) addLineOverlay(technical.ema200, '#f43f5e', 2);
    if (overlays.sma20) addLineOverlay(technical.sma20, '#e4e4e7', 1, LineStyle.Dotted);
    if (overlays.vwap) addLineOverlay(technical.vwap, '#2dd4bf', 1, LineStyle.Dashed);

    if (overlays.bollinger) {
      addLineOverlay(
        technical.bollinger.map((b) => b.upper),
        '#64748b',
        1,
        LineStyle.Dashed
      );
      addLineOverlay(
        technical.bollinger.map((b) => b.middle),
        '#52525b',
        1,
        LineStyle.Dotted
      );
      addLineOverlay(
        technical.bollinger.map((b) => b.lower),
        '#64748b',
        1,
        LineStyle.Dashed
      );
    }

    if (overlays.sr) {
      technical.supportResistance.forEach((level) => {
        primarySeries.createPriceLine({
          price: level.price,
          color: level.type === 'RESISTANCE' ? '#f43f5e' : '#10b981',
          lineWidth: level.strength === 'STRONG' ? 2 : 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: level.type === 'RESISTANCE' ? 'Direnç' : 'Destek',
        });
      });
    }

    if (overlays.fibonacci) {
      const fibTargets = technical.fibonacci.levels.filter((l) =>
        [0.236, 0.382, 0.5, 0.618].includes(l.ratio)
      );
      fibTargets.forEach((fib) => {
        primarySeries.createPriceLine({
          price: fib.price,
          color: '#eab308',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `Fib ${fib.label}`,
        });
      });
    }

    const total = bars.length;
    const from = Math.max(0, total - visibleCount);
    const to = total + 3;
    chart.timeScale().setVisibleLogicalRange({ from, to });

    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      rangeCallbackRef.current?.(range);
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || typeof param.time !== 'string') {
        setHoveredBar(null);
        return;
      }
      const match = barMap.get(param.time);
      setHoveredBar(match ?? null);
    });

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 0) {
        chart.applyOptions({ width: Math.floor(entry.contentRect.width) });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [bars, technical, overlays, timeframe, barMap, chartStyle, mainLineColor, periodStartBar, visibleCount]);

  return (
    <section className="border border-[#27272a] bg-[#09090b]">
      {/* Midas / Robinhood Tipi Hero Fiyat Başlığı */}
      <div className="px-5 pt-5 pb-3 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono px-1.5 py-0.5 border border-[#27272a] bg-[#111113] text-zinc-300">
              {asset.symbol}
            </span>
            <span className="text-xs text-zinc-500">
              {asset.market === 'BIST' ? 'Borsa İstanbul' : 'Global Borsa'} · {asset.sector}
            </span>
          </div>

          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">{asset.name}</h1>

          {displayBar && (
            <div className="flex flex-wrap items-baseline gap-3 pt-1 font-mono tabular-nums">
              <span className="text-3xl font-semibold text-zinc-100">
                {currencySym}
                {displayBar.close.toFixed(2)}
              </span>
              <span
                className={`text-sm font-medium ${
                  periodDiff >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
                }`}
              >
                {periodDiff >= 0 ? '+' : ''}
                {periodDiff.toFixed(2)} ({periodPct >= 0 ? '+' : ''}
                {periodPct.toFixed(2)}%)
              </span>
              <span className="text-xs text-zinc-500">
                {hoveredBar ? hoveredBar.time : `Son ${timeframe}`}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border border-[#27272a] bg-[#111113] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setChartStyle('LINE')}
              className={`px-2.5 py-1 transition-colors ${
                chartStyle === 'LINE'
                  ? 'bg-[#18181b] text-zinc-100 font-medium'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Çizgi
            </button>
            <button
              type="button"
              onClick={() => setChartStyle('CANDLE')}
              className={`px-2.5 py-1 transition-colors ${
                chartStyle === 'CANDLE'
                  ? 'bg-[#18181b] text-zinc-100 font-medium'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Mum
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleWatchlist}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs transition-colors ${
              isWatched
                ? 'border-[#f59e0b]/50 bg-[#18181b] text-[#f59e0b]'
                : 'border-[#27272a] bg-[#111113] text-zinc-300 hover:border-zinc-500'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${isWatched ? 'fill-[#f59e0b]' : ''}`}
              strokeWidth={1.5}
            />
            <span>{isWatched ? 'Takipte' : 'Takip Et'}</span>
          </button>
        </div>
      </div>

      {/* Temiz Grafik Alanı */}
      <div ref={containerRef} className="w-full h-[360px]" />

      {/* Grafiğin Hemen Altında Vade Seçici + Gösterge Açılır Menüleri */}
      <div className="border-t border-[#27272a]">
        <IndicatorToolbar
          timeframe={timeframe}
          onTimeframeChange={onTimeframeChange}
          overlays={overlays}
          onToggleOverlay={onToggleOverlay}
          activeSubCharts={activeSubCharts}
          onToggleSubChart={onToggleSubChart}
        />
      </div>
    </section>
  );
}
