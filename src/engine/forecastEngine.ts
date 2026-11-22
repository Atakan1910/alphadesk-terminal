import type {
  DailyForecast,
  LongTermForecast,
  MonteCarloConePoint,
  MultiHorizonForecastResult,
  OHLCVBar,
  ShortTermForecast,
  StockAsset,
  TechnicalSnapshot,
} from '../types/market';

function round(val: number, digits = 2): number {
  if (!Number.isFinite(val)) return 0;
  const f = Math.pow(10, digits);
  return Math.round(val * f) / f;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

// Deterministic FNV-1a hash + Mulberry32 PRNG (no Math.random)
function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function createPRNG(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nextGaussian(rng: () => number): number {
  const u1 = Math.max(1e-7, rng());
  const u2 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = clamp(p, 0, 1) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const weight = idx - lo;
  return sorted[lo] * (1 - weight) + sorted[hi] * weight;
}

function computeDailyForecast(
  bars: OHLCVBar[],
  technical: TechnicalSnapshot
): DailyForecast {
  const lastIdx = bars.length - 1;
  const lastBar = bars[lastIdx];
  const price = lastBar?.close ?? 0;

  const atrRaw = technical.atr14[lastIdx];
  const atr14 = atrRaw !== null && atrRaw > 0 ? atrRaw : price * 0.02;
  const atrPct = price > 0 ? (atr14 / price) * 100 : 0;

  // Volume-price momentum factors
  const prev5Close = bars[Math.max(0, lastIdx - 5)]?.close ?? price;
  const ret5d = prev5Close > 0 ? (price - prev5Close) / prev5Close : 0;

  const avgVol20 =
    bars.length >= 20
      ? bars.slice(-20).reduce((acc, b) => acc + b.volume, 0) / 20
      : lastBar?.volume ?? 1;
  const relVolume = avgVol20 > 0 ? (lastBar?.volume ?? 1) / avgVol20 : 1;

  const rsi = technical.rsi14[lastIdx] ?? 50;
  const e9 = technical.ema9[lastIdx] ?? price;
  const e21 = technical.ema21[lastIdx] ?? price;
  const emaSpread = e21 > 0 ? (e9 - e21) / e21 : 0;

  // Score components mapped smoothly to directional probability [24%, 76%]
  let zScore = 0;
  zScore += clamp(emaSpread * 28, -1.2, 1.2);
  zScore += clamp(ret5d * 10, -0.9, 0.9);
  zScore += (technical.consensusScore - 50) / 45;

  // Mean reversion penalty on extreme RSI
  if (rsi > 74) zScore -= (rsi - 74) * 0.06;
  if (rsi < 26) zScore += (26 - rsi) * 0.06;

  // Volume confirmation multiplier
  const candleDir = lastBar && lastBar.close >= lastBar.open ? 1 : -1;
  if (relVolume > 1.25) {
    zScore += candleDir * Math.min(0.45, (relVolume - 1.25) * 0.25);
  }

  // Logistic mapping to probability
  const logisticProb = 1 / (1 + Math.exp(-zScore));
  const bullishProbabilityPct = round(clamp(logisticProb * 100, 24, 76), 1);

  const directionalShift = ((bullishProbabilityPct - 50) / 50) * (atr14 * 0.35);
  const expectedClose = Math.max(0.01, price + directionalShift);
  const halfBand = atr14 * 0.85;
  const expectedLow = Math.max(0.01, expectedClose - halfBand);
  const expectedHigh = expectedClose + halfBand;

  const momentumBias: 'Yükseliş' | 'Düşüş' | 'Yatay' =
    bullishProbabilityPct >= 55 ? 'Yükseliş' : bullishProbabilityPct <= 45 ? 'Düşüş' : 'Yatay';

  return {
    expectedLow: round(expectedLow, 2),
    expectedHigh: round(expectedHigh, 2),
    expectedClose: round(expectedClose, 2),
    atr14: round(atr14, 2),
    atrPct: round(atrPct, 2),
    bullishProbabilityPct,
    pivots: technical.pivots,
    momentumBias,
    methodology:
      'Klasik kat pivotları (H+L+C)/3, Wilder ATR(14) 0.85x oynaklık zarfı, EMA 9/21 eğimi, 5G getiri ve 20G göreli hacim momentumunun lojistik olasılık dönüşümü.',
  };
}

// Damped Holt's Linear Trend (Double Exponential Smoothing)
function computeHoltForecast(closes: number[], horizon: number): number {
  const series = closes.slice(-Math.min(90, closes.length));
  if (series.length < 3) return series[series.length - 1] ?? 0;

  const alpha = 0.35;
  const beta = 0.12;
  const phi = 0.92; // damping factor to avoid runaway linear trend

  let level = series[0];
  let trend = (series[Math.min(5, series.length - 1)] - series[0]) / Math.min(5, series.length - 1);

  for (let i = 1; i < series.length; i++) {
    const prevLevel = level;
    const prevTrend = trend;
    level = alpha * series[i] + (1 - alpha) * (prevLevel + phi * prevTrend);
    trend = beta * (level - prevLevel) + (1 - beta) * phi * prevTrend;
  }

  let phiSum = 0;
  let phiPow = phi;
  for (let h = 1; h <= horizon; h++) {
    phiSum += phiPow;
    phiPow *= phi;
  }

  return Math.max(0.01, level + phiSum * trend);
}

// OLS Linear Regression on closing prices
function computeRegressionChannel(
  closes: number[],
  horizon: number
): { target: number; rSquared: number; residualStd: number } {
  const series = closes.slice(-Math.min(60, closes.length));
  const n = series.length;
  if (n < 5) {
    return { target: series[n - 1] ?? 0, rSquared: 0, residualStd: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += series[i];
    sumXY += i * series[i];
    sumXX += i * i;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;
  const denom = sumXX - n * meanX * meanX;
  const slope = Math.abs(denom) > 1e-9 ? (sumXY - n * meanX * meanY) / denom : 0;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const fitted = intercept + slope * i;
    const err = series[i] - fitted;
    ssRes += err * err;
    const diffY = series[i] - meanY;
    ssTot += diffY * diffY;
  }

  const rSquared = ssTot > 1e-9 ? clamp(1 - ssRes / ssTot, 0, 1) : 0;
  const residualStd = Math.sqrt(ssRes / Math.max(1, n - 2));
  const target = Math.max(0.01, intercept + slope * (n - 1 + horizon));

  return { target, rSquared, residualStd };
}

function computeShortTermForecast(bars: OHLCVBar[], horizonDays = 20): ShortTermForecast {
  const closes = bars.map((b) => b.close);
  const currentPrice = closes[closes.length - 1] ?? 0;

  const holtTarget = computeHoltForecast(closes, horizonDays);
  const reg = computeRegressionChannel(closes, horizonDays);

  // Mean reversion anchor (50-day SMA equilibrium with exponential decay)
  const sma50Slice = closes.slice(-Math.min(50, closes.length));
  const mean50 =
    sma50Slice.reduce((acc, v) => acc + v, 0) / Math.max(1, sma50Slice.length);
  const halfLife = 25;
  const reversionWeight = 1 - Math.exp((-Math.LN2 * horizonDays) / halfLife);
  const meanReversionTarget = Math.max(
    0.01,
    currentPrice + reversionWeight * (mean50 - currentPrice)
  );

  // Adaptive weights: higher R² gives more weight to regression trend
  const regWeight = 0.25 + reg.rSquared * 0.2;
  const holtWeight = 0.4;
  const mrWeight = Math.max(0.15, 1 - regWeight - holtWeight);
  const totalW = holtWeight + regWeight + mrWeight;

  const compositeTarget =
    (holtTarget * holtWeight + reg.target * regWeight + meanReversionTarget * mrWeight) / totalW;

  // Realized daily volatility over last 60 sessions for 80% confidence interval
  const logRets: number[] = [];
  const startIdx = Math.max(1, closes.length - 60);
  for (let i = startIdx; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) {
      logRets.push(Math.log(closes[i] / closes[i - 1]));
    }
  }
  const meanRet =
    logRets.reduce((a, b) => a + b, 0) / Math.max(1, logRets.length);
  const varianceRet =
    logRets.reduce((a, r) => a + (r - meanRet) * (r - meanRet), 0) /
    Math.max(1, logRets.length - 1);
  const dailyVol = Math.sqrt(Math.max(1e-6, varianceRet));

  const horizonSigma = currentPrice * dailyVol * Math.sqrt(horizonDays);
  const bandRadius = Math.max(horizonSigma * 1.28, reg.residualStd * 1.4);

  const lowerBound = Math.max(0.01, compositeTarget - bandRadius);
  const upperBound = compositeTarget + bandRadius;
  const expectedChangePct =
    currentPrice > 0 ? ((compositeTarget - currentPrice) / currentPrice) * 100 : 0;

  return {
    horizonDays,
    holtTarget: round(holtTarget, 2),
    regressionTarget: round(reg.target, 2),
    meanReversionTarget: round(meanReversionTarget, 2),
    compositeTarget: round(compositeTarget, 2),
    expectedChangePct: round(expectedChangePct, 2),
    lowerBound: round(lowerBound, 2),
    upperBound: round(upperBound, 2),
    rSquared: round(reg.rSquared, 3),
    methodology:
      "Sönümlenmiş Holt Çift Üstel Düzeltme (α=0.35, β=0.12, φ=0.92), 60G OLS Lineer Regresyon Kanalı ve 50G Ortalamaya Dönüş (Mean Reversion) ağırlıklı bileşik projeksiyonu (%80 güven aralığı).",
  };
}

function computeLongTermMonteCarlo(
  asset: StockAsset,
  dcfIntrinsic?: number
): LongTermForecast {
  const bars = asset.bars;
  const closes = bars.map((b) => b.close);
  const currentPrice = closes[closes.length - 1] ?? 0;
  const lastDate = bars[bars.length - 1]?.time ?? '2026-01-01';

  // Historical daily log-returns over up to 252 sessions (1 trading year)
  const lookback = closes.slice(-Math.min(252, closes.length));
  const logReturns: number[] = [];
  for (let i = 1; i < lookback.length; i++) {
    if (lookback[i - 1] > 0 && lookback[i] > 0) {
      logReturns.push(Math.log(lookback[i] / lookback[i - 1]));
    }
  }

  const n = Math.max(1, logReturns.length);
  const meanDailyLog = logReturns.reduce((a, b) => a + b, 0) / n;
  const varianceDaily =
    logReturns.reduce((a, r) => a + (r - meanDailyLog) * (r - meanDailyLog), 0) /
    Math.max(1, n - 1);

  const annualizedVol = clamp(Math.sqrt(Math.max(1e-6, varianceDaily) * 252), 0.14, 0.9);
  const rawAnnualDrift = (meanDailyLog + 0.5 * varianceDaily) * 252;

  // Bayesian / James-Stein shrinkage toward fundamental expected growth to prevent outlier blowups
  const fundamentalPrior = clamp(asset.expectedGrowthRate / 100, 0.04, 0.28);
  const annualizedDrift = clamp(rawAnnualDrift * 0.55 + fundamentalPrior * 0.45, -0.25, 0.42);

  const simulations = 500;
  const months = 12;
  const dt = 1 / 12;
  const driftStep = (annualizedDrift - 0.5 * annualizedVol * annualizedVol) * dt;
  const volStep = annualizedVol * Math.sqrt(dt);

  const seed = hashString(`MC_GBM_${asset.symbol}_${lastDate}_${currentPrice.toFixed(2)}`);
  const rng = createPRNG(seed);

  // Store values per month across all 500 paths
  const monthBuckets: number[][] = Array.from({ length: months + 1 }, () => []);

  for (let sim = 0; sim < simulations; sim++) {
    let price = currentPrice;
    monthBuckets[0].push(price);
    for (let m = 1; m <= months; m++) {
      const z = nextGaussian(rng);
      price = Math.max(0.01, price * Math.exp(driftStep + volStep * z));
      monthBuckets[m].push(price);
    }
  }

  const cone: MonteCarloConePoint[] = monthBuckets.map((bucket, m) => {
    const sorted = [...bucket].sort((a, b) => a - b);
    return {
      month: m,
      label: m === 0 ? 'Bugün' : `${m}A`,
      p10: round(percentile(sorted, 0.1), 2),
      p25: round(percentile(sorted, 0.25), 2),
      p50: round(percentile(sorted, 0.5), 2),
      p75: round(percentile(sorted, 0.75), 2),
      p90: round(percentile(sorted, 0.9), 2),
    };
  });

  const finalPoint = cone[cone.length - 1];
  const hasValidDcf = typeof dcfIntrinsic === 'number' && Number.isFinite(dcfIntrinsic) && dcfIntrinsic > 0;

  // Synthesize 12M target range blending Monte Carlo interquartile band with DCF intrinsic value
  const dcfBlendedLow = hasValidDcf
    ? round(finalPoint.p25 * 0.65 + dcfIntrinsic * 0.35, 2)
    : finalPoint.p25;
  const dcfBlendedHigh = hasValidDcf
    ? round(finalPoint.p75 * 0.65 + dcfIntrinsic * 0.35, 2)
    : finalPoint.p75;

  return {
    simulations,
    annualizedDriftPct: round(annualizedDrift * 100, 2),
    annualizedVolatilityPct: round(annualizedVol * 100, 2),
    cone,
    bearTarget12M: finalPoint.p10,
    baseTarget12M: finalPoint.p50,
    bullTarget12M: finalPoint.p90,
    dcfBlendedLow: Math.min(dcfBlendedLow, dcfBlendedHigh),
    dcfBlendedHigh: Math.max(dcfBlendedLow, dcfBlendedHigh),
    methodology:
      'Son 252 işlem günü log-getiri dağılımı ve Bayesian drift sönümlemesi ile tarayıcı içi 500 yürüyüşlü Geometrik Brownian Hareketi (GBM) Monte Carlo simülasyonu (%10 / %50 / %90 yüzdelik dilimleri + DCF sentezi).',
  };
}

export function computeMultiHorizonForecast(
  asset: StockAsset,
  technical: TechnicalSnapshot,
  dcfIntrinsic?: number
): MultiHorizonForecastResult {
  const daily = computeDailyForecast(asset.bars, technical);
  const shortTerm = computeShortTermForecast(asset.bars, 20);
  const longTerm = computeLongTermMonteCarlo(asset, dcfIntrinsic);

  return {
    daily,
    shortTerm,
    longTerm,
    disclaimer:
      'İstatistiksel simülasyondur, yatırım tavsiyesi değildir (YTD). Tüm projeksiyonlar geçmiş OHLCV dağılımı ve varsayılan finansal parametrelere dayanır.',
  };
}
