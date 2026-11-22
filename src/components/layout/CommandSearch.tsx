import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Loader2, Plus, Search, X } from 'lucide-react';
import { HybridMarketDataAdapter } from '../../data/dataAdapter';
import type { RemoteSearchItem, StockAsset } from '../../types/market';

interface CommandSearchProps {
  assets: StockAsset[];
  workerUrl: string;
  loadingRemoteSymbol: string | null;
  onSelectSymbol: (symbol: string) => void;
  onLoadRemoteStock: (item: RemoteSearchItem) => void;
  onOpenSettings: () => void;
}

export function CommandSearch({
  assets,
  workerUrl,
  loadingRemoteSymbol,
  onSelectSymbol,
  onLoadRemoteStock,
  onOpenSettings,
}: CommandSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [remoteResults, setRemoteResults] = useState<RemoteSearchItem[]>([]);
  const [searchingRemote, setSearchingRemote] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const existingSet = useMemo(
    () => new Set(assets.map((a) => a.symbol.toUpperCase())),
    [assets]
  );

  // Global Ctrl+K / Cmd+K / "/" kısayolu
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!open || !workerUrl.trim() || q.length < 2) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearchingRemote(true);
      const items = await HybridMarketDataAdapter.searchRemoteSymbols(q, workerUrl);
      if (cancelled) return;
      setRemoteResults(items.filter((i) => !existingSet.has(i.symbol.toUpperCase())).slice(0, 8));
      setSearchingRemote(false);
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open, workerUrl, existingSet]);

  const effectiveRemoteResults = useMemo(() => {
    if (!open || !workerUrl.trim() || query.trim().length < 2) {
      return [];
    }
    return remoteResults;
  }, [open, workerUrl, query, remoteResults]);

  const localMatches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    const list = q
      ? assets.filter(
          (a) =>
            a.symbol.toLowerCase().includes(q) ||
            a.name.toLocaleLowerCase('tr-TR').includes(q) ||
            a.sector.toLocaleLowerCase('tr-TR').includes(q)
        )
      : assets.slice(0, 8);
    return list.slice(0, 8);
  }, [assets, query]);

  const cleanUpper = query.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '');
  const showDirectBist =
    Boolean(workerUrl.trim()) &&
    cleanUpper.length >= 3 &&
    cleanUpper.length <= 6 &&
    !cleanUpper.includes('.') &&
    !existingSet.has(cleanUpper) &&
    !effectiveRemoteResults.some((r) => r.symbol === cleanUpper);

  type CombinedOption =
    | { kind: 'LOCAL'; asset: StockAsset }
    | { kind: 'REMOTE'; item: RemoteSearchItem };

  const combinedOptions = useMemo<CombinedOption[]>(() => {
    const opts: CombinedOption[] = localMatches.map((asset) => ({ kind: 'LOCAL', asset }));
    if (showDirectBist) {
      opts.push({
        kind: 'REMOTE',
        item: {
          symbol: cleanUpper,
          yfSymbol: `${cleanUpper}.IS`,
          name: `${cleanUpper} (Borsa İstanbul — Doğrudan Çek)`,
          exchange: 'BIST',
          market: 'BIST',
          currency: 'TRY',
        },
      });
    }
    for (const item of effectiveRemoteResults) {
      opts.push({ kind: 'REMOTE', item });
    }
    return opts;
  }, [localMatches, showDirectBist, cleanUpper, effectiveRemoteResults]);

  const safeActiveIndex =
    combinedOptions.length > 0 ? Math.min(activeIndex, combinedOptions.length - 1) : 0;

  const selectOption = (opt: CombinedOption) => {
    if (opt.kind === 'LOCAL') {
      onSelectSymbol(opt.asset.symbol);
    } else {
      onLoadRemoteStock(opt.item);
    }
    setQuery('');
    setRemoteResults([]);
    setActiveIndex(0);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(combinedOptions.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'Enter' && combinedOptions[safeActiveIndex]) {
      e.preventDefault();
      selectOption(combinedOptions[safeActiveIndex]);
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-md">
      <div className="relative flex items-center">
        <Search
          className="w-3.5 h-3.5 text-zinc-500 absolute left-3 pointer-events-none"
          strokeWidth={1.5}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            workerUrl.trim()
              ? 'Tüm BIST ve Dünya hisselerinde ara...'
              : 'Hisse ara (THYAO, NVDA, SASA)...'
          }
          className="w-full bg-[#09090b] border border-[#27272a] focus:border-[#f59e0b] focus:outline-none pl-9 pr-14 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 transition-colors"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setActiveIndex(0);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 text-zinc-500 hover:text-zinc-200"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        ) : (
          <kbd className="hidden sm:inline-block absolute right-2 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 border border-[#27272a] bg-[#111113]">
            Ctrl K
          </kbd>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 border border-[#27272a] bg-[#111113] shadow-2xl max-h-96 overflow-y-auto">
          {localMatches.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 bg-[#09090b] border-b border-[#27272a]">
                {query.trim() ? 'Kayıtlı Piyasa Evreni' : 'Hızlı Erişim'}
              </div>
              {localMatches.map((asset, idx) => {
                const len = asset.bars.length;
                const last = asset.bars[len - 1]?.close ?? 0;
                const prev = asset.bars[len - 2]?.close ?? last;
                const pct = prev > 0 ? ((last - prev) / prev) * 100 : 0;
                const highlighted = idx === safeActiveIndex;

                return (
                  <button
                    key={asset.symbol}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectOption({ kind: 'LOCAL', asset })}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left border-b border-[#27272a]/40 transition-colors ${
                      highlighted ? 'bg-[#18181b]' : 'hover:bg-[#18181b]/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-zinc-100">
                          {asset.symbol}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">{asset.market}</span>
                        <span className="text-[11px] text-zinc-400 truncate">{asset.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 font-mono tabular-nums text-xs shrink-0">
                      <span className="text-zinc-200">
                        {asset.currency === 'TRY' ? '₺' : '$'}
                        {last.toFixed(2)}
                      </span>
                      <span
                        className={`text-[11px] w-14 text-right ${
                          pct >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
                        }`}
                      >
                        {pct >= 0 ? '+' : ''}
                        {pct.toFixed(2)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Canlı Cloudflare Worker Sonuçları */}
          {query.trim().length >= 2 && (
            <div>
              <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#f59e0b] bg-[#09090b] border-b border-[#27272a]">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3" strokeWidth={1.5} />
                  Tüm Dünya & BIST Canlı Arama
                </span>
                {searchingRemote && <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />}
              </div>

              {!workerUrl.trim() ? (
                <div className="px-3 py-3 flex items-center justify-between gap-2 text-xs text-zinc-400">
                  <span>Diğer tüm hisseler için Cloudflare Worker bağlı değil.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onOpenSettings();
                    }}
                    className="px-2 py-1 border border-[#f59e0b]/40 text-[#f59e0b] hover:bg-[#18181b] text-[11px] shrink-0"
                  >
                    Bağla
                  </button>
                </div>
              ) : combinedOptions.filter((o) => o.kind === 'REMOTE').length === 0 &&
                !searchingRemote ? (
                <div className="px-3 py-2.5 text-xs text-zinc-500">
                  Ek canlı eşleşme bulunamadı.
                </div>
              ) : (
                combinedOptions.map((opt, idx) => {
                  if (opt.kind !== 'REMOTE') return null;
                  const item = opt.item;
                  const isBusy = loadingRemoteSymbol === item.yfSymbol;
                  const highlighted = idx === safeActiveIndex;

                  return (
                    <button
                      key={item.yfSymbol}
                      type="button"
                      disabled={isBusy}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => selectOption(opt)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left border-b border-[#27272a]/40 transition-colors ${
                        highlighted ? 'bg-[#18181b]' : 'hover:bg-[#18181b]/60'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-zinc-100">
                            {item.symbol}
                          </span>
                          <span className="text-[10px] font-mono px-1 border border-[#27272a] text-zinc-400">
                            {item.exchange}
                          </span>
                          <span className="text-[11px] text-zinc-400 truncate">{item.name}</span>
                        </div>
                      </div>
                      {isBusy ? (
                        <Loader2
                          className="w-3.5 h-3.5 animate-spin text-[#f59e0b] shrink-0"
                          strokeWidth={1.5}
                        />
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-[#10b981] shrink-0">
                          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                          Aç
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
