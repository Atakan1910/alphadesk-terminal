import { useMemo, useState } from 'react';
import { Star, X } from 'lucide-react';
import type { StockAsset } from '../../types/market';

type FilterMode = 'WATCHLIST' | 'BIST' | 'GLOBAL' | 'ALL';

interface SidebarWatchlistProps {
  assets: StockAsset[];
  activeSymbol: string;
  watchlist: string[];
  visible: boolean;
  onSelectSymbol: (symbol: string) => void;
  onToggleWatchlist: (symbol: string) => void;
  onClose: () => void;
}

export function SidebarWatchlist({
  assets,
  activeSymbol,
  watchlist,
  visible,
  onSelectSymbol,
  onToggleWatchlist,
  onClose,
}: SidebarWatchlistProps) {
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
    return rows.filter(({ asset }) => {
      if (filter === 'WATCHLIST') return watchlist.includes(asset.symbol);
      if (filter === 'BIST') return asset.market === 'BIST';
      if (filter === 'GLOBAL') return asset.market === 'GLOBAL';
      return true;
    });
  }, [rows, filter, watchlist]);

  if (!visible) return null;

  const panel = (
    <aside className="flex flex-col h-full w-60 border-r border-[#27272a] bg-[#111113] shrink-0">
      <div className="p-3 border-b border-[#27272a] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-200">
            İzleme Listesi{' '}
            <span className="font-mono text-zinc-500">({filteredRows.length})</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-200"
            title="Listeyi Gizle"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1">
          {(
            [
              { id: 'ALL', label: 'Tümü' },
              { id: 'WATCHLIST', label: 'Favori' },
              { id: 'BIST', label: 'BIST' },
              { id: 'GLOBAL', label: 'ABD' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`py-1 text-[10px] border transition-colors ${
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

      <div className="flex-1 overflow-y-auto divide-y divide-[#27272a]/40">
        {filteredRows.length === 0 ? (
          <div className="p-5 text-xs text-zinc-500 text-center">Bu filtrede hisse yok.</div>
        ) : (
          filteredRows.map(({ asset, last, changePct }) => {
            const isSelected = asset.symbol === activeSymbol;
            const isWatched = watchlist.includes(asset.symbol);

            return (
              <div
                key={asset.symbol}
                onClick={() => onSelectSymbol(asset.symbol)}
                className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer transition-colors ${
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
                  >
                    <Star
                      className={`w-3 h-3 ${
                        isWatched ? 'fill-[#f59e0b] text-[#f59e0b]' : ''
                      }`}
                      strokeWidth={1.5}
                    />
                  </button>
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-semibold text-zinc-100">
                      {asset.symbol}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate">{asset.name}</div>
                  </div>
                </div>

                <div className="text-right font-mono tabular-nums shrink-0">
                  <div className="text-xs text-zinc-200">
                    {asset.currency === 'TRY' ? '₺' : '$'}
                    {last.toFixed(2)}
                  </div>
                  <div
                    className={`text-[10px] ${
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
      <div className="hidden lg:flex h-full">{panel}</div>
      <div className="fixed inset-0 z-50 lg:hidden flex">
        <div className="fixed inset-0 bg-black/75" onClick={onClose} />
        <div className="relative z-10 h-full">{panel}</div>
      </div>
    </>
  );
}
