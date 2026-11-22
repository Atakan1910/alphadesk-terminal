const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const YF_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

function jsonResponse(data, status = 200, cacheSeconds = 300) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${cacheSeconds}`,
    },
  });
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function handleSearch(query) {
  const q = (query || '').trim();
  if (q.length < 2) return jsonResponse({ results: [] }, 200, 60);

  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    q
  )}&quotesCount=14&newsCount=0&enableFuzzyQuery=true`;

  const res = await fetch(url, {
    headers: YF_HEADERS,
    cf: { cacheTtl: 300, cacheEverything: true },
  });

  if (!res.ok) {
    return jsonResponse({ error: 'Arama servisi yanıt vermedi', results: [] }, 502, 0);
  }

  const raw = await res.json();
  const quotes = Array.isArray(raw.quotes) ? raw.quotes : [];

  const results = quotes
    .filter(
      (item) =>
        item &&
        item.symbol &&
        (item.quoteType === 'EQUITY' || item.quoteType === 'ETF') &&
        !String(item.symbol).includes('=')
    )
    .map((item) => {
      const yfSymbol = String(item.symbol).toUpperCase();
      const isBist = yfSymbol.endsWith('.IS') || item.exchange === 'IST';
      const cleanSymbol = isBist ? yfSymbol.replace(/\.IS$/, '') : yfSymbol;

      return {
        symbol: cleanSymbol,
        yfSymbol,
        name: item.longname || item.shortname || cleanSymbol,
        exchange: item.exchDisp || item.exchange || (isBist ? 'BIST' : 'GLOBAL'),
        market: isBist ? 'BIST' : 'GLOBAL',
        currency: isBist ? 'TRY' : 'USD',
        sector: item.sectorDisp || item.sector || (isBist ? 'BIST' : 'Global'),
      };
    });

  return jsonResponse({ results }, 200, 300);
}

async function handleStock(rawSymbol) {
  const sym = (rawSymbol || '').trim().toUpperCase();
  if (!sym) return jsonResponse({ error: 'symbol parametresi gerekli' }, 400, 0);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    sym
  )}?range=2y&interval=1d&includePrePost=false`;

  const res = await fetch(url, {
    headers: YF_HEADERS,
    cf: { cacheTtl: 300, cacheEverything: true },
  });

  if (!res.ok) {
    return jsonResponse({ error: 'Hisse verisi alınamadı' }, res.status, 0);
  }

  const raw = await res.json();
  const chartResult = raw?.chart?.result?.[0];
  if (!chartResult) {
    return jsonResponse({ error: 'Sembol bulunamadı' }, 404, 0);
  }

  const meta = chartResult.meta || {};
  const timestamps = chartResult.timestamp || [];
  const quote = chartResult.indicators?.quote?.[0] || {};
  const adjClose = chartResult.indicators?.adjclose?.[0]?.adjclose || null;

  const bars = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    const v = quote.volume?.[i] ?? 0;

    if (
      typeof o !== 'number' ||
      typeof h !== 'number' ||
      typeof l !== 'number' ||
      typeof c !== 'number' ||
      !Number.isFinite(c) ||
      c <= 0
    ) {
      continue;
    }

    // Temettü/bölünme uyarlaması varsa oranı koruyarak uygula
    const adj = adjClose && typeof adjClose[i] === 'number' && adjClose[i] > 0 ? adjClose[i] : c;
    const factor = c > 0 ? adj / c : 1;
    const adjO = round2(o * factor);
    const adjH = round2(h * factor);
    const adjL = round2(l * factor);
    const adjC = round2(adj);

    if (adjC <= 0 || adjO <= 0) continue;

    bars.push({
      time: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
      open: adjO,
      high: Math.max(adjH, adjO, adjC),
      low: Math.min(adjL, adjO, adjC),
      close: adjC,
      volume: Math.max(0, Math.round(v)),
    });
  }

  const trimmedBars = bars.slice(-365);
  if (trimmedBars.length < 20) {
    return jsonResponse({ error: 'Yetersiz fiyat geçmişi' }, 422, 0);
  }

  const yfSymbol = String(meta.symbol || sym).toUpperCase();
  const isBist = yfSymbol.endsWith('.IS') || meta.currency === 'TRY';

  return jsonResponse(
    {
      symbol: isBist ? yfSymbol.replace(/\.IS$/, '') : yfSymbol,
      yfSymbol,
      name: meta.longName || meta.shortName || yfSymbol,
      market: isBist ? 'BIST' : 'GLOBAL',
      currency: meta.currency === 'TRY' || isBist ? 'TRY' : 'USD',
      exchange: meta.exchangeName || (isBist ? 'BIST' : 'GLOBAL'),
      bars: trimmedBars,
      lastUpdated: trimmedBars[trimmedBars.length - 1].time,
    },
    200,
    300
  );
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/search') {
        return await handleSearch(url.searchParams.get('q'));
      }
      if (url.pathname === '/stock') {
        return await handleStock(url.searchParams.get('symbol'));
      }
      return jsonResponse({
        status: 'ok',
        service: 'AlphaDesk Market Proxy',
        endpoints: ['/search?q=THYAO', '/stock?symbol=THYAO.IS'],
      });
    } catch (err) {
      return jsonResponse(
        { error: err instanceof Error ? err.message : 'Sunucu hatası' },
        500,
        0
      );
    }
  },
};
