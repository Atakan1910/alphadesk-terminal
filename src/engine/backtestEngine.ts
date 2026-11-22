import type {
  BacktestResult,
  BacktestTrade,
  OHLCVBar,
  PortfolioPosition,
  StockAsset,
  StrategyType,
} from '../types/market';
import { calculateEMA, calculateRSI } from './technicalIndicators';

function round(val: number, digits = 2): number {
  if (!Number.isFinite(val)) return 0;
  const f = Math.pow(10, digits);
  return Math.round(val * f) / f;
}

export interface PortfolioPositionSummary {
  position: PortfolioPosition;
  asset: StockAsset;
  currentPrice: number;
  costBasis: number;
  marketValue: number;
  pnl: number;
  pnlPct: number;
  marketValueTry: number;
  weightPct: number;
}

export interface SectorAllocationItem {
  sector: string;
  valueTry: number;
  weightPct: number;
}

export interface PortfolioRiskSummary {
  totalCostTry: number;
  totalValueTry: number;
  totalPnlTry: number;
  totalPnlPct: number;
  weightedBeta: number;
  sharpeRatio: number;
  annualizedVolPct: number;
  var95DailyPct: number;
  var95DailyTry: number;
  usdTryRate: number;
  positions: PortfolioPositionSummary[];
  sectorAllocation: SectorAllocationItem[];
}

export function runStrategyBacktest(
  bars: OHLCVBar[],
  strategy: StrategyType
): BacktestResult {
  if (bars.length < 40) {
    return {
      strategy,
      totalReturnPct: 0,
      buyAndHoldReturnPct: 0,
      alphaPct: 0,
      tradeCount: 0,
      winRatePct: 0,
      maxDrawdownPct: 0,
      sharpeRatio: 0,
      equityCurve: [],
      trades: [],
    };
  }

  const closes = bars.map((b) => b.close);
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const rsi14 = calculateRSI(bars, 14);

  // Evaluate over last 252 trading sessions (1Y) after indicator warm-up
  const startIdx = Math.max(25, bars.length - 252);
  const initialPrice = bars[startIdx].close;

  let cash = 100;
  let shares = 0;
  let inPosition = false;
  let entryPrice = 0;
  let entryDate = '';

  const trades: BacktestTrade[] = [];
  const equityCurve: { time: string; strategy: number; buyHold: number }[] = [];
  const dailyEquityReturns: number[] = [];

  let prevEquity = 100;
  let peakEquity = 100;
  let maxDrawdown = 0;

  for (let i = startIdx; i < bars.length; i++) {
    const bar = bars[i];
    const price = bar.close;

    let buySignal = false;
    let sellSignal = false;

    if (strategy === 'EMA_CROSS_9_21') {
      const c9 = ema9[i];
      const c21 = ema21[i];
      const p9 = ema9[i - 1];
      const p21 = ema21[i - 1];
      if (c9 !== null && c21 !== null && p9 !== null && p21 !== null) {
        if (!inPosition && p9 <= p21 && c9 > c21) {
          buySignal = true;
        } else if (inPosition && p9 >= p21 && c9 < c21) {
          sellSignal = true;
        }
      }
    } else if (strategy === 'RSI_MEAN_REVERSION') {
      const r = rsi14[i];
      if (r !== null) {
        if (!inPosition && r < 30) {
          buySignal = true;
        } else if (inPosition && r > 70) {
          sellSignal = true;
        }
      }
    }

    if (buySignal && !inPosition && price > 0) {
      shares = cash / price;
      cash = 0;
      inPosition = true;
      entryPrice = price;
      entryDate = bar.time;
    } else if (sellSignal && inPosition) {
      cash = shares * price;
      shares = 0;
      inPosition = false;
      const retPct = entryPrice > 0 ? ((price - entryPrice) / entryPrice) * 100 : 0;
      trades.push({
        entryDate,
        exitDate: bar.time,
        entryPrice: round(entryPrice, 2),
        exitPrice: round(price, 2),
        returnPct: round(retPct, 2),
      });
    }

    const currentEquity = inPosition ? shares * price : cash;
    const buyHoldEquity = initialPrice > 0 ? (price / initialPrice) * 100 : 100;

    if (i > startIdx && prevEquity > 0) {
      dailyEquityReturns.push((currentEquity - prevEquity) / prevEquity);
    }
    prevEquity = currentEquity;

    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }
    const dd = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }

    equityCurve.push({
      time: bar.time,
      strategy: round(currentEquity, 2),
      buyHold: round(buyHoldEquity, 2),
    });
  }

  // Mark-to-market open trade at end of window for trade stats
  if (inPosition) {
    const lastBar = bars[bars.length - 1];
    const retPct = entryPrice > 0 ? ((lastBar.close - entryPrice) / entryPrice) * 100 : 0;
    trades.push({
      entryDate,
      exitDate: `${lastBar.time} (Açık)`,
      entryPrice: round(entryPrice, 2),
      exitPrice: round(lastBar.close, 2),
      returnPct: round(retPct, 2),
    });
  }

  const finalEquity = equityCurve[equityCurve.length - 1]?.strategy ?? 100;
  const finalBuyHold = equityCurve[equityCurve.length - 1]?.buyHold ?? 100;

  const totalReturnPct = round(finalEquity - 100, 2);
  const buyAndHoldReturnPct = round(finalBuyHold - 100, 2);
  const alphaPct = round(totalReturnPct - buyAndHoldReturnPct, 2);

  const wins = trades.filter((t) => t.returnPct > 0).length;
  const winRatePct = trades.length > 0 ? round((wins / trades.length) * 100, 1) : 0;

  // Annualized Sharpe Ratio (assuming 0% benchmark excess floor on normalized daily curve)
  const nRet = dailyEquityReturns.length;
  const meanDaily =
    nRet > 0 ? dailyEquityReturns.reduce((a, b) => a + b, 0) / nRet : 0;
  const variance =
    nRet > 1
      ? dailyEquityReturns.reduce((a, r) => a + (r - meanDaily) * (r - meanDaily), 0) / (nRet - 1)
      : 0;
  const stdDaily = Math.sqrt(variance);
  const sharpeRatio = stdDaily > 1e-7 ? round((meanDaily / stdDaily) * Math.sqrt(252), 2) : 0;

  return {
    strategy,
    totalReturnPct,
    buyAndHoldReturnPct,
    alphaPct,
    tradeCount: trades.length,
    winRatePct,
    maxDrawdownPct: round(maxDrawdown, 2),
    sharpeRatio,
    equityCurve,
    trades,
  };
}

export function computePortfolioRisk(
  positions: PortfolioPosition[],
  assets: StockAsset[],
  usdTryRate = 36.42
): PortfolioRiskSummary {
  const assetMap = new Map<string, StockAsset>(assets.map((a) => [a.symbol, a]));

  const validRows = positions
    .map((pos) => {
      const asset = assetMap.get(pos.symbol);
      if (!asset || pos.quantity <= 0) return null;
      const currentPrice = asset.bars[asset.bars.length - 1]?.close ?? 0;
      const fx = asset.currency === 'USD' ? usdTryRate : 1;
      const costBasis = pos.quantity * pos.avgCost;
      const marketValue = pos.quantity * currentPrice;
      const pnl = marketValue - costBasis;
      const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      return {
        position: pos,
        asset,
        currentPrice: round(currentPrice, 2),
        costBasis: round(costBasis, 2),
        marketValue: round(marketValue, 2),
        pnl: round(pnl, 2),
        pnlPct: round(pnlPct, 2),
        costTry: costBasis * fx,
        marketValueTry: marketValue * fx,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (validRows.length === 0) {
    return {
      totalCostTry: 0,
      totalValueTry: 0,
      totalPnlTry: 0,
      totalPnlPct: 0,
      weightedBeta: 0,
      sharpeRatio: 0,
      annualizedVolPct: 0,
      var95DailyPct: 0,
      var95DailyTry: 0,
      usdTryRate,
      positions: [],
      sectorAllocation: [],
    };
  }

  const totalCostTry = validRows.reduce((acc, r) => acc + r.costTry, 0);
  const totalValueTry = validRows.reduce((acc, r) => acc + r.marketValueTry, 0);
  const totalPnlTry = totalValueTry - totalCostTry;
  const totalPnlPct = totalCostTry > 0 ? (totalPnlTry / totalCostTry) * 100 : 0;

  const positionSummaries: PortfolioPositionSummary[] = validRows.map((r) => ({
    position: r.position,
    asset: r.asset,
    currentPrice: r.currentPrice,
    costBasis: r.costBasis,
    marketValue: r.marketValue,
    pnl: r.pnl,
    pnlPct: r.pnlPct,
    marketValueTry: round(r.marketValueTry, 2),
    weightPct: totalValueTry > 0 ? round((r.marketValueTry / totalValueTry) * 100, 1) : 0,
  }));

  const weightedBeta = positionSummaries.reduce(
    (acc, item) => acc + item.asset.beta * (item.weightPct / 100),
    0
  );

  // Sector breakdown
  const sectorMap = new Map<string, number>();
  for (const item of positionSummaries) {
    sectorMap.set(
      item.asset.sector,
      (sectorMap.get(item.asset.sector) ?? 0) + item.marketValueTry
    );
  }
  const sectorAllocation: SectorAllocationItem[] = Array.from(sectorMap.entries())
    .map(([sector, valueTry]) => ({
      sector,
      valueTry: round(valueTry, 2),
      weightPct: totalValueTry > 0 ? round((valueTry / totalValueTry) * 100, 1) : 0,
    }))
    .sort((a, b) => b.weightPct - a.weightPct);

  // Aligned portfolio daily return series over common trailing sessions (up to 180 days)
  const minBars = Math.min(...positionSummaries.map((p) => p.asset.bars.length));
  const lookback = Math.min(180, Math.max(0, minBars - 1));
  const portfolioDailyReturns: number[] = [];

  for (let offset = lookback; offset >= 1; offset--) {
    let dayReturn = 0;
    for (const item of positionSummaries) {
      const bars = item.asset.bars;
      const idx = bars.length - offset;
      const prev = bars[idx - 1]?.close ?? 0;
      const curr = bars[idx]?.close ?? 0;
      if (prev > 0) {
        dayReturn += ((curr - prev) / prev) * (item.weightPct / 100);
      }
    }
    portfolioDailyReturns.push(dayReturn);
  }

  const n = portfolioDailyReturns.length;
  const meanDaily = n > 0 ? portfolioDailyReturns.reduce((a, b) => a + b, 0) / n : 0;
  const varianceDaily =
    n > 1
      ? portfolioDailyReturns.reduce((a, r) => a + (r - meanDaily) * (r - meanDaily), 0) / (n - 1)
      : 0;
  const stdDaily = Math.sqrt(varianceDaily);
  const annualizedVolPct = round(stdDaily * Math.sqrt(252) * 100, 2);

  // Risk-free rate approximation blended by currency exposure
  const bistWeight = positionSummaries
    .filter((p) => p.asset.currency === 'TRY')
    .reduce((acc, p) => acc + p.weightPct / 100, 0);
  const annualRf = bistWeight * 0.14 + (1 - bistWeight) * 0.042;
  const annualizedRet = meanDaily * 252;
  const sharpeRatio =
    annualizedVolPct > 0.01 ? round((annualizedRet - annualRf) / (annualizedVolPct / 100), 2) : 0;

  // 95% 1-Day Value at Risk (blended Historical 5th percentile & Parametric 1.645σ)
  const sortedRets = [...portfolioDailyReturns].sort((a, b) => a - b);
  const histIdx = Math.max(0, Math.floor(sortedRets.length * 0.05));
  const histVarPct = sortedRets.length > 0 ? Math.abs(Math.min(0, sortedRets[histIdx])) : 0;
  const paramVarPct = Math.max(0, 1.645 * stdDaily - meanDaily);
  const var95Ratio = (histVarPct + paramVarPct) / 2;

  return {
    totalCostTry: round(totalCostTry, 2),
    totalValueTry: round(totalValueTry, 2),
    totalPnlTry: round(totalPnlTry, 2),
    totalPnlPct: round(totalPnlPct, 2),
    weightedBeta: round(weightedBeta, 2),
    sharpeRatio,
    annualizedVolPct,
    var95DailyPct: round(var95Ratio * 100, 2),
    var95DailyTry: round(totalValueTry * var95Ratio, 2),
    usdTryRate: round(usdTryRate, 2),
    positions: positionSummaries,
    sectorAllocation,
  };
}
