import { useCallback, useEffect, useState } from 'react';
import type { ApiSettings, PortfolioPosition, StockAsset, TimeframeKey } from '../types/market';

const STORAGE_KEYS = {
  ACTIVE_SYMBOL: 'alphadesk_active_symbol_v1',
  WATCHLIST: 'alphadesk_watchlist_v1',
  PORTFOLIO: 'alphadesk_portfolio_v1',
  API_SETTINGS: 'alphadesk_api_settings_v1',
  TIMEFRAME: 'alphadesk_timeframe_v1',
} as const;

const DEFAULT_WATCHLIST = ['THYAO', 'ASELS', 'TUPRS', 'KCHOL', 'BIMAS', 'AAPL', 'NVDA', 'MSFT'];
const DEFAULT_API_SETTINGS: ApiSettings = { provider: 'NONE', apiKey: '' };

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded or private mode restriction
  }
}

export function useTerminalStore() {
  const [activeSymbol, setActiveSymbol] = useState<string>(() =>
    readStorage<string>(STORAGE_KEYS.ACTIVE_SYMBOL, 'THYAO')
  );
  const [watchlist, setWatchlist] = useState<string[]>(() =>
    readStorage<string[]>(STORAGE_KEYS.WATCHLIST, DEFAULT_WATCHLIST)
  );
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>(() =>
    readStorage<PortfolioPosition[]>(STORAGE_KEYS.PORTFOLIO, [])
  );
  const [apiSettings, setApiSettings] = useState<ApiSettings>(() =>
    readStorage<ApiSettings>(STORAGE_KEYS.API_SETTINGS, DEFAULT_API_SETTINGS)
  );
  const [timeframe, setTimeframe] = useState<TimeframeKey>(() =>
    readStorage<TimeframeKey>(STORAGE_KEYS.TIMEFRAME, '6A')
  );

  useEffect(() => {
    writeStorage(STORAGE_KEYS.ACTIVE_SYMBOL, activeSymbol);
  }, [activeSymbol]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.WATCHLIST, watchlist);
  }, [watchlist]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.PORTFOLIO, portfolio);
  }, [portfolio]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.API_SETTINGS, apiSettings);
  }, [apiSettings]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.TIMEFRAME, timeframe);
  }, [timeframe]);

  const toggleWatchlist = useCallback((symbol: string) => {
    const sym = symbol.trim().toUpperCase();
    setWatchlist((prev) =>
      prev.includes(sym) ? prev.filter((item) => item !== sym) : [...prev, sym]
    );
  }, []);

  const addPosition = useCallback((symbol: string, quantity: number, avgCost: number) => {
    const sym = symbol.trim().toUpperCase();
    if (!sym || quantity <= 0 || avgCost <= 0) return;

    setPortfolio((prev) => {
      const existing = prev.find((p) => p.symbol === sym);
      if (existing) {
        const newQty = existing.quantity + quantity;
        const blendedCost =
          (existing.quantity * existing.avgCost + quantity * avgCost) / newQty;
        return prev.map((p) =>
          p.symbol === sym
            ? {
                ...p,
                quantity: Math.round(newQty * 1000) / 1000,
                avgCost: Math.round(blendedCost * 100) / 100,
              }
            : p
        );
      }

      return [
        ...prev,
        {
          id: `${sym}_${Date.now()}`,
          symbol: sym,
          quantity: Math.round(quantity * 1000) / 1000,
          avgCost: Math.round(avgCost * 100) / 100,
          addedAt: new Date().toISOString().slice(0, 10),
        },
      ];
    });
  }, []);

  const removePosition = useCallback((id: string) => {
    setPortfolio((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearPortfolio = useCallback(() => {
    setPortfolio([]);
  }, []);

  const loadSamplePortfolio = useCallback((assets: StockAsset[]) => {
    const pick = (sym: string, qty: number, discount: number): PortfolioPosition | null => {
      const asset = assets.find((a) => a.symbol === sym);
      if (!asset || asset.bars.length === 0) return null;
      const last = asset.bars[asset.bars.length - 1].close;
      return {
        id: `sample_${sym}`,
        symbol: sym,
        quantity: qty,
        avgCost: Math.round(last * discount * 100) / 100,
        addedAt: asset.lastUpdated,
      };
    };

    const samples = [
      pick('THYAO', 120, 0.91),
      pick('ASELS', 350, 0.88),
      pick('TUPRS', 150, 0.96),
      pick('NVDA', 12, 0.89),
      pick('MSFT', 5, 0.95),
    ].filter((item): item is PortfolioPosition => item !== null);

    setPortfolio(samples);
  }, []);

  const exportPortfolioJson = useCallback((): string => {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        watchlist,
        portfolio,
      },
      null,
      2
    );
  }, [watchlist, portfolio]);

  const importPortfolioJson = useCallback((rawJson: string): { ok: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(rawJson) as {
        watchlist?: unknown;
        portfolio?: unknown;
      };
      if (!parsed || typeof parsed !== 'object') {
        return { ok: false, error: 'Geçersiz JSON yapısı.' };
      }
      if (Array.isArray(parsed.portfolio)) {
        const cleanPositions: PortfolioPosition[] = parsed.portfolio
          .filter(
            (item): item is PortfolioPosition =>
              typeof item === 'object' &&
              item !== null &&
              typeof (item as PortfolioPosition).symbol === 'string' &&
              typeof (item as PortfolioPosition).quantity === 'number' &&
              (item as PortfolioPosition).quantity > 0 &&
              typeof (item as PortfolioPosition).avgCost === 'number' &&
              (item as PortfolioPosition).avgCost > 0
          )
          .map((item, idx) => ({
            id: item.id || `${item.symbol}_${Date.now()}_${idx}`,
            symbol: item.symbol.trim().toUpperCase(),
            quantity: item.quantity,
            avgCost: item.avgCost,
            addedAt: item.addedAt || new Date().toISOString().slice(0, 10),
          }));
        setPortfolio(cleanPositions);
      }
      if (Array.isArray(parsed.watchlist)) {
        const cleanWatchlist = parsed.watchlist
          .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
          .map((s) => s.trim().toUpperCase());
        if (cleanWatchlist.length > 0) {
          setWatchlist(Array.from(new Set(cleanWatchlist)));
        }
      }
      return { ok: true };
    } catch {
      return { ok: false, error: 'JSON ayrıştırılamadı.' };
    }
  }, []);

  return {
    activeSymbol,
    setActiveSymbol,
    watchlist,
    toggleWatchlist,
    portfolio,
    addPosition,
    removePosition,
    clearPortfolio,
    loadSamplePortfolio,
    exportPortfolioJson,
    importPortfolioJson,
    apiSettings,
    setApiSettings,
    timeframe,
    setTimeframe,
  };
}
