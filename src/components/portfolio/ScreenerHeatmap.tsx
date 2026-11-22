import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Filter, Grid3X3, ListFilter, Search } from 'lucide-react';
import { computeFundamentalMetrics } from '../../engine/fundamentalScoring';
import { computeTechnicalSnapshot } from '../../engine/technicalIndicators';
import type { ConsensusRating, MarketRegion, StockAsset } from '../../types/market';

interface ScreenerHeatmapProps {
  assets: StockAsset[];
  onSelectStock: (symbol: string) => void;
}

type ViewMode = 'SCREENER' | 'HEATMAP';
type SortKey =
  | 'symbol'
  | 'price'
  | 'changePct'
  | 'consensusScore'
  | 'rsi'
  | 'relVolume'
  | 'pe'
  | 'pb';
type QuickPreset = 'ALL' | 'OVERSOLD' | 'OVERBOUGHT' | 'VOLUME_SURGE' | 'STRONG_BUY' | 'LOW_PE';

interface ScreenerRow {
  asset: StockAsset;
  price: number;
  changePct: number;
  consensusScore: number;
  rating: ConsensusRating;
  rsi: number | null;
  relVolume: number;
  pe: number | null;
  pb: number | null;
}

function getHeatStyle(changePct: number): { bg: string; border: string; text: string } {
  if (changePct >= 3) {
    return { bg: 'bg-[#10b981]/30', border: 'border-[#10b981]/60', text: 'text-zinc-100' };
  }
  if (changePct >= 1) {
    return { bg: 'bg-[#10b981]/18', border: 'border-[#10b981]/40', text: 'text-zinc-100' };
  }
  if (changePct > 0) {
    return { bg: 'bg-[#10b981]/10', border: 'border-[#10b981]/25', text: 'text-zinc-200' };
  }
  if (changePct <= -3) {
    return { bg: 'bg-[#f43f5e]/30', border: 'border-[#f43f5e]/60', text: 'text-zinc-100' };
  }
  if (changePct <= -1) {
    return { bg: 'bg-[#f43f5e]/18', border: 'border-[#f43f5e]/40', text: 'text-zinc-100' };
  }
  if (changePct < 0) {
    return { bg: 'bg-[#f43f5e]/10', border: 'border-[#f43f5e]/25', text: 'text-zinc-200' };
  }
  return { bg: 'bg-[#18181b]', border: 'border-[#27272a]', text: 'text-zinc-300' };
}

export function ScreenerHeatmap({ assets, onSelectStock }: ScreenerHeatmapProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('SCREENER');
  const [marketFilter, setMarketFilter] = useState<'ALL' | MarketRegion>('ALL');
  const [preset, setPreset] = useState<QuickPreset>('ALL');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('consensusScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const computedRows = useMemo<ScreenerRow[]>(() => {
    return assets.map((asset) => {
      const bars = asset.bars;
      const len = bars.length;
      const last = bars[len - 1];
      const prev = bars[len - 2] ?? last;
      const price = last?.close ?? 0;
      const changePct = prev && prev.close > 0 ? ((price - prev.close) / prev.close) * 100 : 0;

      const tech = computeTechnicalSnapshot(bars);
      const fund = computeFundamentalMetrics(asset);

      const rsi = tech.rsi14[len - 1] ?? null;
      const avgVol20 =
        len >= 21
          ? bars.slice(-21, -1).reduce((acc, b) => acc + b.volume, 0) / 20
          : last?.volume ?? 1;
      const relVolume = avgVol20 > 0 && last ? last.volume / avgVol20 : 1;

      return {
        asset,
        price,
        changePct,
        consensusScore: tech.consensusScore,
        rating: tech.rating,
        rsi,
        relVolume,
        pe: fund.pe,
        pb: fund.pb,
      };
    });
  }, [assets]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    return computedRows
      .filter((row) => {
        if (marketFilter !== 'ALL' && row.asset.market !== marketFilter) return false;
        if (q) {
          const hit =
            row.asset.symbol.toLowerCase().includes(q) ||
            row.asset.name.toLocaleLowerCase('tr-TR').includes(q) ||
            row.asset.sector.toLocaleLowerCase('tr-TR').includes(q);
          if (!hit) return false;
        }

        if (preset === 'OVERSOLD') return row.rsi !== null && row.rsi <= 35;
        if (preset === 'OVERBOUGHT') return row.rsi !== null && row.rsi >= 68;
        if (preset === 'VOLUME_SURGE') return row.relVolume >= 1.5;
        if (preset === 'STRONG_BUY') return row.consensusScore >= 70;
        if (preset === 'LOW_PE') return row.pe !== null && row.pe > 0 && row.pe <= 12;
        return true;
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'symbol') {
          return a.asset.symbol.localeCompare(b.asset.symbol) * dir;
        }
        const getNum = (r: ScreenerRow): number => {
          const val = r[sortKey];
          if (val === null || !Number.isFinite(val)) {
            return sortDir === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
          }
          return val;
        };
        return (getNum(a) - getNum(b)) * dir;
      });
  }, [computedRows, marketFilter, preset, search, sortKey, sortDir]);

  const sectorGroups = useMemo(() => {
    const map = new Map<string, ScreenerRow[]>();
    for (const row of filteredRows) {
      const list = map.get(row.asset.sector) ?? [];
      list.push(row);
      map.set(row.asset.sector, list);
    }

    return Array.from(map.entries())
      .map(([sector, items]) => {
        const avgChange =
          items.reduce((acc, item) => acc + item.changePct, 0) / Math.max(1, items.length);
        return {
          sector,
          avgChange,
          items: items.sort((a, b) => b.changePct - a.changePct),
        };
      })
      .sort((a, b) => b.items.length - a.items.length || b.avgChange - a.avgChange);
  }, [filteredRows]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'symbol' || key === 'pe' || key === 'pb' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 inline ml-1 text-[#f59e0b]" strokeWidth={1.5} />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1 text-[#f59e0b]" strokeWidth={1.5} />
    );
  };

  return (
    <div className="space-y-4">
      {/* Üst Kontrol & Filtre Şeridi */}
      <section className="border border-[#27272a] bg-[#111113] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Piyasa Tarayıcı & Sektör Isı Haritası
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Tüm hisse evreni canlı indikatörler ve bilanço çarpanlarıyla taranır. İncelemek için
              herhangi bir hisseye tıklayın.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode('SCREENER')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors ${
                viewMode === 'SCREENER'
                  ? 'border-[#f59e0b] bg-[#18181b] text-zinc-100 font-medium'
                  : 'border-[#27272a] bg-[#09090b] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Tarayıcı Tablosu</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('HEATMAP')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors ${
                viewMode === 'HEATMAP'
                  ? 'border-[#f59e0b] bg-[#18181b] text-zinc-100 font-medium'
                  : 'border-[#27272a] bg-[#09090b] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Sektör Isı Haritası</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sembol, şirket veya sektör filtrele..."
              className="w-full bg-[#09090b] border border-[#27272a] focus:border-[#f59e0b] focus:outline-none pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600"
            />
          </div>

          <div className="flex items-center gap-1">
            {(
              [
                { id: 'ALL', label: 'Tümü' },
                { id: 'BIST', label: 'BIST' },
                { id: 'GLOBAL', label: 'Global / ABD' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMarketFilter(m.id)}
                className={`px-2.5 py-1.5 text-xs border transition-colors ${
                  marketFilter === m.id
                    ? 'border-[#f59e0b] bg-[#18181b] text-zinc-100'
                    : 'border-[#27272a] bg-[#09090b] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hızlı Tarama Filtreleri */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-zinc-500 mr-1" strokeWidth={1.5} />
          {(
            [
              { id: 'ALL', label: 'Tüm Hisseler' },
              { id: 'STRONG_BUY', label: 'Teknik Puan 70+' },
              { id: 'OVERSOLD', label: 'RSI Aşırı Satım (≤35)' },
              { id: 'OVERBOUGHT', label: 'RSI Aşırı Alım (≥68)' },
              { id: 'VOLUME_SURGE', label: 'Hacim Patlaması (1.5x+)' },
              { id: 'LOW_PE', label: 'Düşük F/K (≤12x)' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPreset(item.id)}
              className={`px-2.5 py-1 text-[11px] border transition-colors ${
                preset === item.id
                  ? 'border-zinc-300 bg-[#18181b] text-zinc-100'
                  : 'border-[#27272a] bg-[#09090b] text-zinc-400 hover:border-zinc-500'
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] font-mono tabular-nums text-zinc-500">
            Sonuç: {filteredRows.length} / {computedRows.length}
          </span>
        </div>
      </section>

      {/* GÖRÜNÜM 1: TARAYICI TABLOSU */}
      {viewMode === 'SCREENER' && (
        <section className="border border-[#27272a] bg-[#111113] overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#27272a] bg-[#09090b] text-zinc-400 text-left select-none">
                <th
                  onClick={() => handleSort('symbol')}
                  className="px-3.5 py-2.5 font-medium cursor-pointer hover:text-zinc-100"
                >
                  Hisse {renderSortIcon('symbol')}
                </th>
                <th className="px-3 py-2.5 font-medium">Sektör</th>
                <th
                  onClick={() => handleSort('price')}
                  className="px-3 py-2.5 font-medium text-right cursor-pointer hover:text-zinc-100"
                >
                  Fiyat {renderSortIcon('price')}
                </th>
                <th
                  onClick={() => handleSort('changePct')}
                  className="px-3 py-2.5 font-medium text-right cursor-pointer hover:text-zinc-100"
                >
                  Günlük {renderSortIcon('changePct')}
                </th>
                <th
                  onClick={() => handleSort('consensusScore')}
                  className="px-3 py-2.5 font-medium text-right cursor-pointer hover:text-zinc-100"
                >
                  Teknik Puan {renderSortIcon('consensusScore')}
                </th>
                <th
                  onClick={() => handleSort('rsi')}
                  className="px-3 py-2.5 font-medium text-right cursor-pointer hover:text-zinc-100"
                >
                  RSI (14) {renderSortIcon('rsi')}
                </th>
                <th
                  onClick={() => handleSort('relVolume')}
                  className="px-3 py-2.5 font-medium text-right cursor-pointer hover:text-zinc-100"
                >
                  Hacim (20G) {renderSortIcon('relVolume')}
                </th>
                <th
                  onClick={() => handleSort('pe')}
                  className="px-3 py-2.5 font-medium text-right cursor-pointer hover:text-zinc-100"
                >
                  F/K {renderSortIcon('pe')}
                </th>
                <th
                  onClick={() => handleSort('pb')}
                  className="px-3.5 py-2.5 font-medium text-right cursor-pointer hover:text-zinc-100"
                >
                  PD/DD {renderSortIcon('pb')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]/60 font-mono tabular-nums">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center font-sans text-zinc-500">
                    Seçili kriterlere uyan hisse bulunamadı. Filtreleri gevşetmeyi deneyin.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const sym = row.asset.currency === 'TRY' ? '₺' : '$';
                  const scoreTone =
                    row.consensusScore >= 58
                      ? 'text-[#10b981]'
                      : row.consensusScore <= 42
                        ? 'text-[#f43f5e]'
                        : 'text-[#f59e0b]';

                  return (
                    <tr
                      key={row.asset.symbol}
                      onClick={() => onSelectStock(row.asset.symbol)}
                      className="hover:bg-[#18181b] cursor-pointer transition-colors"
                    >
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-100">{row.asset.symbol}</span>
                          <span className="text-[10px] px-1 border border-[#27272a] text-zinc-500">
                            {row.asset.market}
                          </span>
                        </div>
                        <div className="font-sans text-[11px] text-zinc-500 truncate max-w-[190px]">
                          {row.asset.name}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-sans text-zinc-400">{row.asset.sector}</td>
                      <td className="px-3 py-2.5 text-right text-zinc-100">
                        {sym}
                        {row.price.toFixed(2)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right ${
                          row.changePct >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
                        }`}
                      >
                        {row.changePct >= 0 ? '+' : ''}
                        {row.changePct.toFixed(2)}%
                      </td>
                      <td className={`px-3 py-2.5 text-right ${scoreTone}`}>
                        {row.consensusScore} ·{' '}
                        <span className="font-sans text-[11px]">{row.rating}</span>
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right ${
                          row.rsi !== null && row.rsi <= 35
                            ? 'text-[#10b981]'
                            : row.rsi !== null && row.rsi >= 68
                              ? 'text-[#f43f5e]'
                              : 'text-zinc-300'
                        }`}
                      >
                        {row.rsi !== null ? row.rsi.toFixed(1) : '-'}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right ${
                          row.relVolume >= 1.5 ? 'text-[#f59e0b]' : 'text-zinc-400'
                        }`}
                      >
                        {row.relVolume.toFixed(2)}x
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-300">
                        {row.pe !== null ? `${row.pe.toFixed(1)}x` : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-300">
                        {row.pb !== null ? `${row.pb.toFixed(2)}x` : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* GÖRÜNÜM 2: SEKTÖR ISI HARİTASI (TREEMAP GRID) */}
      {viewMode === 'HEATMAP' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sectorGroups.map((group) => (
            <section
              key={group.sector}
              className="border border-[#27272a] bg-[#111113] p-3.5 space-y-2.5"
            >
              <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
                <span className="text-xs font-semibold text-zinc-200">
                  {group.sector}{' '}
                  <span className="font-mono text-zinc-500 font-normal">
                    ({group.items.length})
                  </span>
                </span>
                <span
                  className={`text-xs font-mono tabular-nums ${
                    group.avgChange >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
                  }`}
                >
                  Ort: {group.avgChange >= 0 ? '+' : ''}
                  {group.avgChange.toFixed(2)}%
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {group.items.map((row) => {
                  const style = getHeatStyle(row.changePct);
                  return (
                    <button
                      key={row.asset.symbol}
                      type="button"
                      onClick={() => onSelectStock(row.asset.symbol)}
                      title={`${row.asset.name} (${row.changePct.toFixed(2)}%)`}
                      className={`p-2 border text-left transition-colors hover:border-zinc-200 ${style.bg} ${style.border}`}
                    >
                      <div className={`text-xs font-mono font-semibold truncate ${style.text}`}>
                        {row.asset.symbol}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-zinc-200 mt-0.5">
                        {row.changePct >= 0 ? '+' : ''}
                        {row.changePct.toFixed(2)}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
