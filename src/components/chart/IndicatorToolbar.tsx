import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Layers, SlidersHorizontal } from 'lucide-react';
import type { TimeframeKey } from '../../types/market';

export interface OverlayConfig {
  ema9: boolean;
  ema21: boolean;
  ema50: boolean;
  ema200: boolean;
  sma20: boolean;
  bollinger: boolean;
  vwap: boolean;
  sr: boolean;
  fibonacci: boolean;
}

export type SubChartKey = 'VOLUME' | 'RSI' | 'MACD' | 'ATR' | 'STOCHASTIC';

interface IndicatorToolbarProps {
  timeframe: TimeframeKey;
  onTimeframeChange: (tf: TimeframeKey) => void;
  overlays: OverlayConfig;
  onToggleOverlay: (key: keyof OverlayConfig) => void;
  activeSubCharts: SubChartKey[];
  onToggleSubChart: (key: SubChartKey) => void;
}

const TIMEFRAMES: TimeframeKey[] = ['1G', '1H', '1A', '3A', '6A', '1Y'];

const OVERLAY_ITEMS: { key: keyof OverlayConfig; label: string; desc: string; dot: string }[] = [
  { key: 'ema9', label: 'EMA 9', desc: 'Çok kısa vadeli ortalama', dot: '#38bdf8' },
  { key: 'ema21', label: 'EMA 21', desc: 'Kısa vadeli ana trend çizgisi', dot: '#f59e0b' },
  { key: 'ema50', label: 'EMA 50', desc: 'Orta vadeli trend desteği', dot: '#a855f7' },
  { key: 'ema200', label: 'EMA 200', desc: 'Uzun vadeli ana yön', dot: '#f43f5e' },
  { key: 'sma20', label: 'SMA 20', desc: '20 günlük basit ortalama', dot: '#e4e4e7' },
  { key: 'bollinger', label: 'Bollinger Bantları', desc: 'Fiyat oynaklık kanalı', dot: '#64748b' },
  { key: 'vwap', label: 'VWAP (20G)', desc: 'Hacim ağırlıklı ortalama fiyat', dot: '#2dd4bf' },
  { key: 'sr', label: 'Destek / Direnç', desc: 'Otomatik tepe ve dip seviyeleri', dot: '#10b981' },
  { key: 'fibonacci', label: 'Fibonacci', desc: 'Geri çekilme oranları (%38.2–61.8)', dot: '#eab308' },
];

const SUBCHART_ITEMS: { key: SubChartKey; label: string; desc: string }[] = [
  { key: 'VOLUME', label: 'İşlem Hacmi', desc: 'Günlük hacim ve 20G ortalaması' },
  { key: 'RSI', label: 'RSI (14)', desc: 'Aşırı alım (70+) / satım (30-) göstergesi' },
  { key: 'MACD', label: 'MACD', desc: 'Trend momentumu ve kesişimler' },
  { key: 'ATR', label: 'ATR (14)', desc: 'Günlük ortalama fiyat oynaklığı' },
  { key: 'STOCHASTIC', label: 'Stochastic', desc: 'Kısa vadeli dönüş osilatörü' },
];

export function IndicatorToolbar({
  timeframe,
  onTimeframeChange,
  overlays,
  onToggleOverlay,
  activeSubCharts,
  onToggleSubChart,
}: IndicatorToolbarProps) {
  const [openMenu, setOpenMenu] = useState<'OVERLAY' | 'SUBCHART' | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const activeOverlayCount = Object.values(overlays).filter(Boolean).length;

  return (
    <div
      ref={toolbarRef}
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-[#27272a] bg-[#111113]"
    >
      {/* Zaman Dilimi */}
      <div className="flex items-center gap-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => onTimeframeChange(tf)}
            className={`px-2.5 py-1 text-xs font-mono border transition-colors ${
              timeframe === tf
                ? 'border-[#f59e0b] bg-[#18181b] text-zinc-100 font-medium'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/60'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Sadeleştirilmiş Açılır Gösterge Menüleri */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'OVERLAY' ? null : 'OVERLAY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors ${
              openMenu === 'OVERLAY'
                ? 'border-[#f59e0b] bg-[#18181b] text-zinc-100'
                : 'border-[#27272a] bg-[#09090b] text-zinc-300 hover:border-zinc-500'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#f59e0b]" strokeWidth={1.5} />
            <span>Grafik Çizgileri ({activeOverlayCount})</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
          </button>

          {openMenu === 'OVERLAY' && (
            <div className="absolute right-0 mt-1.5 z-30 w-72 border border-[#27272a] bg-[#111113] p-2 space-y-1 shadow-xl">
              <div className="px-2 py-1 text-[11px] text-zinc-500 border-b border-[#27272a]">
                Mum grafiği üzerine çizilecek göstergeler
              </div>
              {OVERLAY_ITEMS.map((item) => {
                const active = overlays[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onToggleOverlay(item.key)}
                    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left transition-colors ${
                      active ? 'bg-[#18181b] text-zinc-100' : 'text-zinc-400 hover:bg-[#18181b]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 shrink-0"
                        style={{ backgroundColor: active ? item.dot : '#3f3f46' }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-medium">{item.label}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{item.desc}</div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 border ${
                        active
                          ? 'border-[#10b981]/40 text-[#10b981]'
                          : 'border-[#27272a] text-zinc-600'
                      }`}
                    >
                      {active ? 'Açık' : 'Kapalı'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'SUBCHART' ? null : 'SUBCHART')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors ${
              openMenu === 'SUBCHART'
                ? 'border-[#f59e0b] bg-[#18181b] text-zinc-100'
                : 'border-[#27272a] bg-[#09090b] text-zinc-300 hover:border-zinc-500'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
            <span>Alt Göstergeler ({activeSubCharts.length})</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
          </button>

          {openMenu === 'SUBCHART' && (
            <div className="absolute right-0 mt-1.5 z-30 w-72 border border-[#27272a] bg-[#111113] p-2 space-y-1 shadow-xl">
              <div className="px-2 py-1 text-[11px] text-zinc-500 border-b border-[#27272a]">
                Grafik altında açılacak analiz panelleri
              </div>
              {SUBCHART_ITEMS.map((item) => {
                const active = activeSubCharts.includes(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onToggleSubChart(item.key)}
                    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left transition-colors ${
                      active ? 'bg-[#18181b] text-zinc-100' : 'text-zinc-400 hover:bg-[#18181b]/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium">{item.label}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{item.desc}</div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 border ${
                        active
                          ? 'border-[#10b981]/40 text-[#10b981]'
                          : 'border-[#27272a] text-zinc-600'
                      }`}
                    >
                      {active ? 'Açık' : 'Kapalı'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

