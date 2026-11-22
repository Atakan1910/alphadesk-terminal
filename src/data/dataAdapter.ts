import type {
  ApiSettings,
  CurrencyCode,
  MacroTicker,
  MarketRegion,
  OHLCVBar,
  QuarterlyFinancial,
  RemoteSearchItem,
  SectorBenchmarks,
  StockAsset,
} from '../types/market';
import { getMacroTickers, getSeedStockBySymbol, getSeedStockUniverse } from './seedMarketData';

export interface DataFetchResult {
  asset: StockAsset;
  warning: string | null;
}

export interface AllAssetsLoadResult {
  assets: StockAsset[];
  macro: MacroTicker[];
  generatedAt: string | null;
  pipelineActive: boolean;
}

interface PipelineStockRecord {
  name?: string;
  market?: MarketRegion;
  currency?: CurrencyCode;
  sector?: string;
  bars: OHLCVBar[];
  quarters?: QuarterlyFinancial[];
  beta?: number | null;
  dividendYield?: number | null;
  lastUpdated?: string;
}

interface PipelinePayload {
  generatedAt: string;
  macro?: MacroTicker[];
  stocks: Record<string, PipelineStockRecord>;
}

const DEFAULT_BENCHMARKS: Record<string, SectorBenchmarks> = {
  Havacılık: { sector: 'Havacılık', avgPE: 6.8, avgPB: 0.95, avgEvEbitda: 5.2, avgNetMargin: 11.5, avgROE: 19.0 },
  Savunma: { sector: 'Savunma', avgPE: 21.5, avgPB: 3.1, avgEvEbitda: 14.5, avgNetMargin: 14.0, avgROE: 18.5 },
  Enerji: { sector: 'Enerji', avgPE: 9.5, avgPB: 1.8, avgEvEbitda: 6.2, avgNetMargin: 9.0, avgROE: 20.0 },
  Holding: { sector: 'Holding', avgPE: 6.5, avgPB: 1.05, avgEvEbitda: 5.5, avgNetMargin: 9.0, avgROE: 21.0 },
  Perakende: { sector: 'Perakende', avgPE: 16.5, avgPB: 4.2, avgEvEbitda: 9.2, avgNetMargin: 4.5, avgROE: 28.0 },
  Sanayi: { sector: 'Sanayi', avgPE: 11.2, avgPB: 1.5, avgEvEbitda: 7.1, avgNetMargin: 9.5, avgROE: 16.0 },
  Bankacılık: { sector: 'Bankacılık', avgPE: 5.2, avgPB: 1.25, avgEvEbitda: 4.5, avgNetMargin: 24.0, avgROE: 26.5 },
  Finans: { sector: 'Finans', avgPE: 10.5, avgPB: 2.2, avgEvEbitda: 7.8, avgNetMargin: 22.0, avgROE: 28.0 },
  Otomotiv: { sector: 'Otomotiv', avgPE: 9.8, avgPB: 3.4, avgEvEbitda: 7.4, avgNetMargin: 8.8, avgROE: 31.0 },
  Teknoloji: { sector: 'Teknoloji', avgPE: 28.0, avgPB: 8.5, avgEvEbitda: 19.0, avgNetMargin: 22.0, avgROE: 30.0 },
  Yarıİletken: { sector: 'Yarıİletken', avgPE: 36.0, avgPB: 14.0, avgEvEbitda: 25.0, avgNetMargin: 30.0, avgROE: 40.0 },
  'E-Ticaret': { sector: 'E-Ticaret', avgPE: 34.0, avgPB: 7.5, avgEvEbitda: 18.0, avgNetMargin: 9.5, avgROE: 22.0 },
  'Gıda & İçecek': { sector: 'Gıda & İçecek', avgPE: 14.0, avgPB: 3.0, avgEvEbitda: 8.5, avgNetMargin: 10.0, avgROE: 24.0 },
  'Çimento & İnşaat': { sector: 'Çimento & İnşaat', avgPE: 9.5, avgPB: 1.9, avgEvEbitda: 6.4, avgNetMargin: 13.0, avgROE: 21.0 },
  Madencilik: { sector: 'Madencilik', avgPE: 12.0, avgPB: 1.8, avgEvEbitda: 6.8, avgNetMargin: 18.0, avgROE: 20.0 },
  Telekom: { sector: 'Telekom', avgPE: 11.0, avgPB: 1.6, avgEvEbitda: 4.9, avgNetMargin: 12.0, avgROE: 19.0 },
  GYO: { sector: 'GYO', avgPE: 6.5, avgPB: 0.75, avgEvEbitda: 6.0, avgNetMargin: 28.0, avgROE: 16.0 },
  Sağlık: { sector: 'Sağlık', avgPE: 18.0, avgPB: 4.5, avgEvEbitda: 11.0, avgNetMargin: 11.0, avgROE: 24.0 },
};

let cachedPipeline: PipelinePayload | null | undefined = undefined;

async function fetchWithTimeout(
  url: string,
  timeoutMs = 5500,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function loadPipelineData(forceRefresh = false): Promise<PipelinePayload | null> {
  if (!forceRefresh && cachedPipeline !== undefined) {
    return cachedPipeline;
  }

  try {
    const url = forceRefresh ? `./market-data.json?t=${Date.now()}` : './market-data.json';
    const res = await fetchWithTimeout(url, 7000, {
      cache: forceRefresh ? 'no-store' : 'default',
    });
    if (!res.ok) {
      cachedPipeline = null;
      return null;
    }

    const json = (await res.json()) as PipelinePayload;
    if (!json || typeof json.stocks !== 'object' || json.stocks === null) {
      cachedPipeline = null;
      return null;
    }

    cachedPipeline = json;
    return json;
  } catch {
    cachedPipeline = null;
    return null;
  }
}

function estimateBetaFromBars(bars: OHLCVBar[]): number {
  if (bars.length < 30) return 1.0;
  const rets: number[] = [];
  for (let i = Math.max(1, bars.length - 120); i < bars.length; i++) {
    if (bars[i - 1].close > 0) {
      rets.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close);
    }
  }
  const mean = rets.reduce((a, b) => a + b, 0) / Math.max(1, rets.length);
  const variance =
    rets.reduce((a, r) => a + (r - mean) * (r - mean), 0) / Math.max(1, rets.length - 1);
  const annVol = Math.sqrt(variance * 252);
  // Ratio against typical 24% market volatility, bounded cleanly
  return Math.round(Math.min(2.1, Math.max(0.55, annVol / 0.24)) * 100) / 100;
}

function mergeSeedWithPipeline(seed: StockAsset, rec?: PipelineStockRecord): StockAsset {
  if (!rec || !Array.isArray(rec.bars) || rec.bars.length < 30) {
    return seed;
  }

  const quarters =
    Array.isArray(rec.quarters) && rec.quarters.length >= 4 ? rec.quarters : seed.quarters;

  return {
    ...seed,
    bars: rec.bars,
    quarters,
    beta: typeof rec.beta === 'number' && rec.beta > 0 ? rec.beta : seed.beta,
    dividendYield:
      typeof rec.dividendYield === 'number' && rec.dividendYield >= 0
        ? rec.dividendYield
        : seed.dividendYield,
    dataSource: 'PIPELINE_JSON',
    lastUpdated: rec.lastUpdated || rec.bars[rec.bars.length - 1].time,
  };
}

function buildDynamicAssetFromPipeline(symbol: string, rec: PipelineStockRecord): StockAsset | null {
  if (!rec || !Array.isArray(rec.bars) || rec.bars.length < 30) return null;

  const market: MarketRegion = rec.market === 'GLOBAL' ? 'GLOBAL' : 'BIST';
  const currency: CurrencyCode = rec.currency === 'USD' || market === 'GLOBAL' ? 'USD' : 'TRY';
  const sector = rec.sector || 'Sanayi';
  const benchmarks = DEFAULT_BENCHMARKS[sector] ?? DEFAULT_BENCHMARKS['Sanayi'];

  return {
    symbol,
    name: rec.name || symbol,
    market,
    currency,
    sector,
    beta: typeof rec.beta === 'number' && rec.beta > 0 ? rec.beta : estimateBetaFromBars(rec.bars),
    dividendYield:
      typeof rec.dividendYield === 'number' && rec.dividendYield >= 0 ? rec.dividendYield : 0,
    expectedGrowthRate: market === 'BIST' ? 13.0 : 11.5,
    description: `${market === 'BIST' ? 'Borsa İstanbul' : 'ABD Borsası'} · ${sector} sektörü hisse senedi.`,
    bars: rec.bars,
    quarters: Array.isArray(rec.quarters) ? rec.quarters : [],
    benchmarks,
    news: [],
    dataSource: 'PIPELINE_JSON',
    lastUpdated: rec.lastUpdated || rec.bars[rec.bars.length - 1].time,
  };
}

async function fetchFinnhubQuote(
  symbol: string,
  apiKey: string
): Promise<{ c: number; h: number; l: number; o: number } | null> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { c?: number; h?: number; l?: number; o?: number };
  if (typeof data.c !== 'number' || data.c <= 0) return null;
  return {
    c: data.c,
    h: typeof data.h === 'number' && data.h > 0 ? data.h : data.c,
    l: typeof data.l === 'number' && data.l > 0 ? data.l : data.c,
    o: typeof data.o === 'number' && data.o > 0 ? data.o : data.c,
  };
}

async function fetchAlphaVantageDaily(symbol: string, apiKey: string): Promise<OHLCVBar[] | null> {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetchWithTimeout(url, 6000);
  if (!res.ok) return null;
  const json = (await res.json()) as Record<string, unknown>;
  const series = json['Time Series (Daily)'] as Record<string, Record<string, string>> | undefined;
  if (!series || typeof series !== 'object') return null;

  const bars: OHLCVBar[] = Object.entries(series)
    .map(([date, row]) => ({
      time: date,
      open: Number(row['1. open']),
      high: Number(row['2. high']),
      low: Number(row['3. low']),
      close: Number(row['4. close']),
      volume: Math.round(Number(row['5. volume'])),
    }))
    .filter((b) => Number.isFinite(b.close) && b.close > 0)
    .sort((a, b) => a.time.localeCompare(b.time));

  return bars.length >= 30 ? bars : null;
}

function rescaleHistoryToLivePrice(
  bars: OHLCVBar[],
  liveQuote: { c: number; h: number; l: number; o: number }
): OHLCVBar[] {
  if (bars.length === 0) return bars;
  const lastClose = bars[bars.length - 1].close;
  const ratio = liveQuote.c / lastClose;
  const scaled = bars.map((bar) => ({
    ...bar,
    open: Math.round(bar.open * ratio * 100) / 100,
    high: Math.round(bar.high * ratio * 100) / 100,
    low: Math.round(bar.low * ratio * 100) / 100,
    close: Math.round(bar.close * ratio * 100) / 100,
  }));
  const lastIdx = scaled.length - 1;
  scaled[lastIdx] = {
    ...scaled[lastIdx],
    open: Math.round(liveQuote.o * 100) / 100,
    high: Math.round(Math.max(liveQuote.h, liveQuote.c, liveQuote.o) * 100) / 100,
    low: Math.round(Math.min(liveQuote.l, liveQuote.c, liveQuote.o) * 100) / 100,
    close: Math.round(liveQuote.c * 100) / 100,
  };
  return scaled;
}

export class HybridMarketDataAdapter {
  static getAllSeedAssets(): StockAsset[] {
    return getSeedStockUniverse();
  }

  static async loadAllAssets(forceRefresh = false): Promise<AllAssetsLoadResult> {
    const seeds = getSeedStockUniverse();
    const pipeline = await loadPipelineData(forceRefresh);

    if (!pipeline) {
      return {
        assets: seeds,
        macro: getMacroTickers(),
        generatedAt: null,
        pipelineActive: false,
      };
    }

    const seedMap = new Map<string, StockAsset>(seeds.map((s) => [s.symbol, s]));
    const mergedList: StockAsset[] = [];

    // 1. Merge core seed stocks first
    for (const seed of seeds) {
      mergedList.push(mergeSeedWithPipeline(seed, pipeline.stocks[seed.symbol]));
    }

    // 2. Dynamically append ALL remaining BIST 100 & Global stocks from market-data.json
    for (const [symbol, rec] of Object.entries(pipeline.stocks)) {
      if (seedMap.has(symbol)) continue;
      const dyn = buildDynamicAssetFromPipeline(symbol, rec);
      if (dyn) mergedList.push(dyn);
    }

    const pipelineActive = mergedList.some((a) => a.dataSource === 'PIPELINE_JSON');
    const macro =
      Array.isArray(pipeline.macro) && pipeline.macro.length > 0
        ? pipeline.macro
        : getMacroTickers();

    return {
      assets: mergedList,
      macro,
      generatedAt: pipelineActive ? pipeline.generatedAt : null,
      pipelineActive,
    };
  }

  static async loadAsset(symbol: string, settings: ApiSettings): Promise<DataFetchResult> {
    const pipeline = await loadPipelineData();
    const seed = getSeedStockBySymbol(symbol);
    const pipelineRec = pipeline?.stocks[symbol.toUpperCase()];

    const baseAsset = seed
      ? mergeSeedWithPipeline(seed, pipelineRec)
      : (pipelineRec && buildDynamicAssetFromPipeline(symbol.toUpperCase(), pipelineRec)) ||
        getSeedStockUniverse()[0];

    if (settings.provider === 'NONE' || !settings.apiKey.trim()) {
      return { asset: baseAsset, warning: null };
    }

    if (baseAsset.market === 'BIST') {
      return {
        asset: baseAsset,
        warning:
          baseAsset.dataSource === 'PIPELINE_JSON'
            ? null
            : 'BIST hisseleri için tarayıcı CORS kısıtı nedeniyle yerel veri motoru kullanılıyor.',
      };
    }

    try {
      if (settings.provider === 'FINNHUB') {
        const quote = await fetchFinnhubQuote(baseAsset.symbol, settings.apiKey.trim());
        if (!quote) {
          return {
            asset: baseAsset,
            warning: 'Finnhub yanıtı geçersiz veya limit aşıldı. Mevcut veriye dönüldü.',
          };
        }
        return {
          asset: {
            ...baseAsset,
            bars: rescaleHistoryToLivePrice(baseAsset.bars, quote),
            dataSource: 'LIVE_FINNHUB',
            lastUpdated: new Date().toISOString().slice(0, 10),
          },
          warning: null,
        };
      }

      if (settings.provider === 'ALPHAVANTAGE') {
        const liveBars = await fetchAlphaVantageDaily(baseAsset.symbol, settings.apiKey.trim());
        if (!liveBars) {
          return {
            asset: baseAsset,
            warning: 'Alpha Vantage limit veya boş veri döndürdü. Mevcut veriye dönüldü.',
          };
        }
        return {
          asset: {
            ...baseAsset,
            bars: liveBars,
            dataSource: 'LIVE_ALPHAVANTAGE',
            lastUpdated: liveBars[liveBars.length - 1].time,
          },
          warning: null,
        };
      }
    } catch {
      return {
        asset: baseAsset,
        warning: 'Canlı API isteği zaman aşımına uğradı. Mevcut veri aktif.',
      };
    }

    return { asset: baseAsset, warning: null };
  }

  static async searchRemoteSymbols(
    query: string,
    workerUrl: string
  ): Promise<RemoteSearchItem[]> {
    const base = workerUrl.trim().replace(/\/+$/, '');
    const q = query.trim();
    if (!base || q.length < 2) return [];

    try {
      const res = await fetchWithTimeout(
        `${base}/search?q=${encodeURIComponent(q)}`,
        6000
      );
      if (!res.ok) return [];
      const json = (await res.json()) as { results?: RemoteSearchItem[] };
      return Array.isArray(json.results) ? json.results : [];
    } catch {
      return [];
    }
  }

  static async fetchRemoteStock(
    yfSymbol: string,
    workerUrl: string,
    metaHint?: Partial<RemoteSearchItem>
  ): Promise<StockAsset | null> {
    const base = workerUrl.trim().replace(/\/+$/, '');
    if (!base || !yfSymbol.trim()) return null;

    try {
      const res = await fetchWithTimeout(
        `${base}/stock?symbol=${encodeURIComponent(yfSymbol.trim().toUpperCase())}`,
        8000
      );
      if (!res.ok) return null;

      const data = (await res.json()) as {
        symbol?: string;
        name?: string;
        market?: MarketRegion;
        currency?: CurrencyCode;
        bars?: OHLCVBar[];
        lastUpdated?: string;
      };

      if (!Array.isArray(data.bars) || data.bars.length < 20) return null;

      const symbol = (data.symbol || metaHint?.symbol || yfSymbol.replace(/\.IS$/i, '')).toUpperCase();
      const market: MarketRegion =
        data.market || metaHint?.market || (yfSymbol.endsWith('.IS') ? 'BIST' : 'GLOBAL');
      const currency: CurrencyCode =
        data.currency || metaHint?.currency || (market === 'BIST' ? 'TRY' : 'USD');
      const sector = metaHint?.sector || (market === 'BIST' ? 'Sanayi' : 'Teknoloji');
      const benchmarks = DEFAULT_BENCHMARKS[sector] ?? DEFAULT_BENCHMARKS['Sanayi'];

      // Eğer bu hissenin yerel/ETL bilançosu zaten varsa koru
      const seed = getSeedStockBySymbol(symbol);
      const pipeline = await loadPipelineData();
      const pipeRec = pipeline?.stocks[symbol];
      const existingQuarters =
        pipeRec?.quarters && pipeRec.quarters.length >= 4 ? pipeRec.quarters : seed?.quarters ?? [];

      return {
        symbol,
        name: data.name || metaHint?.name || seed?.name || symbol,
        market,
        currency,
        sector: seed?.sector || sector,
        beta: seed?.beta ?? estimateBetaFromBars(data.bars),
        dividendYield: seed?.dividendYield ?? 0,
        expectedGrowthRate: seed?.expectedGrowthRate ?? (market === 'BIST' ? 13.0 : 11.5),
        description:
          seed?.description ||
          `${market === 'BIST' ? 'Borsa İstanbul' : 'Global Borsa'} · Cloudflare Worker üzerinden canlı çekildi.`,
        bars: data.bars,
        quarters: existingQuarters,
        benchmarks: seed?.benchmarks ?? benchmarks,
        news: seed?.news ?? [],
        dataSource: 'CLOUDFLARE_WORKER',
        lastUpdated: data.lastUpdated || data.bars[data.bars.length - 1].time,
      };
    } catch {
      return null;
    }
  }
}

