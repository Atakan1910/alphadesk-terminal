import { useState } from 'react';
import { AlertTriangle, CalendarClock, Cpu, Gauge, Info, TrendingUp } from 'lucide-react';
import type { MultiHorizonForecastResult, StockAsset } from '../../types/market';
import { MonteCarloConeSvg } from './MonteCarloConeSvg';

interface MultiHorizonForecastProps {
  asset: StockAsset;
  forecast: MultiHorizonForecastResult;
  dcfIntrinsic?: number;
}

type HorizonTab = 'DAILY' | 'SHORT' | 'LONG';

export function MultiHorizonForecast({
  asset,
  forecast,
  dcfIntrinsic,
}: MultiHorizonForecastProps) {
  const [horizon, setHorizon] = useState<HorizonTab>('LONG');

  const currentPrice = asset.bars[asset.bars.length - 1]?.close ?? 0;
  const sym = asset.currency === 'TRY' ? '₺' : '$';
  const pctFromNow = (target: number) =>
    currentPrice > 0 ? ((target - currentPrice) / currentPrice) * 100 : 0;

  const { daily, shortTerm, longTerm } = forecast;
  const bearPct = pctFromNow(longTerm.bearTarget12M);
  const basePct = pctFromNow(longTerm.baseTarget12M);
  const bullPct = pctFromNow(longTerm.bullTarget12M);

  return (
    <div className="space-y-5">
      {/* Üst 3 Vade Seçim Kartı */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setHorizon('DAILY')}
          className={`text-left border p-4 transition-colors ${
            horizon === 'DAILY'
              ? 'border-[#f59e0b] bg-[#18181b]'
              : 'border-[#27272a] bg-[#111113] hover:border-zinc-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-[#f59e0b]" strokeWidth={1.5} />
              Günlük Tahmin (T+1)
            </span>
            <span className="font-mono text-[10px] text-zinc-500">ATR + Pivot</span>
          </div>
          <div className="mt-2 font-mono tabular-nums text-base font-semibold text-zinc-100">
            {sym}
            {daily.expectedLow.toFixed(2)} – {sym}
            {daily.expectedHigh.toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] font-mono tabular-nums text-zinc-400">
            Yükseliş Olasılığı:{' '}
            <span
              className={
                daily.bullishProbabilityPct >= 50 ? 'text-[#10b981]' : 'text-[#f43f5e]'
              }
            >
              %{daily.bullishProbabilityPct} ({daily.momentumBias})
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setHorizon('SHORT')}
          className={`text-left border p-4 transition-colors ${
            horizon === 'SHORT'
              ? 'border-[#f59e0b] bg-[#18181b]'
              : 'border-[#27272a] bg-[#111113] hover:border-zinc-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-[#f59e0b]" strokeWidth={1.5} />
              Kısa Vade ({shortTerm.horizonDays} İş Günü)
            </span>
            <span className="font-mono text-[10px] text-zinc-500">Holt + OLS</span>
          </div>
          <div className="mt-2 font-mono tabular-nums text-base font-semibold text-zinc-100">
            {sym}
            {shortTerm.compositeTarget.toFixed(2)}{' '}
            <span
              className={`text-xs ${
                shortTerm.expectedChangePct >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
              }`}
            >
              ({shortTerm.expectedChangePct >= 0 ? '+' : ''}
              {shortTerm.expectedChangePct.toFixed(2)}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono tabular-nums text-zinc-400">
            Güven Bandı: {sym}
            {shortTerm.lowerBound.toFixed(2)} – {sym}
            {shortTerm.upperBound.toFixed(2)}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setHorizon('LONG')}
          className={`text-left border p-4 transition-colors ${
            horizon === 'LONG'
              ? 'border-[#f59e0b] bg-[#18181b]'
              : 'border-[#27272a] bg-[#111113] hover:border-zinc-500'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#f59e0b]" strokeWidth={1.5} />
              Uzun Vade (12 Ay)
            </span>
            <span className="font-mono text-[10px] text-zinc-500">
              {longTerm.simulations} Monte Carlo
            </span>
          </div>
          <div className="mt-2 font-mono tabular-nums text-base font-semibold text-zinc-100">
            {sym}
            {longTerm.baseTarget12M.toFixed(2)}{' '}
            <span className={`text-xs ${basePct >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'}`}>
              ({basePct >= 0 ? '+' : ''}
              {basePct.toFixed(1)}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono tabular-nums text-zinc-400">
            Ayı / Boğa: {sym}
            {longTerm.bearTarget12M.toFixed(2)} – {sym}
            {longTerm.bullTarget12M.toFixed(2)}
          </div>
        </button>
      </div>

      {/* SEÇİLİ VADE DETAY PANELİ */}
      {horizon === 'DAILY' && (
        <section className="border border-[#27272a] bg-[#111113] p-5 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#27272a] pb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Günlük Hareket Beklentisi (T+1 Seans)
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Bir sonraki işlem gününde fiyatın ATR(14) oynaklığı içinde kalması beklenen aralık
                ve seans pivot seviyeleri.
              </p>
            </div>
            <div className="text-right font-mono tabular-nums text-xs">
              <div className="text-zinc-400">Günlük Ortalama Oynaklık (ATR 14)</div>
              <div className="text-zinc-100 font-semibold mt-0.5">
                ±{sym}
                {daily.atr14.toFixed(2)} (%{daily.atrPct.toFixed(2)})
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono tabular-nums">
            <div className="border border-[#27272a] bg-[#09090b] p-4">
              <div className="text-[11px] font-sans text-zinc-400">Beklenen Taban</div>
              <div className="text-xl font-semibold text-[#f43f5e] mt-1">
                {sym}
                {daily.expectedLow.toFixed(2)}
              </div>
            </div>
            <div className="border border-[#f59e0b]/40 bg-[#09090b] p-4">
              <div className="text-[11px] font-sans text-[#f59e0b]">Beklenen Kapanış Merkezi</div>
              <div className="text-xl font-semibold text-zinc-100 mt-1">
                {sym}
                {daily.expectedClose.toFixed(2)}
              </div>
            </div>
            <div className="border border-[#27272a] bg-[#09090b] p-4">
              <div className="text-[11px] font-sans text-zinc-400">Beklenen Tavan</div>
              <div className="text-xl font-semibold text-[#10b981] mt-1">
                {sym}
                {daily.expectedHigh.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Yön Olasılığı Barı */}
          <div className="space-y-1.5 border border-[#27272a] bg-[#09090b] p-4">
            <div className="flex justify-between text-xs font-mono tabular-nums">
              <span className="text-[#10b981]">
                Yükseliş Olasılığı: %{daily.bullishProbabilityPct.toFixed(1)}
              </span>
              <span className="text-[#f43f5e]">
                Düşüş Olasılığı: %{(100 - daily.bullishProbabilityPct).toFixed(1)}
              </span>
            </div>
            <div className="h-2.5 w-full bg-[#f43f5e]/40 border border-[#27272a] overflow-hidden">
              <div
                className="h-full bg-[#10b981]"
                style={{ width: `${daily.bullishProbabilityPct}%` }}
              />
            </div>
          </div>

          {/* Klasik Pivot Tablosu */}
          <div className="grid grid-cols-7 gap-2 text-center font-mono tabular-nums text-xs">
            {[
              { label: 'S3', val: daily.pivots.s3, tone: 'text-[#10b981]' },
              { label: 'S2', val: daily.pivots.s2, tone: 'text-[#10b981]' },
              { label: 'S1', val: daily.pivots.s1, tone: 'text-[#10b981]' },
              { label: 'PİVOT', val: daily.pivots.p, tone: 'text-[#f59e0b] font-semibold' },
              { label: 'R1', val: daily.pivots.r1, tone: 'text-[#f43f5e]' },
              { label: 'R2', val: daily.pivots.r2, tone: 'text-[#f43f5e]' },
              { label: 'R3', val: daily.pivots.r3, tone: 'text-[#f43f5e]' },
            ].map((item) => (
              <div
                key={item.label}
                className="border border-[#27272a] bg-[#09090b] py-2.5 px-1"
              >
                <div className="text-[10px] text-zinc-500">{item.label}</div>
                <div className={`mt-1 ${item.tone}`}>{item.val.toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 text-[11px] text-zinc-400 border-t border-[#27272a] pt-3">
            <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>{daily.methodology}</span>
          </div>
        </section>
      )}

      {horizon === 'SHORT' && (
        <section className="border border-[#27272a] bg-[#111113] p-5 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#27272a] pb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Kısa Vade Bileşik Projeksiyon ({shortTerm.horizonDays} İş Günü / ~4 Hafta)
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Üç bağımsız istatistiksel modelin ağırlıklı ortalaması ile 1 aylık hedef fiyat ve
                %80 güven bandı.
              </p>
            </div>
            <div className="text-right font-mono tabular-nums text-xs">
              <div className="text-zinc-400">Trend Uyum Katsayısı (R²)</div>
              <div className="text-zinc-100 font-semibold mt-0.5">
                {(shortTerm.rSquared * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono tabular-nums">
            <div className="border border-[#27272a] bg-[#09090b] p-4">
              <div className="text-[11px] font-sans text-zinc-400">Alt Güven Sınırı (%80)</div>
              <div className="text-xl font-semibold text-[#f43f5e] mt-1">
                {sym}
                {shortTerm.lowerBound.toFixed(2)}
              </div>
            </div>
            <div className="border border-[#f59e0b]/40 bg-[#09090b] p-4">
              <div className="text-[11px] font-sans text-[#f59e0b]">Bileşik 20G Hedef</div>
              <div className="text-xl font-semibold text-zinc-100 mt-1">
                {sym}
                {shortTerm.compositeTarget.toFixed(2)}
              </div>
              <div
                className={`text-xs mt-0.5 ${
                  shortTerm.expectedChangePct >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
                }`}
              >
                {shortTerm.expectedChangePct >= 0 ? '+' : ''}
                {shortTerm.expectedChangePct.toFixed(2)}%
              </div>
            </div>
            <div className="border border-[#27272a] bg-[#09090b] p-4">
              <div className="text-[11px] font-sans text-zinc-400">Üst Güven Sınırı (%80)</div>
              <div className="text-xl font-semibold text-[#10b981] mt-1">
                {sym}
                {shortTerm.upperBound.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Alt Model Kırılımı */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                name: "Holt's Linear Trend",
                desc: 'Sönümlenmiş çift üstel düzeltme; son haftaların hızına duyarlıdır.',
                price: shortTerm.holtTarget,
              },
              {
                name: 'OLS Lineer Regresyon',
                desc: 'Son 60 işlem gününün en küçük kareler trend eğimi uzatması.',
                price: shortTerm.regressionTarget,
              },
              {
                name: 'Ortalamaya Dönüş (50G)',
                desc: 'Fiyatın 50 günlük denge ortalamasına çekilme eğilimi.',
                price: shortTerm.meanReversionTarget,
              },
            ].map((m) => {
              const diff = pctFromNow(m.price);
              return (
                <div
                  key={m.name}
                  className="border border-[#27272a] bg-[#09090b] p-3.5 space-y-1.5"
                >
                  <div className="text-xs font-medium text-zinc-200">{m.name}</div>
                  <div className="flex items-baseline justify-between font-mono tabular-nums">
                    <span className="text-base font-semibold text-zinc-100">
                      {sym}
                      {m.price.toFixed(2)}
                    </span>
                    <span className={`text-xs ${diff >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'}`}>
                      {diff >= 0 ? '+' : ''}
                      {diff.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug">{m.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-2 text-[11px] text-zinc-400 border-t border-[#27272a] pt-3">
            <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>{shortTerm.methodology}</span>
          </div>
        </section>
      )}

      {horizon === 'LONG' && (
        <section className="border border-[#27272a] bg-[#111113] p-5 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#27272a] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#f59e0b]" strokeWidth={1.5} />
                <h2 className="text-sm font-semibold text-zinc-100">
                  12 Aylık Monte Carlo Simülasyon Konisi ({longTerm.simulations} Yürüyüş / GBM)
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Tarihsel log-getiri ve volatiliteden tarayıcıda canlı üretilen 3 olasılık senaryosu.
                Fareyi aylar üzerinde gezdirerek ara dönem değerlerini inceleyin.
              </p>
            </div>
            <div className="flex items-center gap-4 font-mono tabular-nums text-xs">
              <div>
                <div className="text-[10px] text-zinc-500">Yıllık Drift</div>
                <div className="text-zinc-200">%{longTerm.annualizedDriftPct.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500">Yıllık Volatilite</div>
                <div className="text-zinc-200">%{longTerm.annualizedVolatilityPct.toFixed(1)}</div>
              </div>
            </div>
          </div>

          <MonteCarloConeSvg
            cone={longTerm.cone}
            currency={asset.currency}
            dcfIntrinsic={dcfIntrinsic}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono tabular-nums">
            <div className="border border-[#27272a] bg-[#09090b] p-3.5">
              <div className="text-[11px] font-sans text-zinc-400">Ayı Senaryosu (%10)</div>
              <div className="text-lg font-semibold text-[#f43f5e] mt-1">
                {sym}
                {longTerm.bearTarget12M.toFixed(2)}
              </div>
              <div className="text-[11px] text-zinc-500">
                {bearPct >= 0 ? '+' : ''}
                {bearPct.toFixed(1)}%
              </div>
            </div>

            <div className="border border-[#f59e0b]/40 bg-[#09090b] p-3.5">
              <div className="text-[11px] font-sans text-[#f59e0b]">Baz Medyan (%50)</div>
              <div className="text-lg font-semibold text-zinc-100 mt-1">
                {sym}
                {longTerm.baseTarget12M.toFixed(2)}
              </div>
              <div className="text-[11px] text-zinc-400">
                {basePct >= 0 ? '+' : ''}
                {basePct.toFixed(1)}%
              </div>
            </div>

            <div className="border border-[#27272a] bg-[#09090b] p-3.5">
              <div className="text-[11px] font-sans text-zinc-400">Boğa Senaryosu (%90)</div>
              <div className="text-lg font-semibold text-[#10b981] mt-1">
                {sym}
                {longTerm.bullTarget12M.toFixed(2)}
              </div>
              <div className="text-[11px] text-zinc-500">
                {bullPct >= 0 ? '+' : ''}
                {bullPct.toFixed(1)}%
              </div>
            </div>

            <div className="border border-[#27272a] bg-[#09090b] p-3.5">
              <div className="text-[11px] font-sans text-zinc-400">DCF + MC Sentez Bandı</div>
              <div className="text-sm font-semibold text-zinc-100 mt-1.5">
                {sym}
                {longTerm.dcfBlendedLow.toFixed(2)} – {sym}
                {longTerm.dcfBlendedHigh.toFixed(2)}
              </div>
              <div className="text-[10px] font-sans text-zinc-500 mt-1">
                İçsel değer ağırlıklı 12A hedef
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-zinc-400 border-t border-[#27272a] pt-3">
            <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>{longTerm.methodology}</span>
          </div>
        </section>
      )}

      {/* Şeffaflık & Yasal Risk Uyarısı */}
      <div className="flex items-start gap-2.5 border border-[#f59e0b]/30 bg-[#f59e0b]/5 px-4 py-3 text-xs text-zinc-300">
        <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" strokeWidth={1.5} />
        <span>{forecast.disclaimer}</span>
      </div>
    </div>
  );
}
