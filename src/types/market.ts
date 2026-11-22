export type MarketRegion = 'BIST' | 'GLOBAL';
export type CurrencyCode = 'TRY' | 'USD';
export type TimeframeKey = '1G' | '1H' | '1A' | '3A' | '6A' | '1Y';
export type DataSourceMode =
  | 'SEED'
  | 'PIPELINE_JSON'
  | 'CLOUDFLARE_WORKER'
  | 'LIVE_FINNHUB'
  | 'LIVE_ALPHAVANTAGE';

export interface OHLCVBar {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface QuarterlyFinancial {
  period: string; // e.g., "2026 Q3"
  revenue: number; // millions in stock currency
  grossProfit: number;
  ebitda: number;
  operatingIncome: number;
  netIncome: number;
  totalAssets: number;
  currentAssets: number;
  currentLiabilities: number;
  totalDebt: number;
  cashAndEquivalents: number;
  shareholdersEquity: number;
  retainedEarnings: number;
  operatingCashFlow: number;
  capex: number;
  sharesOutstanding: number; // millions
}

export interface SectorBenchmarks {
  sector: string;
  avgPE: number;
  avgPB: number;
  avgEvEbitda: number;
  avgNetMargin: number;
  avgROE: number;
}

export interface CatalystNews {
  id: string;
  date: string;
  source: 'KAP' | 'REUTERS' | 'BLOOMBERG' | 'SEC';
  title: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

export interface StockAsset {
  symbol: string;
  name: string;
  market: MarketRegion;
  currency: CurrencyCode;
  sector: string;
  beta: number;
  dividendYield: number; // %
  expectedGrowthRate: number; // 5Y %
  description: string;
  bars: OHLCVBar[];
  quarters: QuarterlyFinancial[]; // oldest -> newest (8 quarters)
  benchmarks: SectorBenchmarks;
  news: CatalystNews[];
  dataSource: DataSourceMode;
  lastUpdated: string;
}

export interface MacroTicker {
  symbol: string;
  label: string;
  price: number;
  changePct: number;
  prefix?: string;
}

// --- Technical Indicator Contracts ---

export interface BollingerPoint {
  time: string;
  upper: number | null;
  middle: number | null;
  lower: number | null;
  bandwidth: number | null;
}

export interface MACDPoint {
  time: string;
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export interface StochasticPoint {
  time: string;
  k: number | null;
  d: number | null;
}

export interface PivotPoints {
  p: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface FibonacciLevel {
  ratio: number;
  label: string;
  price: number;
}

export interface FibonacciRetracement {
  high: number;
  low: number;
  trend: 'UP' | 'DOWN';
  levels: FibonacciLevel[];
}

export interface SRLevel {
  price: number;
  type: 'SUPPORT' | 'RESISTANCE';
  touches: number;
  strength: 'STRONG' | 'MODERATE';
}

export type ConsensusRating = 'Güçlü Sat' | 'Sat' | 'Nötr' | 'Al' | 'Güçlü Al';

export interface IndicatorSignalItem {
  name: string;
  value: string;
  action: 'BUY' | 'SELL' | 'NEUTRAL';
  weight: number;
}

export interface PatternTag {
  label: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  detail: string;
}

export interface TechnicalSnapshot {
  ema9: (number | null)[];
  ema21: (number | null)[];
  ema50: (number | null)[];
  ema200: (number | null)[];
  sma20: (number | null)[];
  vwap: (number | null)[];
  bollinger: BollingerPoint[];
  rsi14: (number | null)[];
  macd: MACDPoint[];
  atr14: (number | null)[];
  stochastic: StochasticPoint[];
  pivots: PivotPoints;
  fibonacci: FibonacciRetracement;
  supportResistance: SRLevel[];
  consensusScore: number; // 0-100
  rating: ConsensusRating;
  signals: IndicatorSignalItem[];
  patterns: PatternTag[];
}

// --- Fundamental & Valuation Contracts (Faz 2) ---

export interface PiotroskiCriterion {
  id: number;
  category: 'Kârlılık' | 'Kaldıraç & Likidite' | 'Operasyonel Verimlilik';
  label: string;
  passed: boolean;
  detail: string;
}

export interface PiotroskiResult {
  score: number; // 0-9
  grade: 'Güçlü' | 'Orta' | 'Zayıf';
  criteria: PiotroskiCriterion[];
}

export interface AltmanZResult {
  score: number;
  zone: 'Güvenli Bölge' | 'Gri Bölge' | 'Riskli Bölge';
  components: {
    x1: number;
    x2: number;
    x3: number;
    x4: number;
    x5: number;
  };
}

export interface FundamentalMetrics {
  marketCap: number;
  enterpriseValue: number;
  pe: number | null;
  pb: number | null;
  evEbitda: number | null;
  peg: number | null;
  roe: number;
  roa: number;
  grossMargin: number;
  ebitdaMargin: number;
  netMargin: number;
  currentRatio: number;
  netDebtToEbitda: number;
  fcfTTM: number;
  revenueGrowthYoY: number;
  netIncomeGrowthYoY: number;
  piotroski: PiotroskiResult;
  altmanZ: AltmanZResult;
}

export interface DcfInput {
  growthRatePct: number;
  waccPct: number;
  terminalGrowthPct: number;
  projectionYears: number;
}

export interface DcfResult {
  intrinsicValuePerShare: number;
  currentPrice: number;
  marginOfSafetyPct: number;
  upsidePct: number;
  projectedCashFlows: { year: number; fcf: number; discountedFcf: number }[];
  terminalValuePv: number;
  equityValue: number;
}

// --- Forecast Contracts (Faz 2) ---

export interface DailyForecast {
  expectedLow: number;
  expectedHigh: number;
  expectedClose: number;
  atr14: number;
  atrPct: number;
  bullishProbabilityPct: number;
  pivots: PivotPoints;
  momentumBias: 'Yükseliş' | 'Düşüş' | 'Yatay';
  methodology: string;
}

export interface ShortTermForecast {
  horizonDays: number;
  holtTarget: number;
  regressionTarget: number;
  meanReversionTarget: number;
  compositeTarget: number;
  expectedChangePct: number;
  lowerBound: number;
  upperBound: number;
  rSquared: number;
  methodology: string;
}

export interface MonteCarloConePoint {
  month: number;
  label: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface LongTermForecast {
  simulations: number;
  annualizedDriftPct: number;
  annualizedVolatilityPct: number;
  cone: MonteCarloConePoint[];
  bearTarget12M: number;
  baseTarget12M: number;
  bullTarget12M: number;
  dcfBlendedLow: number;
  dcfBlendedHigh: number;
  methodology: string;
}

export interface MultiHorizonForecastResult {
  daily: DailyForecast;
  shortTerm: ShortTermForecast;
  longTerm: LongTermForecast;
  disclaimer: string;
}

// --- Backtest & Portfolio Contracts (Faz 2) ---

export type StrategyType = 'EMA_CROSS_9_21' | 'RSI_MEAN_REVERSION';

export interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
}

export interface BacktestResult {
  strategy: StrategyType;
  totalReturnPct: number;
  buyAndHoldReturnPct: number;
  alphaPct: number;
  tradeCount: number;
  winRatePct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  equityCurve: { time: string; strategy: number; buyHold: number }[];
  trades: BacktestTrade[];
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  quantity: number;
  avgCost: number;
  addedAt: string;
}

export interface RemoteSearchItem {
  symbol: string;
  yfSymbol: string;
  name: string;
  exchange: string;
  market: MarketRegion;
  currency: CurrencyCode;
  sector?: string;
}

export interface ApiSettings {
  provider: 'NONE' | 'FINNHUB' | 'ALPHAVANTAGE';
  apiKey: string;
  workerUrl: string;
}