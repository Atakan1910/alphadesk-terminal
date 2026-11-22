import type {
  BollingerPoint,
  ConsensusRating,
  FibonacciRetracement,
  IndicatorSignalItem,
  MACDPoint,
  OHLCVBar,
  PatternTag,
  PivotPoints,
  SRLevel,
  StochasticPoint,
  TechnicalSnapshot,
} from '../types/market';

function round(val: number, digits = 2): number {
  const f = Math.pow(10, digits);
  return Math.round(val * f) / f;
}

export function calculateSMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return result;

  let windowSum = 0;
  for (let i = 0; i < values.length; i++) {
    windowSum += values[i];
    if (i >= period) {
      windowSum -= values[i - period];
    }
    if (i >= period - 1) {
      result[i] = round(windowSum / period, 4);
    }
  }
  return result;
}

export function calculateEMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let prevEma = sum / period;
  result[period - 1] = round(prevEma, 4);

  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    prevEma = values[i] * k + prevEma * (1 - k);
    result[i] = round(prevEma, 4);
  }
  return result;
}

export function calculateBollingerBands(
  bars: OHLCVBar[],
  period = 20,
  multiplier = 2
): BollingerPoint[] {
  const closes = bars.map((b) => b.close);
  const sma = calculateSMA(closes, period);

  return bars.map((bar, i) => {
    const mid = sma[i];
    if (mid === null || i < period - 1) {
      return { time: bar.time, upper: null, middle: null, lower: null, bandwidth: null };
    }
    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = closes[j] - mid;
      varianceSum += diff * diff;
    }
    const stdDev = Math.sqrt(varianceSum / period);
    const upper = mid + multiplier * stdDev;
    const lower = mid - multiplier * stdDev;
    const bandwidth = mid > 0 ? ((upper - lower) / mid) * 100 : 0;

    return {
      time: bar.time,
      upper: round(upper, 2),
      middle: round(mid, 2),
      lower: round(lower, 2),
      bandwidth: round(bandwidth, 3),
    };
  });
}

// Rolling anchored VWAP (default 20-session window for daily bars)
export function calculateVWAP(bars: OHLCVBar[], window = 20): (number | null)[] {
  const result: (number | null)[] = new Array(bars.length).fill(null);
  for (let i = 0; i < bars.length; i++) {
    const start = Math.max(0, i - window + 1);
    let pvSum = 0;
    let vSum = 0;
    for (let j = start; j <= i; j++) {
      const typicalPrice = (bars[j].high + bars[j].low + bars[j].close) / 3;
      pvSum += typicalPrice * bars[j].volume;
      vSum += bars[j].volume;
    }
    result[i] = vSum > 0 ? round(pvSum / vSum, 2) : null;
  }
  return result;
}

// Wilder's Smoothed RSI (14)
export function calculateRSI(bars: OHLCVBar[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(bars.length).fill(null);
  if (bars.length <= period) return result;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const change = bars[i].close - bars[i - 1].close;
    if (change > 0) gainSum += change;
    else lossSum += Math.abs(change);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  result[period] = avgLoss === 0 ? 100 : round(100 - 100 / (1 + avgGain / avgLoss), 2);

  for (let i = period + 1; i < bars.length; i++) {
    const change = bars[i].close - bars[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    result[i] = avgLoss === 0 ? 100 : round(100 - 100 / (1 + avgGain / avgLoss), 2);
  }

  return result;
}

export function calculateMACD(
  bars: OHLCVBar[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDPoint[] {
  const closes = bars.map((b) => b.close);
  const fastEma = calculateEMA(closes, fastPeriod);
  const slowEma = calculateEMA(closes, slowPeriod);

  const rawMacd: (number | null)[] = bars.map((_, i) => {
    const f = fastEma[i];
    const s = slowEma[i];
    return f !== null && s !== null ? f - s : null;
  });

  const validValues: number[] = [];
  const validIndices: number[] = [];
  rawMacd.forEach((v, idx) => {
    if (v !== null) {
      validValues.push(v);
      validIndices.push(idx);
    }
  });

  const signalCompressed = calculateEMA(validValues, signalPeriod);
  const signalFull: (number | null)[] = new Array(bars.length).fill(null);
  validIndices.forEach((origIdx, compressedIdx) => {
    signalFull[origIdx] = signalCompressed[compressedIdx];
  });

  return bars.map((bar, i) => {
    const m = rawMacd[i];
    const s = signalFull[i];
    const h = m !== null && s !== null ? m - s : null;
    return {
      time: bar.time,
      macd: m !== null ? round(m, 4) : null,
      signal: s !== null ? round(s, 4) : null,
      histogram: h !== null ? round(h, 4) : null,
    };
  });
}

// Wilder's Average True Range (14)
export function calculateATR(bars: OHLCVBar[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(bars.length).fill(null);
  if (bars.length < period) return result;

  const tr: number[] = bars.map((bar, i) => {
    if (i === 0) return bar.high - bar.low;
    const prevClose = bars[i - 1].close;
    return Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - prevClose),
      Math.abs(bar.low - prevClose)
    );
  });

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += tr[i];
  }
  let prevAtr = sum / period;
  result[period - 1] = round(prevAtr, 4);

  for (let i = period; i < bars.length; i++) {
    prevAtr = (prevAtr * (period - 1) + tr[i]) / period;
    result[i] = round(prevAtr, 4);
  }
  return result;
}

// Slow Stochastic Oscillator (14, 3, 3)
export function calculateStochastic(
  bars: OHLCVBar[],
  kPeriod = 14,
  smoothK = 3,
  dPeriod = 3
): StochasticPoint[] {
  const rawK: (number | null)[] = new Array(bars.length).fill(null);

  for (let i = kPeriod - 1; i < bars.length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (bars[j].high > highestHigh) highestHigh = bars[j].high;
      if (bars[j].low < lowestLow) lowestLow = bars[j].low;
    }
    const span = highestHigh - lowestLow;
    rawK[i] = span === 0 ? 50 : ((bars[i].close - lowestLow) / span) * 100;
  }

  const smoothSeries = (input: (number | null)[], period: number): (number | null)[] => {
    const out: (number | null)[] = new Array(input.length).fill(null);
    for (let i = 0; i < input.length; i++) {
      if (i < period - 1) continue;
      let sum = 0;
      let valid = true;
      for (let j = i - period + 1; j <= i; j++) {
        const val = input[j];
        if (val === null) {
          valid = false;
          break;
        }
        sum += val;
      }
      if (valid) out[i] = round(sum / period, 2);
    }
    return out;
  };

  const kLine = smoothSeries(rawK, smoothK);
  const dLine = smoothSeries(kLine, dPeriod);

  return bars.map((bar, i) => ({
    time: bar.time,
    k: kLine[i],
    d: dLine[i],
  }));
}

// Classic Floor Pivot Points from last completed session
export function calculatePivotPoints(bars: OHLCVBar[]): PivotPoints {
  if (bars.length === 0) {
    return { p: 0, r1: 0, r2: 0, r3: 0, s1: 0, s2: 0, s3: 0 };
  }
  const last = bars[bars.length - 1];
  const p = (last.high + last.low + last.close) / 3;
  const range = last.high - last.low;

  return {
    p: round(p, 2),
    r1: round(2 * p - last.low, 2),
    s1: round(2 * p - last.high, 2),
    r2: round(p + range, 2),
    s2: round(p - range, 2),
    r3: round(last.high + 2 * (p - last.low), 2),
    s3: round(last.low - 2 * (last.high - p), 2),
  };
}

export function calculateFibonacciRetracement(
  bars: OHLCVBar[],
  lookback = 90
): FibonacciRetracement {
  const slice = bars.slice(-Math.min(lookback, bars.length));
  if (slice.length === 0) {
    return { high: 0, low: 0, trend: 'UP', levels: [] };
  }

  let high = -Infinity;
  let low = Infinity;
  let highIdx = 0;
  let lowIdx = 0;

  slice.forEach((bar, i) => {
    if (bar.high > high) {
      high = bar.high;
      highIdx = i;
    }
    if (bar.low < low) {
      low = bar.low;
      lowIdx = i;
    }
  });

  const trend: 'UP' | 'DOWN' = lowIdx <= highIdx ? 'UP' : 'DOWN';
  const diff = high - low;
  const ratios = [
    { ratio: 0, label: '0.0%' },
    { ratio: 0.236, label: '23.6%' },
    { ratio: 0.382, label: '38.2%' },
    { ratio: 0.5, label: '50.0%' },
    { ratio: 0.618, label: '61.8%' },
    { ratio: 0.786, label: '78.6%' },
    { ratio: 1, label: '100.0%' },
  ];

  const levels = ratios.map((r) => ({
    ratio: r.ratio,
    label: r.label,
    price: round(trend === 'UP' ? high - diff * r.ratio : low + diff * r.ratio, 2),
  }));

  return {
    high: round(high, 2),
    low: round(low, 2),
    trend,
    levels,
  };
}

// Local Extrema Support & Resistance Clustering
export function detectSupportResistance(
  bars: OHLCVBar[],
  lookback = 140,
  pivotWindow = 5
): SRLevel[] {
  const slice = bars.slice(-Math.min(lookback, bars.length));
  if (slice.length < pivotWindow * 2 + 1) return [];

  const currentPrice = slice[slice.length - 1].close;
  const candidates: number[] = [];

  for (let i = pivotWindow; i < slice.length - pivotWindow; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;
    for (let j = i - pivotWindow; j <= i + pivotWindow; j++) {
      if (j === i) continue;
      if (slice[j].high > slice[i].high) isSwingHigh = false;
      if (slice[j].low < slice[i].low) isSwingLow = false;
    }
    if (isSwingHigh) candidates.push(slice[i].high);
    if (isSwingLow) candidates.push(slice[i].low);
  }

  candidates.sort((a, b) => a - b);

  const clusters: { sum: number; count: number }[] = [];
  const tolerancePct = 0.018;

  for (const level of candidates) {
    const existing = clusters.find((c) => {
      const avg = c.sum / c.count;
      return Math.abs(level - avg) / avg <= tolerancePct;
    });
    if (existing) {
      existing.sum += level;
      existing.count += 1;
    } else {
      clusters.push({ sum: level, count: 1 });
    }
  }

  const levels: SRLevel[] = clusters.map((c) => {
    const avgPrice = round(c.sum / c.count, 2);
    return {
      price: avgPrice,
      type: avgPrice >= currentPrice ? 'RESISTANCE' : 'SUPPORT',
      touches: c.count,
      strength: c.count >= 3 ? 'STRONG' : 'MODERATE',
    };
  });

  const supports = levels
    .filter((l) => l.type === 'SUPPORT')
    .sort((a, b) => b.touches - a.touches || b.price - a.price)
    .slice(0, 3)
    .sort((a, b) => b.price - a.price);

  const resistances = levels
    .filter((l) => l.type === 'RESISTANCE')
    .sort((a, b) => b.touches - a.touches || a.price - b.price)
    .slice(0, 3)
    .sort((a, b) => a.price - b.price);

  return [...resistances, ...supports];
}

function getRatingFromScore(score: number): ConsensusRating {
  if (score >= 78) return 'Güçlü Al';
  if (score >= 58) return 'Al';
  if (score > 42) return 'Nötr';
  if (score > 22) return 'Sat';
  return 'Güçlü Sat';
}

export function computeTechnicalSnapshot(bars: OHLCVBar[]): TechnicalSnapshot {
  const closes = bars.map((b) => b.close);
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const sma20 = calculateSMA(closes, 20);
  const vwap = calculateVWAP(bars, 20);
  const bollinger = calculateBollingerBands(bars, 20, 2);
  const rsi14 = calculateRSI(bars, 14);
  const macd = calculateMACD(bars, 12, 26, 9);
  const atr14 = calculateATR(bars, 14);
  const stochastic = calculateStochastic(bars, 14, 3, 3);
  const pivots = calculatePivotPoints(bars);
  const fibonacci = calculateFibonacciRetracement(bars, 90);
  const supportResistance = detectSupportResistance(bars, 140, 5);

  const last = bars.length - 1;
  const price = bars[last]?.close ?? 0;

  const signals: IndicatorSignalItem[] = [];

  const e9 = ema9[last];
  const e21 = ema21[last];
  if (e9 !== null && e21 !== null) {
    signals.push({
      name: 'EMA 9 / 21',
      value: `${round(e9, 2)} / ${round(e21, 2)}`,
      action: e9 > e21 * 1.002 ? 'BUY' : e9 < e21 * 0.998 ? 'SELL' : 'NEUTRAL',
      weight: 16,
    });
  }

  const e50 = ema50[last];
  if (e50 !== null) {
    signals.push({
      name: 'Fiyat vs EMA 50',
      value: `${round(((price - e50) / e50) * 100, 2)}%`,
      action: price > e50 * 1.005 ? 'BUY' : price < e50 * 0.995 ? 'SELL' : 'NEUTRAL',
      weight: 14,
    });
  }

  const e200 = ema200[last];
  if (e50 !== null && e200 !== null) {
    signals.push({
      name: 'EMA 50 / 200 Trend',
      value: `${round(e50, 2)} / ${round(e200, 2)}`,
      action: e50 > e200 ? 'BUY' : 'SELL',
      weight: 16,
    });
  }

  const r14 = rsi14[last];
  if (r14 !== null) {
    const action: 'BUY' | 'SELL' | 'NEUTRAL' =
      r14 <= 32 ? 'BUY' : r14 >= 70 ? 'SELL' : r14 > 54 ? 'BUY' : r14 < 46 ? 'SELL' : 'NEUTRAL';
    signals.push({
      name: 'RSI (14)',
      value: r14.toFixed(1),
      action,
      weight: 15,
    });
  }

  const lastMacd = macd[last];
  if (lastMacd && lastMacd.macd !== null && lastMacd.signal !== null) {
    signals.push({
      name: 'MACD (12,26,9)',
      value: lastMacd.macd.toFixed(2),
      action:
        lastMacd.macd > lastMacd.signal
          ? 'BUY'
          : lastMacd.macd < lastMacd.signal
            ? 'SELL'
            : 'NEUTRAL',
      weight: 14,
    });
  }

  const lastBb = bollinger[last];
  if (lastBb && lastBb.upper !== null && lastBb.lower !== null && lastBb.middle !== null) {
    const action: 'BUY' | 'SELL' | 'NEUTRAL' =
      price <= lastBb.lower
        ? 'BUY'
        : price >= lastBb.upper
          ? 'SELL'
          : price > lastBb.middle
            ? 'BUY'
            : 'SELL';
    signals.push({
      name: 'Bollinger (20,2)',
      value: `${lastBb.lower}–${lastBb.upper}`,
      action,
      weight: 9,
    });
  }

  const lastStoch = stochastic[last];
  if (lastStoch && lastStoch.k !== null && lastStoch.d !== null) {
    const action: 'BUY' | 'SELL' | 'NEUTRAL' =
      lastStoch.k < 25 && lastStoch.k > lastStoch.d
        ? 'BUY'
        : lastStoch.k > 75 && lastStoch.k < lastStoch.d
          ? 'SELL'
          : lastStoch.k > lastStoch.d
            ? 'BUY'
            : 'SELL';
    signals.push({
      name: 'Stochastic (14,3,3)',
      value: `${lastStoch.k.toFixed(1)} / ${lastStoch.d.toFixed(1)}`,
      action,
      weight: 8,
    });
  }

  const lastVwap = vwap[last];
  if (lastVwap !== null) {
    signals.push({
      name: 'VWAP (20G)',
      value: lastVwap.toFixed(2),
      action: price > lastVwap ? 'BUY' : price < lastVwap ? 'SELL' : 'NEUTRAL',
      weight: 8,
    });
  }

  const totalWeight = signals.reduce((acc, s) => acc + s.weight, 0);
  const weightedScore = signals.reduce((acc, s) => {
    const pts = s.action === 'BUY' ? 1 : s.action === 'NEUTRAL' ? 0.5 : 0;
    return acc + pts * s.weight;
  }, 0);

  const consensusScore = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 50;
  const rating = getRatingFromScore(consensusScore);

  const patterns: PatternTag[] = [];

  // 1. Golden Cross / Death Cross (last 20 sessions)
  for (let i = Math.max(201, last - 20); i <= last; i++) {
    const prev50 = ema50[i - 1];
    const prev200 = ema200[i - 1];
    const curr50 = ema50[i];
    const curr200 = ema200[i];
    if (prev50 !== null && prev200 !== null && curr50 !== null && curr200 !== null) {
      if (prev50 <= prev200 && curr50 > curr200) {
        patterns.push({
          label: 'Golden Cross',
          bias: 'BULLISH',
          detail: `EMA 50, EMA 200'ü ${bars[i].time} tarihinde yukarı kesti.`,
        });
        break;
      }
      if (prev50 >= prev200 && curr50 < curr200) {
        patterns.push({
          label: 'Death Cross',
          bias: 'BEARISH',
          detail: `EMA 50, EMA 200'ü ${bars[i].time} tarihinde aşağı kesti.`,
        });
        break;
      }
    }
  }

  // 2. Bollinger Squeeze (bottom 15% of 60-session bandwidth)
  const recentBw = bollinger
    .slice(-60)
    .map((b) => b.bandwidth)
    .filter((v): v is number => v !== null);
  const currBw = lastBb?.bandwidth ?? null;
  if (currBw !== null && recentBw.length >= 20) {
    const sortedBw = [...recentBw].sort((a, b) => a - b);
    const p15 = sortedBw[Math.floor(sortedBw.length * 0.15)];
    if (currBw <= p15) {
      patterns.push({
        label: 'Bollinger Sıkışması',
        bias: 'NEUTRAL',
        detail: `Bant genişliği (%${currBw.toFixed(1)}) son 60 günün en dar %15 diliminde; kırılım potansiyeli.`,
      });
    }
  }

  // 3. Volume Surge (> 1.75x 20-day average)
  if (bars.length >= 21) {
    const avgVol20 = bars.slice(-21, -1).reduce((acc, b) => acc + b.volume, 0) / 20;
    const latestVol = bars[last].volume;
    if (avgVol20 > 0 && latestVol / avgVol20 >= 1.75) {
      const upBar = bars[last].close >= bars[last].open;
      patterns.push({
        label: 'Hacim Patlaması',
        bias: upBar ? 'BULLISH' : 'BEARISH',
        detail: `Günlük hacim 20 günlük ortalamanın ${(latestVol / avgVol20).toFixed(2)}x katına çıktı.`,
      });
    }
  }

  // 4. RSI Positive / Negative Divergence (last 30 sessions)
  if (last >= 35) {
    const recentSlice = bars.slice(last - 30, last + 1);
    const recentRsi = rsi14.slice(last - 30, last + 1);
    const half = Math.floor(recentSlice.length / 2);

    let low1Idx = 0;
    let low2Idx = half;
    for (let i = 1; i < half; i++) {
      if (recentSlice[i].low < recentSlice[low1Idx].low) low1Idx = i;
    }
    for (let i = half + 1; i < recentSlice.length; i++) {
      if (recentSlice[i].low < recentSlice[low2Idx].low) low2Idx = i;
    }
    const rLow1 = recentRsi[low1Idx];
    const rLow2 = recentRsi[low2Idx];
    if (
      rLow1 !== null &&
      rLow2 !== null &&
      recentSlice[low2Idx].low < recentSlice[low1Idx].low * 0.992 &&
      rLow2 > rLow1 + 3.5
    ) {
      patterns.push({
        label: 'RSI Pozitif Uyumsuzluk',
        bias: 'BULLISH',
        detail: `Fiyat daha düşük dip yaparken RSI (${rLow1.toFixed(1)} → ${rLow2.toFixed(1)}) yükseldi.`,
      });
    }

    let high1Idx = 0;
    let high2Idx = half;
    for (let i = 1; i < half; i++) {
      if (recentSlice[i].high > recentSlice[high1Idx].high) high1Idx = i;
    }
    for (let i = half + 1; i < recentSlice.length; i++) {
      if (recentSlice[i].high > recentSlice[high2Idx].high) high2Idx = i;
    }
    const rHigh1 = recentRsi[high1Idx];
    const rHigh2 = recentRsi[high2Idx];
    if (
      rHigh1 !== null &&
      rHigh2 !== null &&
      recentSlice[high2Idx].high > recentSlice[high1Idx].high * 1.008 &&
      rHigh2 < rHigh1 - 3.5
    ) {
      patterns.push({
        label: 'RSI Negatif Uyumsuzluk',
        bias: 'BEARISH',
        detail: `Fiyat yeni zirve yaparken RSI (${rHigh1.toFixed(1)} → ${rHigh2.toFixed(1)}) zayıfladı.`,
      });
    }
  }

  // 5. MACD Crossover (last session)
  if (last >= 3) {
    const prevM = macd[last - 1];
    const currM = macd[last];
    if (
      prevM.macd !== null &&
      prevM.signal !== null &&
      currM.macd !== null &&
      currM.signal !== null
    ) {
      if (prevM.macd <= prevM.signal && currM.macd > currM.signal) {
        patterns.push({
          label: 'MACD Yukarı Kesişim',
          bias: 'BULLISH',
          detail: 'MACD çizgisi sinyal çizgisini yukarı yönde kesti.',
        });
      } else if (prevM.macd >= prevM.signal && currM.macd < currM.signal) {
        patterns.push({
          label: 'MACD Aşağı Kesişim',
          bias: 'BEARISH',
          detail: 'MACD çizgisi sinyal çizgisini aşağı yönde kesti.',
        });
      }
    }
  }

  return {
    ema9,
    ema21,
    ema50,
    ema200,
    sma20,
    vwap,
    bollinger,
    rsi14,
    macd,
    atr14,
    stochastic,
    pivots,
    fibonacci,
    supportResistance,
    consensusScore,
    rating,
    signals,
    patterns,
  };
}