import { useMemo, useState } from 'react';
import { ArrowUpRight, Briefcase, Plus, ShieldCheck } from 'lucide-react';
import type {
  FundamentalMetrics,
  MultiHorizonForecastResult,
  PortfolioPosition,
  StockAsset,
  TechnicalSnapshot,
} from '../../types/market';

interface StockStatsRailProps {
  asset: StockAsset;
  technical: TechnicalSnapshot;
  fundamental: FundamentalMetrics;
  forecast: MultiHorizonForecastResult;
  position?: PortfolioPosition;
  onAddPosition: (symbol: string, quantity: number, avgCost: number) => void;
  onNavigateSubTab: (tab: 'OVERVIEW' | 'FUNDAMENTALS' | 'FORECAST' | 'BACKTEST') => void;
  onOpenPortfolio: () => void;
}

function formatCompact(val: number, currency: string): string {
  const sym = currency === 'TRY' ? '₺' : '$';
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `${sym}${(val / 1_000_000).toFixed(2)}T`;
  if (abs >= 1_000) return `${sym}${(val / 1_000).toFixed(1)}Mr`;
  return `${sym}${val.toFixed(0)}Mn`;
}

function RangeBar({
  label,
  low,
  high,
  current,
  currencySym,
}: {
  label: string;
  low: number;
  high: number;
  current: number;
  currencySym: string;
}) {
  const span = Math.max(0.0001, high - low);
  const pct = Math.min(100, Math.max(0, ((current - low) / span) * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-zinc-400">
        <span>{label}</span>
        <span className="font-mono tabular-nums text-zinc-500">%{pct.toFixed(0)} konum</span>
      </div>
      <div className="relative h-1.5 bg-[#18181b] border border-[#27272a]">
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-zinc-100 border border-[#09090b]"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-zinc-300">
        <span>
          {currencySym}
          {low.toFixed(2)}
        </span>
        <span>
          {currencySym}
          {high.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export function StockStatsRail({
  asset,
  technical,
  fundamental,
  forecast,
  position,
  onAddPosition,
  onNavigateSubTab,
  onOpenPortfolio,
}: StockStatsRailProps) {
  const [quickOpen, setQuickOpen] = useState(false);
  const [qty, setQty] = useState('10');

  const stats = useMemo(() => {
    const bars = asset.bars;
    const last = bars[bars.length - 1];
    const slice52w = bars.slice(-Math.min(252, bars.length));
    const low52 = Math.min(...slice52w.map((b) => b.low));
    const high52 = Math.max(...slice52w.map((b) => b.high));
    const avgVol20 =
      bars.length >= 20
        ? bars.slice(-20).reduce((acc, b) => acc + b.volume, 0) / 20
        : last?.volume ?? 0;

    return {
      price: last?.close ?? 0,
      dayLow: last?.low ?? 0,
      dayHigh: last?.high ?? 0,
      volume: last?.volume ?? 0,
      avgVol20,
      low52,
      high52,
    };
  }, [asset.bars]);

  const sym = asset.currency === 'TRY' ? '₺' : '$';
  const targetUpside =
    stats.price > 0 ? ((forecast.longTerm.baseTarget12M - stats.price) / stats.price) * 100 : 0;

  const techColor =
    technical.consensusScore >= 58
      ? 'text-[#10b981]'
      : technical.consensusScore <= 42
        ? 'text-[#f43f5e]'
        : 'text-[#f59e0b]';

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0 || stats.price <= 0) return;
    onAddPosition(asset.symbol, n, stats.price);
    setQuickOpen(false);
  };

  return (
    <aside className="w-full xl:w-80 shrink-0 space-y-4">
      {/* 1. Portföy Durumu / Hızlı Ekle Kartı (Midas / Robinhood stili) */}
      <section className="border border-[#27272a] bg-[#111113] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
            <Briefcase className="w-3.5 h-3.5 text-[#f59e0b]" strokeWidth={1.5} />
            <span>Portföy Pozisyonu</span>
          </div>
          {position && (
            <button
              type="button"
              onClick={onOpenPortfolio}
              className="text-[11px] text-zinc-400 hover:text-zinc-100 flex items-center gap-0.5"
            >
              Detay <ArrowUpRight className="w-3 h-3" strokeWidth={1.5} />
            </button>
          )}
        </div>

        {position ? (
          <div className="space-y-2 font-mono tabular-nums text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Adet / Maliyet</span>
              <span className="text-zinc-200">
                {position.quantity} · {sym}
                {position.avgCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Anlık Değer</span>
              <span className="text-zinc-100 font-semibold">
                {sym}
                {(position.quantity * stats.price).toFixed(2)}
              </span>
            </div>
            {(() => {
              const pnl = position.quantity * (stats.price - position.avgCost);
              const pct =
                position.avgCost > 0
                  ? ((stats.price - position.avgCost) / position.avgCost) * 100
                  : 0;
              return (
                <div className="flex justify-between border-t border-[#27272a] pt-2">
                  <span className="text-zinc-500 font-sans">Kâr / Zarar</span>
                  <span className={pnl >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'}>
                    {pnl >= 0 ? '+' : ''}
                    {sym}
                    {pnl.toFixed(2)} ({pct >= 0 ? '+' : ''}
                    {pct.toFixed(1)}%)
                  </span>
                </div>
              );
            })()}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            Bu hisse portföyünüzde yok. Anlık fiyattan sanal portföyünüze ekleyebilirsiniz.
          </p>
        )}

        {!quickOpen ? (
          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{position ? 'Pozisyona Ekleme Yap' : 'Sanal Portföye Ekle'}</span>
          </button>
        ) : (
          <form onSubmit={handleQuickAdd} className="space-y-2 pt-1">
            <div className="flex gap-2">
              <input
                type="number"
                min="0.01"
                step="any"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="Adet"
                className="w-24 bg-[#09090b] border border-[#27272a] focus:border-[#f59e0b] focus:outline-none px-2.5 py-1.5 text-xs font-mono tabular-nums text-zinc-100"
              />
              <button
                type="submit"
                className="flex-1 bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-medium py-1.5"
              >
                {sym}
                {stats.price.toFixed(2)} Ekle
              </button>
              <button
                type="button"
                onClick={() => setQuickOpen(false)}
                className="px-2 border border-[#27272a] text-xs text-zinc-400 hover:text-zinc-100"
              >
                İptal
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 2. Hisse Karnesi (3 Temel Karar Sinyali) */}
      <section className="border border-[#27272a] bg-[#111113] p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" strokeWidth={1.5} />
          <span>Hisse Karar Özeti</span>
        </div>

        <div className="divide-y divide-[#27272a]/70 text-xs">
          <button
            type="button"
            onClick={() => onNavigateSubTab('OVERVIEW')}
            className="w-full py-2.5 flex items-center justify-between text-left hover:text-white group"
          >
            <div>
              <div className="text-zinc-400">Teknik Konsensüs</div>
              <div className="text-[11px] text-zinc-500">İndikatör ortalaması</div>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className={`font-semibold ${techColor}`}>{technical.rating}</div>
              <div className="text-[11px] text-zinc-500">{technical.consensusScore}/100</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSubTab('FUNDAMENTALS')}
            className="w-full py-2.5 flex items-center justify-between text-left hover:text-white"
          >
            <div>
              <div className="text-zinc-400">Bilanço Kalitesi</div>
              <div className="text-[11px] text-zinc-500">Piotroski F-Score</div>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="font-semibold text-zinc-100">
                {asset.quarters.length > 0 ? `${fundamental.piotroski.score} / 9` : 'Veri Yok'}
              </div>
              <div className="text-[11px] text-zinc-500">
                {asset.quarters.length > 0 ? fundamental.piotroski.grade : '—'}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSubTab('FORECAST')}
            className="w-full pt-2.5 flex items-center justify-between text-left hover:text-white"
          >
            <div>
              <div className="text-zinc-400">12A Medyan Hedef</div>
              <div className="text-[11px] text-zinc-500">Monte Carlo (500 sim.)</div>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="font-semibold text-[#f59e0b]">
                {sym}
                {forecast.longTerm.baseTarget12M.toFixed(2)}
              </div>
              <div
                className={`text-[11px] ${
                  targetUpside >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
                }`}
              >
                {targetUpside >= 0 ? '+' : ''}
                {targetUpside.toFixed(1)}%
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* 3. Fiyat Aralıkları & Temel İstatistikler */}
      <section className="border border-[#27272a] bg-[#111113] p-4 space-y-4">
        <div className="text-xs font-medium text-zinc-200">Piyasa İstatistikleri</div>

        <div className="space-y-3.5">
          <RangeBar
            label="Günlük Aralık"
            low={stats.dayLow}
            high={stats.dayHigh}
            current={stats.price}
            currencySym={sym}
          />
          <RangeBar
            label="52 Haftalık Aralık"
            low={stats.low52}
            high={stats.high52}
            current={stats.price}
            currencySym={sym}
          />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-3 border-t border-[#27272a] text-xs font-mono tabular-nums">
          <div>
            <div className="font-sans text-[11px] text-zinc-500">Piyasa Değeri</div>
            <div className="text-zinc-200 mt-0.5">
              {fundamental.marketCap > 0 ? formatCompact(fundamental.marketCap, asset.currency) : '—'}
            </div>
          </div>
          <div>
            <div className="font-sans text-[11px] text-zinc-500">F/K Oranı</div>
            <div className="text-zinc-200 mt-0.5">
              {fundamental.pe !== null ? `${fundamental.pe.toFixed(2)}x` : '—'}
            </div>
          </div>
          <div>
            <div className="font-sans text-[11px] text-zinc-500">PD/DD Oranı</div>
            <div className="text-zinc-200 mt-0.5">
              {fundamental.pb !== null ? `${fundamental.pb.toFixed(2)}x` : '—'}
            </div>
          </div>
          <div>
            <div className="font-sans text-[11px] text-zinc-500">Beta (Risk)</div>
            <div className="text-zinc-200 mt-0.5">{asset.beta.toFixed(2)}</div>
          </div>
          <div>
            <div className="font-sans text-[11px] text-zinc-500">Günlük Hacim</div>
            <div className="text-zinc-200 mt-0.5">{(stats.volume / 1e6).toFixed(2)}M</div>
          </div>
          <div>
            <div className="font-sans text-[11px] text-zinc-500">20G Ort. Hacim</div>
            <div className="text-zinc-200 mt-0.5">{(stats.avgVol20 / 1e6).toFixed(2)}M</div>
          </div>
          <div>
            <div className="font-sans text-[11px] text-zinc-500">Temettü Verimi</div>
            <div className="text-zinc-200 mt-0.5">%{asset.dividendYield.toFixed(2)}</div>
          </div>
          <div>
            <div className="font-sans text-[11px] text-zinc-500">T+1 Yön Olasılığı</div>
            <div
              className={`mt-0.5 ${
                forecast.daily.bullishProbabilityPct >= 50 ? 'text-[#10b981]' : 'text-[#f43f5e]'
              }`}
            >
              %{forecast.daily.bullishProbabilityPct.toFixed(0)}
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}
