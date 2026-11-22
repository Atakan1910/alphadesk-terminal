import { useMemo, useState } from 'react';
import { Calculator, RotateCcw } from 'lucide-react';
import { calculateDcfValuation, getDefaultDcfInput } from '../../engine/fundamentalScoring';
import type { DcfInput, StockAsset } from '../../types/market';

interface DcfCalculatorProps {
  asset: StockAsset;
}

export function DcfCalculator({ asset }: DcfCalculatorProps) {
  const defaultInput = useMemo(() => getDefaultDcfInput(asset), [asset]);
  const [input, setInput] = useState<DcfInput>(defaultInput);

  const result = useMemo(() => calculateDcfValuation(asset, input), [asset, input]);

  if (asset.quarters.length === 0) return null;

  const currencySym = asset.currency === 'TRY' ? '₺' : '$';
  const isUndervalued = result.marginOfSafetyPct >= 10;
  const isOvervalued = result.marginOfSafetyPct <= -10;

  const statusText = isUndervalued
    ? 'İskontolu — Mevcut fiyat hesaplanan adil değerin altında.'
    : isOvervalued
      ? 'Primli — Mevcut fiyat hesaplanan adil değerin üzerinde.'
      : 'Adil Değere Yakın — Mevcut fiyat içsel değer bandında.';

  return (
    <section className="border border-[#27272a] bg-[#111113] p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#27272a] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#f59e0b]" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-zinc-100">
              İndirgenmiş Nakit Akışı (DCF) — Adil Değer Hesaplayıcı
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Büyüme ve iskonto oranı (WACC) varsayımlarını değiştirerek hissenin içsel değerini canlı
            test edin.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setInput(defaultInput)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#27272a] bg-[#09090b] hover:border-zinc-500 text-xs text-zinc-300"
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Varsayılana Dön</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sol: Varsayım Slider'ları */}
        <div className="lg:col-span-5 space-y-4 border border-[#27272a] bg-[#09090b] p-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-300">Yıllık Nakit Akışı Büyümesi</span>
              <span className="font-mono tabular-nums text-[#f59e0b]">
                %{input.growthRatePct.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={35}
              step={0.5}
              value={input.growthRatePct}
              onChange={(e) =>
                setInput((prev) => ({ ...prev, growthRatePct: Number(e.target.value) }))
              }
              className="w-full accent-[#f59e0b]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-300">İskonto Oranı (WACC)</span>
              <span className="font-mono tabular-nums text-[#f59e0b]">
                %{input.waccPct.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={6}
              max={28}
              step={0.5}
              value={input.waccPct}
              onChange={(e) => setInput((prev) => ({ ...prev, waccPct: Number(e.target.value) }))}
              className="w-full accent-[#f59e0b]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-300">Uzun Vadeli Terminal Büyüme</span>
              <span className="font-mono tabular-nums text-zinc-200">
                %{input.terminalGrowthPct.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              step={0.5}
              value={input.terminalGrowthPct}
              onChange={(e) =>
                setInput((prev) => ({ ...prev, terminalGrowthPct: Number(e.target.value) }))
              }
              className="w-full accent-zinc-400"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-300">Projeksiyon Süresi</span>
              <span className="font-mono tabular-nums text-zinc-200">
                {input.projectionYears} Yıl
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={10}
              step={1}
              value={input.projectionYears}
              onChange={(e) =>
                setInput((prev) => ({ ...prev, projectionYears: Number(e.target.value) }))
              }
              className="w-full accent-zinc-400"
            />
          </div>
        </div>

        {/* Sağ: Hesaplanan İçsel Değer & Projeksiyon */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono tabular-nums">
            <div className="border border-[#27272a] bg-[#09090b] p-4">
              <div className="text-[11px] font-sans text-zinc-400">Mevcut Fiyat</div>
              <div className="text-xl font-semibold text-zinc-100 mt-1">
                {currencySym}
                {result.currentPrice.toFixed(2)}
              </div>
            </div>

            <div className="border border-[#f59e0b]/40 bg-[#09090b] p-4">
              <div className="text-[11px] font-sans text-[#f59e0b]">Hesaplanan Adil Değer</div>
              <div className="text-xl font-semibold text-zinc-100 mt-1">
                {currencySym}
                {result.intrinsicValuePerShare.toFixed(2)}
              </div>
            </div>

            <div className="border border-[#27272a] bg-[#09090b] p-4">
              <div className="text-[11px] font-sans text-zinc-400">Güvenlik Marjı / Potansiyel</div>
              <div
                className={`text-xl font-semibold mt-1 ${
                  result.marginOfSafetyPct >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
                }`}
              >
                {result.marginOfSafetyPct >= 0 ? '+' : ''}
                {result.marginOfSafetyPct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                Potansiyel: {result.upsidePct >= 0 ? '+' : ''}
                {result.upsidePct.toFixed(1)}%
              </div>
            </div>
          </div>

          <div
            className={`px-3.5 py-2.5 border text-xs ${
              isUndervalued
                ? 'border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]'
                : isOvervalued
                  ? 'border-[#f43f5e]/40 bg-[#f43f5e]/10 text-[#f43f5e]'
                  : 'border-[#27272a] bg-[#18181b] text-zinc-300'
            }`}
          >
            {statusText}
          </div>

          <div className="border border-[#27272a] bg-[#09090b] overflow-x-auto">
            <table className="w-full text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-[#27272a] text-zinc-500 text-left">
                  <th className="px-3 py-2 font-normal">Yıl</th>
                  <th className="px-3 py-2 font-normal text-right">Tahmini FCF (Mn)</th>
                  <th className="px-3 py-2 font-normal text-right">Bugünkü Değer (PV)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]/50">
                {result.projectedCashFlows.map((row) => (
                  <tr key={row.year}>
                    <td className="px-3 py-1.5 text-zinc-300">Yıl +{row.year}</td>
                    <td className="px-3 py-1.5 text-right text-zinc-300">
                      {currencySym}
                      {row.fcf.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}
                    </td>
                    <td className="px-3 py-1.5 text-right text-zinc-100">
                      {currencySym}
                      {row.discountedFcf.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#111113] text-zinc-200">
                  <td className="px-3 py-2 font-sans">Terminal Değer (Bugünkü Değer)</td>
                  <td className="px-3 py-2 text-right text-zinc-500">—</td>
                  <td className="px-3 py-2 text-right text-[#f59e0b]">
                    {currencySym}
                    {result.terminalValuePv.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

