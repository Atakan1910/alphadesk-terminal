import { useEffect, useMemo, useState } from 'react';
import { Globe, Loader2, Plus, Search, Star, X } from 'lucide-react';
import { HybridMarketDataAdapter } from '../../data/dataAdapter';
import type { RemoteSearchItem, StockAsset } from '../../types/market';

type FilterMode = 'ALL' | 'BIST' | 'GLOBAL' | 'WATCHLIST';

interface SidebarWatchlistProps {
  assets: StockAsset[];
  activeSymbol: string;
  watchlist: string[];
  workerUrl: string;
  loadingRemoteSymbol: string | null;
  onSelectSymbol: (symbol: string) => void;
  onLoadRemoteStock: (item: RemoteSearchItem) => void;
  onToggleWatchlist: (symbol: string) => void;
  onOpenSettings: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function SidebarWatchlist({
  assets,
  activeSymbol,
  watchlist,
  workerUrl,
  loadingRemoteSymbol,
  onSelectSymbol,
  onLoadRemoteStock,
  onToggleWatchlist,
  onOpenSettings,
  mobileOpen,
  onCloseMobile,
}: SidebarWatchlistProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('ALL');
  const [remoteResults, setRemoteResults] = useState<RemoteSearchItem[]>([]);
  const [searchingRemote, setSearchingRemote] = useState(false);

  const existingSymbolSet = useMemo(
    () => new Set(assets.map((a) => a.symbol.toUpperCase())),
    [assets]
  );

  const isSearchValid = Boolean(workerUrl.trim()) && query.trim().length >= 2;

  useEffect(() => {
    if (!isSearchValid) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearchingRemote(true);
      const items = await HybridMarketDataAdapter.searchRemoteSymbols(query.trim(), workerUrl);
      if (cancelled) return;
      setRemoteResults(items.filter((item) => !existingSymbolSet.has(item.symbol.toUpperCase())));
      setSearchingRemote(false);
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, workerUrl, existingSymbolSet, isSearchValid]);

  const activeRemoteResults = isSearchValid ? remoteResults : [];
  const isSearchingRemoteActive = isSearchValid && searchingRemote;

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

  const cleanUpper = query.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '');
  const showDirectBistShortcut =
    Boolean(workerUrl.trim()) &&
    cleanUpper.length >= 3 &&
    cleanUpper.length <= 6 &&
    !cleanUpper.includes('.') &&
    !existingSymbolSet.has(cleanUpper) &&
    !activeRemoteResults.some((r) => r.symbol === cleanUpper);

  const content = (
    <aside className="flex flex-col h-full w-64 border-r border-[#27272a] bg-[#111113] shrink-0">
      <div className="p-3 border-b border-[#27272a] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-300">
            Hisseler <span className="font-mono text-zinc-500">({filteredRows.length})</span>
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
            placeholder={
              workerUrl.trim() ? 'Tüm BIST & Dünya ara...' : 'Ara: THYAO, SASA, AAPL...'
            }
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
        {/* Canlı Cloudflare Worker Sonuçları */}
        {query.trim().length >= 2 && workerUrl.trim() && (
          <div className="bg-[#09090b] border-b border-[#27272a]">
            <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-mono uppercase text-[#f59e0b] border-b border-[#27272a]/60">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3 h-3" strokeWidth={1.5} /> Canlı Borsa Araması
              </span>
              {isSearchingRemoteActive && <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />}
            </div>

            {showDirectBistShortcut && (
              <button
                type="button"
                disabled={loadingRemoteSymbol === `${cleanUpper}.IS`}
                onClick={() => {
                  onLoadRemoteStock({
                    symbol: cleanUpper,
                    yfSymbol: `${cleanUpper}.IS`,
                    name: `${cleanUpper} (Borsa İstanbul)`,
                    exchange: 'BIST',
                    market: 'BIST',
                    currency: 'TRY',
                  });
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[#18181b] border-b border-[#27272a]/40"
              >
                <div className="min-w-0">
                  <div className="text-xs font-mono font-semibold text-zinc-100">
                    {cleanUpper}.IS
                  </div>
                  <div className="text-[10px] text-zinc-500">BIST sembolünü doğrudan çek</div>
                </div>
                {loadingRemoteSymbol === `${cleanUpper}.IS` ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#f59e0b]" strokeWidth={1.5} />
                ) : (
                  <Plus className="w-3.5 h-3.5 text-[#f59e0b]" strokeWidth={1.5} />
                )}
              </button>
            )}

            {activeRemoteResults.map((item) => {
              const isBusy = loadingRemoteSymbol === item.yfSymbol;
              return (
                <button
                  key={item.yfSymbol}
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    onLoadRemoteStock(item);
                    onCloseMobile();
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[#18181b] border-b border-[#27272a]/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-semibold text-zinc-100">
                        {item.symbol}
                      </span>
                      <span className="text-[9px] font-mono px-1 border border-[#27272a] text-zinc-400">
                        {item.exchange}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">{item.name}</div>
                  </div>
                  {isBusy ? (
                    <Loader2
                      className="w-3.5 h-3.5 animate-spin text-[#f59e0b] shrink-0"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-[#10b981] shrink-0" strokeWidth={1.5} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {filteredRows.length === 0 ? (
          <div className="p-5 text-xs text-zinc-500 text-center space-y-2">
            <div>Kayıtlı listede eşleşen hisse yok.</div>
            {!workerUrl.trim() && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-2.5 py-1.5 border border-[#f59e0b]/40 text-[#f59e0b] hover:bg-[#18181b] text-[11px]"
              >
                Tüm borsalar için Worker bağla
              </button>
            )}
          </div>
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
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-semibold text-zinc-100 leading-tight">
                        {asset.symbol}
                      </span>
                      {asset.dataSource === 'CLOUDFLARE_WORKER' && (
                        <span className="text-[9px] font-mono text-[#10b981]">CANLI</span>
                      )}
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
