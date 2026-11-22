import { useEffect, useRef } from 'react';
import {
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type HistogramData,
  type IChartApi,
  type LineData,
  type LogicalRange,
  type Time,
} from 'lightweight-charts';
import { calculateSMA } from '../../engine/technicalIndicators';
import type { OHLCVBar, TechnicalSnapshot } from '../../types/market';
import type { SubChartKey } from './IndicatorToolbar';

interface SubChartPanelProps {
  type: SubChartKey;
  bars: OHLCVBar[];
  technical: TechnicalSnapshot;
  visibleRange: LogicalRange | null;
}

const TITLES: Record<SubChartKey, string> = {
  VOLUME: 'HACİM & 20G ORTALAMA',
  RSI: 'RSI (14) — GÖRELİ GÜÇ ENDEKSİ',
  MACD: 'MACD (12, 26, 9)',
  ATR: 'ATR (14) — VOLATİLİTE',
  STOCHASTIC: 'STOCHASTIC OSCILLATOR (14, 3, 3)',
};

export function SubChartPanel({ type, bars, technical, visibleRange }: SubChartPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const lastIdx = bars.length - 1;

  const badgeText = (() => {
    if (lastIdx < 0) return '-';
    if (type === 'VOLUME') {
      return `${(bars[lastIdx].volume / 1e6).toFixed(2)}M`;
    }
    if (type === 'RSI') {
      const v = technical.rsi14[lastIdx];
      return v !== null ? v.toFixed(2) : '-';
    }
    if (type === 'MACD') {
      const m = technical.macd[lastIdx];
      if (!m || m.macd === null || m.signal === null) return '-';
      return `M: ${m.macd.toFixed(2)} · S: ${m.signal.toFixed(2)}`;
    }
    if (type === 'ATR') {
      const a = technical.atr14[lastIdx];
      return a !== null ? a.toFixed(2) : '-';
    }
    const st = technical.stochastic[lastIdx];
    if (!st || st.k === null || st.d === null) return '-';
    return `%K: ${st.k.toFixed(1)} · %D: ${st.d.toFixed(1)}`;
  })();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || bars.length === 0) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 135,
      layout: {
        background: { type: ColorType.Solid, color: '#09090b' },
        textColor: '#71717a',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#18181b' },
        horzLines: { color: '#18181b' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#3f3f46', width: 1, style: LineStyle.Dashed },
        horzLine: { color: '#3f3f46', width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: '#27272a',
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: false,
        rightOffset: 6,
      },
    });

    chartRef.current = chart;

    if (type === 'VOLUME') {
      const hist = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const histData: HistogramData<Time>[] = bars.map((b) => ({
        time: b.time as Time,
        value: b.volume,
        color: b.close >= b.open ? 'rgba(16, 185, 129, 0.55)' : 'rgba(244, 63, 94, 0.55)',
      }));
      hist.setData(histData);

      const volSma = calculateSMA(
        bars.map((b) => b.volume),
        20
      );
      const smaSeries = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const smaData: LineData<Time>[] = [];
      for (let i = 0; i < bars.length; i++) {
        const v = volSma[i];
        if (v !== null) smaData.push({ time: bars[i].time as Time, value: v });
      }
      smaSeries.setData(smaData);
    } else if (type === 'RSI') {
      const rsiSeries = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 2,
        priceLineVisible: false,
      });
      const rsiData: LineData<Time>[] = [];
      for (let i = 0; i < bars.length; i++) {
        const v = technical.rsi14[i];
        if (v !== null) rsiData.push({ time: bars[i].time as Time, value: v });
      }
      rsiSeries.setData(rsiData);

      rsiSeries.createPriceLine({
        price: 70,
        color: '#f43f5e',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '70',
      });
      rsiSeries.createPriceLine({
        price: 30,
        color: '#10b981',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '30',
      });
    } else if (type === 'MACD') {
      const hist = chart.addSeries(HistogramSeries, {
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const histData: HistogramData<Time>[] = [];
      const macdData: LineData<Time>[] = [];
      const sigData: LineData<Time>[] = [];

      for (const pt of technical.macd) {
        if (pt.histogram !== null) {
          histData.push({
            time: pt.time as Time,
            value: pt.histogram,
            color: pt.histogram >= 0 ? 'rgba(16, 185, 129, 0.55)' : 'rgba(244, 63, 94, 0.55)',
          });
        }
        if (pt.macd !== null) macdData.push({ time: pt.time as Time, value: pt.macd });
        if (pt.signal !== null) sigData.push({ time: pt.time as Time, value: pt.signal });
      }

      hist.setData(histData);
      const macdLine = chart.addSeries(LineSeries, {
        color: '#38bdf8',
        lineWidth: 1,
        priceLineVisible: false,
      });
      macdLine.setData(macdData);

      const sigLine = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
        priceLineVisible: false,
      });
      sigLine.setData(sigData);
    } else if (type === 'ATR') {
      const atrLine = chart.addSeries(LineSeries, {
        color: '#a855f7',
        lineWidth: 2,
        priceLineVisible: false,
      });
      const atrData: LineData<Time>[] = [];
      for (let i = 0; i < bars.length; i++) {
        const v = technical.atr14[i];
        if (v !== null) atrData.push({ time: bars[i].time as Time, value: v });
      }
      atrLine.setData(atrData);
    } else if (type === 'STOCHASTIC') {
      const kSeries = chart.addSeries(LineSeries, {
        color: '#38bdf8',
        lineWidth: 1,
        priceLineVisible: false,
      });
      const dSeries = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
        priceLineVisible: false,
      });
      const kData: LineData<Time>[] = [];
      const dData: LineData<Time>[] = [];
      for (const pt of technical.stochastic) {
        if (pt.k !== null) kData.push({ time: pt.time as Time, value: pt.k });
        if (pt.d !== null) dData.push({ time: pt.time as Time, value: pt.d });
      }
      kSeries.setData(kData);
      dSeries.setData(dData);

      kSeries.createPriceLine({
        price: 80,
        color: '#f43f5e',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '80',
      });
      kSeries.createPriceLine({
        price: 20,
        color: '#10b981',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '20',
      });
    }

    if (visibleRange) {
      chart.timeScale().setVisibleLogicalRange(visibleRange);
    } else {
      chart.timeScale().fitContent();
    }

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
  }, [type, bars, technical, visibleRange]);

  useEffect(() => {
    if (chartRef.current && visibleRange) {
      chartRef.current.timeScale().setVisibleLogicalRange(visibleRange);
    }
  }, [visibleRange]);

  return (
    <div className="border-b border-[#27272a] bg-[#09090b]">
      <div className="flex items-center justify-between px-3 py-1 bg-[#111113] border-b border-[#27272a]/70 text-[10px] font-mono tabular-nums">
        <span className="text-zinc-400 tracking-wider">{TITLES[type]}</span>
        <span className="text-zinc-200">{badgeText}</span>
      </div>
      <div ref={containerRef} className="w-full h-[135px]" />
    </div>
  );
}
