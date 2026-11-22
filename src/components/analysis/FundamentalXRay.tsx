import { useState } from 'react';
import { AlertCircle, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import type { FundamentalMetrics, StockAsset } from '../../types/market';

interface FundamentalXRayProps {
  asset: StockAsset;
  metrics: FundamentalMetrics;
}

type TrendMetricKey = 'revenue' | 'ebitda' | 'netIncome';

function formatCompact(val: number, currency: string): string {
  const sym = currency === 'TRY' ? '₺' : '$';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(2)}T`;
  if (abs >= 1_000) return `${sign}${sym}${(abs / 1_000).toFixed(2)}Mr`;
  return `${sign}${sym}${abs.toFixed(1)}Mn`;
}

export function FundamentalXRay({ asset, metrics }: FundamentalXRayProps) {
  const [trendKey, setTrendKey] = useState<TrendMetricKey>('revenue');

  if (asset.quarters.length === 0) {
    return (
      <div className="border border-[#27272a] bg-[#111113] p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#f59e0b] shrink-0 mt-0.5" strokeWidth={1.5} />
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">
            {asset.symbol} için çeyreklik bilanço verisi bulunamadı
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Veri kaynağı bu hisse için finansal tablo sağlamadı. Teknik Analiz, Grafik ve Fiyat
            Tahmin motorları gerçek fiyat verisiyle eksiksiz çalışmaya devam eder.
          </p>
        </div>
      </div>
    );
  }

  const multiples = [
    {
      label: 'F/K Oranı (P/E)',
      help: 'Kârının kaç katından fiyatlanıyor? Düşük olması genelde daha ucuzdur.',
      value: metrics.pe,
      sectorAvg: asset.benchmarks.avgPE,
      suffix: 'x',
    },
    {
      label: 'PD/DD (P/B)',
      help: 'Piyasa değerinin özsermayeye oranı.',
      value: metrics.pb,
      sectorAvg: asset.benchmarks.avgPB,
      suffix: 'x',
    },
    {
      label: 'FD/FAVÖK',
      help: 'Borç dahil şirket değerinin faaliyet kârına oranı.',
      value: metrics.evEbitda,
      sectorAvg: asset.benchmarks.avgEvEbitda,
      suffix: 'x',
    },
    {
      label: 'PEG Oranı',
      help: 'Büyümeye göre F/K. 1.0 altı büyümesine göre ucuz sayılır.',
      value: metrics.peg,
      sectorAvg: 1.5,
      suffix: 'x',
    },
  ];

  // Çizgisel SVG Trend Hesabı (sütunsuz)
  const quarters = asset.quarters.slice(-8);
  const values = quarters.map((q) => q[trendKey]);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 1);
  const span = Math.max(1, maxVal - minVal);

  const chartW = 640;
  const chartH = 210;
  const padL = 34;
  const padR = 34;
  const padT = 30;
  const padB = 34;
  const usableW = chartW - padL - padR;
  const usableH = chartH - padT - padB;

  const lineColor =
    values[values.length - 1] >= values[0] ? '#10b981' : '#f43f5e';

  const points = quarters.map((q, i) => {
    const val = q[trendKey];
    const x =
      quarters.length > 1
        ? padL + (i / (quarters.length - 1)) * usableW
        : padL + usableW / 2;
    const y = padT + ((maxVal - val) / span) * usableH;
    return { x, y, val, period: q.period };
  });

  const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const zColor =
    metrics.altmanZ.zone === 'Güvenli Bölge'
      ? 'text-[#10b981] border-[#10b981]/40 bg-[#10b981]/10'
      : metrics.altmanZ.zone === 'Gri Bölge'
        ? 'text-[#f59e0b] border-[#f59e0b]/40 bg-[#f59e0b]/10'
        : 'text-[#f43f5e] border-[#f43f5e]/40 bg-[#f43f5e]/10';

  const fColor =
    metrics.piotroski.score >= 7
      ? 'text-[#10b981]'
      : metrics.piotroski.score >= 4
        ? 'text-[#f59e0b]'
        : 'text-[#f43f5e]';

  return (
    <div className="space-y-5">
      {/* 1. Çarpanlar & Sektör Kıyaslaması */}
      <section className="border border-[#27272a] bg-[#111113] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Değerleme Çarpanları & Sektör Kıyaslaması
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Şirketin mevcut piyasa fiyatı, {asset.sector} sektörü ortalamalarıyla kıyaslanır.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-zinc-400">
            <span>Piyasa Değeri: {formatCompact(metrics.marketCap, asset.currency)}</span>
            <span>Temettü Verimi: %{asset.dividendYield.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {multiples.map((m) => {
            const hasVal = m.value !== null && m.value > 0;
            const isDiscount = hasVal && m.value! < m.sectorAvg;
            const diffPct = hasVal ? ((m.value! - m.sectorAvg) / m.sectorAvg) * 100 : 0;

            return (
              <div key={m.label} className="border border-[#27272a] bg-[#09090b] p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-300">{m.label}</span>
                  {hasVal && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono border ${
                        isDiscount
                          ? 'border-[#10b981]/40 text-[#10b981] bg-[#10b981]/10'
                          : 'border-[#f43f5e]/40 text-[#f43f5e] bg-[#f43f5e]/10'
                      }`}
                    >
                      {isDiscount ? 'İskontolu' : 'Primli'}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between font-mono tabular-nums">
                  <span className="text-xl font-semibold text-zinc-100">
                    {hasVal ? `${m.value!.toFixed(2)}${m.suffix}` : 'N/A'}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Sektör: {m.sectorAvg.toFixed(2)}
                    {m.suffix}
                    {hasVal ? ` (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(0)}%)` : ''}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-500 leading-snug">{m.help}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Kârlılık & Bilanço Sağlığı */}
      <section className="border border-[#27272a] bg-[#111113] p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Kârlılık ve Bilanço Sağlığı</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Son 12 aylık (TTM) faaliyet marjları, özsermaye verimliliği ve borçluluk göstergeleri.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
          {[
            {
              label: 'Özsermaye Kârlılığı (ROE)',
              val: `%${metrics.roe.toFixed(1)}`,
              sub: `Sektör: %${asset.benchmarks.avgROE}`,
              good: metrics.roe >= asset.benchmarks.avgROE,
            },
            {
              label: 'Aktif Kârlılığı (ROA)',
              val: `%${metrics.roa.toFixed(1)}`,
              sub: 'Varlık verimliliği',
              good: metrics.roa > 5,
            },
            {
              label: 'Brüt / FAVÖK Marjı',
              val: `%${metrics.grossMargin.toFixed(1)} / %${metrics.ebitdaMargin.toFixed(1)}`,
              sub: 'Operasyonel güç',
              good: metrics.ebitdaMargin > 12,
            },
            {
              label: 'Net Kâr Marjı',
              val: `%${metrics.netMargin.toFixed(1)}`,
              sub: `Sektör: %${asset.benchmarks.avgNetMargin}`,
              good: metrics.netMargin >= asset.benchmarks.avgNetMargin,
            },
            {
              label: 'Cari Oran',
              val: `${metrics.currentRatio.toFixed(2)}x`,
              sub: '1.2x+ kısa vade güvenli',
              good: metrics.currentRatio >= 1.2,
            },
            {
              label: 'Net Borç / FAVÖK',
              val: `${metrics.netDebtToEbitda.toFixed(2)}x`,
              sub: 'Negatif = net nakit fazlası',
              good: metrics.netDebtToEbitda <= 2.0,
            },
            {
              label: 'Serbest Nakit Akışı (FCF)',
              val: formatCompact(metrics.fcfTTM, asset.currency),
              sub: 'Son 12 ay nakit üretimi',
              good: metrics.fcfTTM > 0,
            },
            {
              label: 'Yıllık Ciro Büyümesi',
              val: `${metrics.revenueGrowthYoY >= 0 ? '+' : ''}%${metrics.revenueGrowthYoY.toFixed(1)}`,
              sub: `Net Kâr: ${metrics.netIncomeGrowthYoY >= 0 ? '+' : ''}%${metrics.netIncomeGrowthYoY.toFixed(1)}`,
              good: metrics.revenueGrowthYoY > 0,
            },
          ].map((kpi) => (
            <div key={kpi.label} className="border border-[#27272a] bg-[#09090b] p-3.5">
              <div className="text-[11px] font-sans text-zinc-400">{kpi.label}</div>
              <div
                className={`text-base font-semibold mt-1 ${
                  kpi.good ? 'text-zinc-100' : 'text-[#f59e0b]'
                }`}
              >
                {kpi.val}
              </div>
              <div className="text-[10px] font-sans text-zinc-500 mt-1">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Çeyreklik Finansal Trend (Çizgisel SVG) */}
      <section className="border border-[#27272a] bg-[#111113] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Çeyreklik Finansal Trend</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Son {quarters.length} çeyrek boyunca gelir ve kârlılık gelişimi ({asset.currency}).
            </p>
          </div>

          <div className="flex items-center gap-1">
            {(
              [
                { id: 'revenue', label: 'Ciro' },
                { id: 'ebitda', label: 'FAVÖK' },
                { id: 'netIncome', label: 'Net Kâr' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTrendKey(tab.id)}
                className={`px-3 py-1.5 text-xs border transition-colors ${
                  trendKey === tab.id
                    ? 'border-[#f59e0b] bg-[#18181b] text-zinc-100 font-medium'
                    : 'border-[#27272a] bg-[#09090b] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full overflow-x-auto bg-[#09090b] border border-[#27272a] p-3">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="w-full h-52 min-w-[440px]"
            role="img"
            aria-label="Çeyreklik finansal çizgi grafiği"
          >
            {[0, 0.33, 0.66, 1].map((ratio) => {
              const y = padT + usableH * ratio;
              return (
                <line
                  key={ratio}
                  x1={padL}
                  y1={y}
                  x2={chartW - padR}
                  y2={y}
                  stroke="#18181b"
                  strokeWidth={1}
                />
              );
            })}

            <polyline
              fill="none"
              stroke={lineColor}
              strokeWidth={2}
              points={polylineStr}
            />

            {points.map((pt) => (
              <g key={pt.period}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={4}
                  fill="#09090b"
                  stroke={pt.val < 0 ? '#f43f5e' : lineColor}
                  strokeWidth={2}
                />
                <text
                  x={pt.x}
                  y={pt.y - 10}
                  textAnchor="middle"
                  fill="#d4d4d8"
                  fontSize="10"
                  fontFamily="ui-monospace, monospace"
                >
                  {formatCompact(pt.val, asset.currency)}
                </text>
                <text
                  x={pt.x}
                  y={chartH - 12}
                  textAnchor="middle"
                  fill="#71717a"
                  fontSize="10"
                  fontFamily="ui-monospace, monospace"
                >
                  {pt.period}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </section>

      {/* 4. Kurumsal Skorlama: Piotroski F-Score & Altman Z-Score */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-2 border border-[#27272a] bg-[#111113] p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-[#27272a] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#10b981]" strokeWidth={1.5} />
                <h2 className="text-sm font-semibold text-zinc-100">
                  Piotroski F-Score Bilanço Karnesi
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                9 temel finansal kriter üzerinden şirket kalitesi ölçülür (7–9 Güçlü, 4–6 Orta, 0–3
                Zayıf).
              </p>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className={`text-2xl font-semibold ${fColor}`}>
                {metrics.piotroski.score} / 9
              </div>
              <div className="text-xs text-zinc-400">{metrics.piotroski.grade}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {metrics.piotroski.criteria.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-2.5 border border-[#27272a] bg-[#09090b] p-2.5"
              >
                {c.passed ? (
                  <CheckCircle2
                    className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5"
                    strokeWidth={1.5}
                  />
                ) : (
                  <XCircle className="w-4 h-4 text-[#f43f5e] shrink-0 mt-0.5" strokeWidth={1.5} />
                )}
                <div className="min-w-0">
                  <div className="text-xs text-zinc-200 leading-snug">{c.label}</div>
                  <div className="text-[11px] font-mono tabular-nums text-zinc-500 mt-0.5">
                    {c.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-[#27272a] bg-[#111113] p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-[#27272a] pb-3">
              <h2 className="text-sm font-semibold text-zinc-100">Altman Z-Score</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Finansal sağlamlık ve iflas riski göstergesi.
              </p>
            </div>

            <div className="flex items-center justify-between font-mono tabular-nums">
              <span className="text-3xl font-semibold text-zinc-100">
                {metrics.altmanZ.score.toFixed(2)}
              </span>
              <span className={`px-2.5 py-1 text-xs border ${zColor}`}>
                {metrics.altmanZ.zone}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="grid grid-cols-3 h-2 border border-[#27272a]">
                <div className="bg-[#f43f5e]/40" />
                <div className="bg-[#f59e0b]/40" />
                <div className="bg-[#10b981]/40" />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>1.81 Altı Riskli</span>
                <span>1.81–2.99 Gri</span>
                <span>2.99+ Güvenli</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs font-mono tabular-nums border-t border-[#27272a] pt-3">
              <div className="flex justify-between">
                <span className="text-zinc-400">X1 (İşletme Sermayesi / Aktif)</span>
                <span>{metrics.altmanZ.components.x1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">X2 (Geçmiş Kârlar / Aktif)</span>
                <span>{metrics.altmanZ.components.x2}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">X3 (FAVÖK-EBIT / Aktif)</span>
                <span>{metrics.altmanZ.components.x3}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">X4 (Piyasa Değeri / Borç)</span>
                <span>{metrics.altmanZ.components.x4}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">X5 (Satışlar / Aktif)</span>
                <span>{metrics.altmanZ.components.x5}</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 border-t border-[#27272a] pt-3">
            Not: Bankacılık ve finans kuruluşlarında yüksek kaldıraç yapısı nedeniyle Altman Z-Score
            standart sanayi eşiklerinden farklı yorumlanmalıdır.
          </p>
        </section>
      </div>
    </div>
  );
}
