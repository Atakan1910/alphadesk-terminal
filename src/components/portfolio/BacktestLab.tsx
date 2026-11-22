import { useMemo, useState } from 'react';
import { FlaskConical, Info } from 'lucide-react';
import { runStrategyBacktest } from '../../engine/backtestEngine';
import type { StockAsset, StrategyType } from '../../types/market';

interface BacktestLabProps {
  asset: StockAsset;
}

const STRATEGY_META: Record<StrategyType, { label: string; rule: string }> = {
  EMA_CROSS_9_21: {
    label: 'EMA 9 / 21 Kesişimi',
    rule: 'EMA 9, EMA 21 çizgisini yukarı kestiğinde al; aşağı kestiğinde sat ve nakitte bekle.',
  },
  RSI_MEAN_REVERSION: {
    label: 'RSI 30 / 70 Ortalamaya Dönüş',
    rule: 'RSI (14) 30 altına indiğinde al; 70 üzerine çıktığında kâr al ve nakitte bekle.',
  },
};

export function BacktestLab({ asset }: BacktestLabProps) {
  const [strategy, setStrategy] = useState<StrategyType>('EMA_CROSS_9_21');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const result = useMemo(
    () => runStrategyBacktest(asset.bars, strategy),
    [asset.bars, strategy]
  );

  const curve = result.equityCurve;
  const activeIdx =
    hoverIdx !== null ? Math.min(Math.max(0, hoverIdx), Math.max(0, curve.length - 1)) : curve.length - 1;
  const activePoint = curve[activeIdx] ?? null;

  // Saf SVG çizgisel özkaynak eğrisi hesaplaması (sütunsuz)
  const width = 760;
  const height = 240;
  const padL = 52;
  const padR = 20;
  const padT = 18;
  const padB = 30;
  const usableW = width - padL - padR;
  const usableH = height - padT - padB;

  const allVals = curve.flatMap((c) => [c.strategy, c.buyHold]);
  const rawMin = allVals.length > 0 ? Math.min(...allVals, 100) : 90;
  const rawMax = allVals.length > 0 ? Math.max(...allVals, 100) : 110;
  const padV = Math.max(2, (rawMax - rawMin) * 0.08);
  const minVal = rawMin - padV;
  const maxVal = rawMax + padV;
  const span = Math.max(1, maxVal - minVal);

  const xOf = (i: number) =>
    curve.length > 1 ? padL + (i / (curve.length - 1)) * usableW : padL;
  const yOf = (val: number) => padT + ((maxVal - val) / span) * usableH;

  const stratPolyline = curve
    .map((pt, i) => `${xOf(i).toFixed(1)},${yOf(pt.strategy).toFixed(1)}`)
    .join(' ');
  const bhPolyline = curve
    .map((pt, i) => `${xOf(i).toFixed(1)},${yOf(pt.buyHold).toFixed(1)}`)
    .join(' ');

  const yTicks = [0, 0.33, 0.66, 1].map((r) => ({
    y: padT + usableH * r,
    val: maxVal - span * r,
  }));

  const sym = asset.currency === 'TRY' ? '₺' : '$';

  return (
    <div className="space-y-5">
      <section className="border border-[#27272a] bg-[#111113] p-5 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#27272a] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-[#f59e0b]" strokeWidth={1.5} />
              <h2 className="text-sm font-semibold text-zinc-100">
                1 Yıllık Strateji Backtest Laboratuvarı — {asset.symbol}
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">{STRATEGY_META[strategy].rule}</p>
          </div>

          <div className="flex items-center gap-1.5">
            {(['EMA_CROSS_9_21', 'RSI_MEAN_REVERSION'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setStrategy(key);
                  setHoverIdx(null);
                }}
                className={`px-3 py-1.5 text-xs border transition-colors ${
                  strategy === key
                    ? 'border-[#f59e0b] bg-[#18181b] text-zinc-100 font-medium'
                    : 'border-[#27272a] bg-[#09090b] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {STRATEGY_META[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Özeti */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono tabular-nums">
          <div className="border border-[#27272a] bg-[#09090b] p-3">
            <div className="text-[11px] font-sans text-zinc-400">Strateji Getirisi</div>
            <div
              className={`text-base font-semibold mt-1 ${
                result.totalReturnPct >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
              }`}
            >
              {result.totalReturnPct >= 0 ? '+' : ''}
              {result.totalReturnPct.toFixed(2)}%
            </div>
          </div>

          <div className="border border-[#27272a] bg-[#09090b] p-3">
            <div className="text-[11px] font-sans text-zinc-400">Al-Tut (Buy & Hold)</div>
            <div
              className={`text-base font-semibold mt-1 ${
                result.buyAndHoldReturnPct >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
              }`}
            >
              {result.buyAndHoldReturnPct >= 0 ? '+' : ''}
              {result.buyAndHoldReturnPct.toFixed(2)}%
            </div>
          </div>

          <div className="border border-[#27272a] bg-[#09090b] p-3">
            <div className="text-[11px] font-sans text-zinc-400">Alfa (Fark)</div>
            <div
              className={`text-base font-semibold mt-1 ${
                result.alphaPct >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
              }`}
            >
              {result.alphaPct >= 0 ? '+' : ''}
              {result.alphaPct.toFixed(2)}%
            </div>
          </div>

          <div className="border border-[#27272a] bg-[#09090b] p-3">
            <div className="text-[11px] font-sans text-zinc-400">İşlem / Kazanma</div>
            <div className="text-base font-semibold text-zinc-100 mt-1">
              {result.tradeCount} · %{result.winRatePct.toFixed(0)}
            </div>
          </div>

          <div className="border border-[#27272a] bg-[#09090b] p-3">
            <div className="text-[11px] font-sans text-zinc-400">Max Drawdown</div>
            <div className="text-base font-semibold text-[#f43f5e] mt-1">
              -%{result.maxDrawdownPct.toFixed(2)}
            </div>
          </div>

          <div className="border border-[#27272a] bg-[#09090b] p-3">
            <div className="text-[11px] font-sans text-zinc-400">Sharpe Oranı</div>
            <div className="text-base font-semibold text-[#f59e0b] mt-1">
              {result.sharpeRatio.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Çizgisel Özkaynak Eğrisi (Başlangıç = 100) */}
        {curve.length > 1 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border border-[#27272a] bg-[#09090b] text-xs font-mono tabular-nums">
              <span className="text-zinc-400">
                Baz = 100 · Tarih:{' '}
                <strong className="text-zinc-100">{activePoint?.time ?? '-'}</strong>
              </span>
              <div className="flex items-center gap-4">
                <span className="text-[#f59e0b]">
                  — Strateji: {activePoint?.strategy.toFixed(2) ?? '-'}
                </span>
                <span className="text-zinc-400">
                  -- Al-Tut: {activePoint?.buyHold.toFixed(2) ?? '-'}
                </span>
              </div>
            </div>

            <div className="w-full overflow-x-auto border border-[#27272a] bg-[#09090b] p-2">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-56 min-w-[500px]"
                onMouseLeave={() => setHoverIdx(null)}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relX = ((e.clientX - rect.left) / rect.width) * width;
                  const ratio = (relX - padL) / usableW;
                  const idx = Math.round(ratio * (curve.length - 1));
                  setHoverIdx(Math.min(Math.max(0, idx), curve.length - 1));
                }}
              >
                {yTicks.map((t, idx) => (
                  <g key={idx}>
                    <line
                      x1={padL}
                      y1={t.y}
                      x2={width - padR}
                      y2={t.y}
                      stroke="#18181b"
                      strokeWidth={1}
                    />
                    <text
                      x={padL - 8}
                      y={t.y + 3}
                      textAnchor="end"
                      fill="#71717a"
                      fontSize="10"
                      fontFamily="ui-monospace, monospace"
                    >
                      {t.val.toFixed(0)}
                    </text>
                  </g>
                ))}

                {/* 100 Başlangıç Çizgisi */}
                <line
                  x1={padL}
                  y1={yOf(100)}
                  x2={width - padR}
                  y2={yOf(100)}
                  stroke="#27272a"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />

                {/* Al-Tut Eğrisi */}
                <polyline
                  fill="none"
                  stroke="#71717a"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  points={bhPolyline}
                />

                {/* Strateji Eğrisi */}
                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  points={stratPolyline}
                />

                {activePoint && (
                  <g>
                    <line
                      x1={xOf(activeIdx)}
                      y1={padT}
                      x2={xOf(activeIdx)}
                      y2={height - padB}
                      stroke="#3f3f46"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={xOf(activeIdx)}
                      cy={yOf(activePoint.buyHold)}
                      r={3.5}
                      fill="#71717a"
                    />
                    <circle
                      cx={xOf(activeIdx)}
                      cy={yOf(activePoint.strategy)}
                      r={4.5}
                      fill="#f59e0b"
                    />
                  </g>
                )}

                {/* X Ekseni Başlangıç / Orta / Bitiş */}
                {[0, Math.floor(curve.length / 2), curve.length - 1].map((idx) => (
                  <text
                    key={idx}
                    x={xOf(idx)}
                    y={height - 8}
                    textAnchor="middle"
                    fill="#71717a"
                    fontSize="10"
                    fontFamily="ui-monospace, monospace"
                  >
                    {curve[idx]?.time}
                  </text>
                ))}
              </svg>
            </div>
          </div>
        )}

        {/* İşlem Geçmişi Tablosu */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-zinc-300">
            Simüle Edilen İşlem Geçmişi ({result.trades.length})
          </div>
          {result.trades.length === 0 ? (
            <div className="border border-[#27272a] bg-[#09090b] p-4 text-xs text-zinc-500">
              Son 1 yıl içinde bu stratejiye ait alım/satım sinyali tetiklenmedi.
            </div>
          ) : (
            <div className="border border-[#27272a] bg-[#09090b] overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-xs font-mono tabular-nums">
                <thead className="sticky top-0 bg-[#111113] border-b border-[#27272a] text-zinc-500 text-left">
                  <tr>
                    <th className="px-3 py-2 font-normal">#</th>
                    <th className="px-3 py-2 font-normal">Alım Tarihi</th>
                    <th className="px-3 py-2 font-normal text-right">Alım Fiyatı</th>
                    <th className="px-3 py-2 font-normal">Satış Tarihi</th>
                    <th className="px-3 py-2 font-normal text-right">Satış Fiyatı</th>
                    <th className="px-3 py-2 font-normal text-right">Getiri</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]/50">
                  {result.trades.map((t, i) => (
                    <tr key={`${t.entryDate}_${i}`}>
                      <td className="px-3 py-1.5 text-zinc-500">{i + 1}</td>
                      <td className="px-3 py-1.5 text-zinc-300">{t.entryDate}</td>
                      <td className="px-3 py-1.5 text-right text-zinc-200">
                        {sym}
                        {t.entryPrice.toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-zinc-300">{t.exitDate}</td>
                      <td className="px-3 py-1.5 text-right text-zinc-200">
                        {sym}
                        {t.exitPrice.toFixed(2)}
                      </td>
                      <td
                        className={`px-3 py-1.5 text-right ${
                          t.returnPct >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
                        }`}
                      >
                        {t.returnPct >= 0 ? '+' : ''}
                        {t.returnPct.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 text-[11px] text-zinc-500 border-t border-[#27272a] pt-3">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>
            Simülasyon komisyon ve kayma (slippage) hariç kapanış fiyatları üzerinden hesaplanır.
            Geçmiş strateji performansı gelecek getiriyi garanti etmez.
          </span>
        </div>
      </section>
    </div>
  );
}
