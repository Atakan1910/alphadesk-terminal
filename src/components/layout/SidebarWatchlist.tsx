import { useMemo, useState } from 'react';
import { Search, Star, X } from 'lucide-react';
import type { StockAsset } from '../../types/market';

type FilterMode = 'ALL' | 'BIST' | 'GLOBAL' | 'WATCHLIST';

interface SidebarWatchlistProps {
  assets: StockAsset[];
  activeSymbol: string;
  watchlist: string[];
  onSelectSymbol: (symbol: string) => void;
  onToggleWatchlist: (symbol: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function SidebarWatchlist({
  assets,
  activeSymbol,
  watchlist,
  onSelectSymbol,
  onToggleWatchlist,
  mobileOpen,
  onCloseMobile,
}: SidebarWatchlistProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('ALL');

  const rows = useMemo(() => {
    return assets.map((asset) => {
      const len = asset.bars.length;
      const last = asset.bars[len - 1]?.close ?? 0;
      const prev = asset.bars[len - 2]?.close ?? last;
      const changePct = prev > 0 ? ((last - prev) / prev) * 100 : 0;
      return { asset, last, changePct };
    });
  }, [assets]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return rows.filter(({ asset }) => {
      if (filter === 'WATCHLIST' && !watchlist.includes(asset.symbol)) return false;
      if (filter === 'BIST' && asset.market !== 'BIST') return false;
      if (filter === 'GLOBAL' && asset.market !== 'GLOBAL') return false;
      if (!q) return true;
      return (
        asset.symbol.toLowerCase().includes(q) ||
        asset.name.toLocaleLowerCase('tr-TR').includes(q) ||
        asset.sector.toLocaleLowerCase('tr-TR').includes(q)
      );
    });
  }, [rows, query, filter, watchlist]);

  const content = (
    <aside className="flex flex-col h-full w-64 border-r border-[#27272a] bg-[#111113] shrink-0">
      <div className="p-3 border-b border-[#27272a] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-300">
            Hisseler{' '}
            <span className="font-mono text-zinc-500">({filteredRows.length})</span>
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-zinc-400 hover:text-zinc-100"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="relative">
          <Search
            className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ara: THYAO, SASA, AAPL..."
            className="w-full bg-[#09090b] border border-[#27272a] focus:border-[#f59e0b] focus:outline-none pl-8 pr-2.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600"
          />
        </div>

        <div className="grid grid-cols-4 gap-1">
          {(
            [
              { id: 'ALL', label: 'Tümü' },
              { id: 'BIST', label: 'BIST' },
              { id: 'GLOBAL', label: 'ABD' },
              { id: 'WATCHLIST', label: 'Favori' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`py-1 text-[11px] border transition-colors ${
                filter === item.id
                  ? 'border-[#f59e0b] bg-[#18181b] text-zinc-100 font-medium'
                  : 'border-[#27272a] bg-[#09090b] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#27272a]/50">
        {filteredRows.length === 0 ? (
          <div className="p-6 text-xs text-zinc-500 text-center">Eşleşen hisse bulunamadı.</div>
        ) : (
          filteredRows.map(({ asset, last, changePct }) => {
            const isSelected = asset.symbol === activeSymbol;
            const isWatched = watchlist.includes(asset.symbol);

            return (
              <div
                key={asset.symbol}
                onClick={() => {
                  onSelectSymbol(asset.symbol);
                  onCloseMobile();
                }}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#18181b] border-l-2 border-l-[#f59e0b]'
                    : 'hover:bg-[#18181b]/50 border-l-2 border-l-transparent'
                }`}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWatchlist(asset.symbol);
                    }}
                    className="text-zinc-600 hover:text-[#f59e0b] shrink-0"
                    title={isWatched ? 'Favoriden çıkar' : 'Favoriye ekle'}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        isWatched ? 'fill-[#f59e0b] text-[#f59e0b]' : ''
                      }`}
                      strokeWidth={1.5}
                    />
                  </button>
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-semibold text-zinc-100 leading-tight">
                      {asset.symbol}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate mt-0.5">{asset.name}</div>
                  </div>
                </div>

                <div className="text-right font-mono tabular-nums shrink-0">
                  <div className="text-xs text-zinc-100">
                    {asset.currency === 'TRY' ? '₺' : '$'}
                    {last.toFixed(2)}
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      changePct >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
                    }`}
                  >
                    {changePct >= 0 ? '+' : ''}
                    {changePct.toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:flex h-full">{content}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/75" onClick={onCloseMobile} />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}

