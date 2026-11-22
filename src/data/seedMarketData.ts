import type {
  CatalystNews,
  CurrencyCode,
  MacroTicker,
  MarketRegion,
  OHLCVBar,
  QuarterlyFinancial,
  SectorBenchmarks,
  StockAsset,
} from '../types/market';

// Deterministic FNV-1a 32-bit hash
function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Deterministic Mulberry32 PRNG (no Math.random)
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

// Deterministic Box-Muller standard normal generator
function nextGaussian(rng: () => number): number {
  const u1 = Math.max(1e-7, rng());
  const u2 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface StockBlueprint {
  symbol: string;
  name: string;
  market: MarketRegion;
  currency: CurrencyCode;
  sector: string;
  startPrice: number;
  annualDrift: number;
  annualVol: number;
  avgDailyVolume: number;
  beta: number;
  dividendYield: number;
  expectedGrowthRate: number;
  description: string;
  baseQuarterlyRevenue: number; // millions
  revenueGrowthPerQ: number;
  grossMargin: number;
  ebitdaMargin: number;
  netMargin: number;
  sharesOutstanding: number; // millions
  assetTurnoverAnnual: number;
  debtToEquity: number;
  currentRatio: number;
  cashRatioOfAssets: number;
  capexRatioOfRev: number;
  benchmarks: SectorBenchmarks;
  news: CatalystNews[];
}

const SECTOR_BENCHMARKS: Record<string, SectorBenchmarks> = {
  Havacılık: { sector: 'Havacılık', avgPE: 6.8, avgPB: 0.95, avgEvEbitda: 5.2, avgNetMargin: 11.5, avgROE: 19.0 },
  Savunma: { sector: 'Savunma', avgPE: 21.5, avgPB: 3.1, avgEvEbitda: 14.5, avgNetMargin: 14.0, avgROE: 18.5 },
  Enerji: { sector: 'Enerji', avgPE: 7.4, avgPB: 1.5, avgEvEbitda: 4.8, avgNetMargin: 8.5, avgROE: 22.0 },
  Holding: { sector: 'Holding', avgPE: 6.5, avgPB: 1.05, avgEvEbitda: 5.5, avgNetMargin: 9.0, avgROE: 21.0 },
  Perakende: { sector: 'Perakende', avgPE: 16.5, avgPB: 4.2, avgEvEbitda: 9.2, avgNetMargin: 4.5, avgROE: 28.0 },
  Sanayi: { sector: 'Sanayi', avgPE: 11.2, avgPB: 1.4, avgEvEbitda: 7.1, avgNetMargin: 9.5, avgROE: 15.0 },
  Bankacılık: { sector: 'Bankacılık', avgPE: 5.2, avgPB: 1.25, avgEvEbitda: 4.5, avgNetMargin: 24.0, avgROE: 26.5 },
  Otomotiv: { sector: 'Otomotiv', avgPE: 9.8, avgPB: 3.4, avgEvEbitda: 7.4, avgNetMargin: 8.8, avgROE: 31.0 },
  Teknoloji: { sector: 'Teknoloji', avgPE: 31.0, avgPB: 11.5, avgEvEbitda: 22.0, avgNetMargin: 25.0, avgROE: 35.0 },
  Yarıİletken: { sector: 'Yarıİletken', avgPE: 38.0, avgPB: 16.0, avgEvEbitda: 27.5, avgNetMargin: 32.0, avgROE: 44.0 },
  'E-Ticaret': { sector: 'E-Ticaret', avgPE: 34.0, avgPB: 7.5, avgEvEbitda: 18.0, avgNetMargin: 9.5, avgROE: 22.0 },
};

const STOCK_BLUEPRINTS: StockBlueprint[] = [
  {
    symbol: 'THYAO',
    name: 'Türk Hava Yolları A.O.',
    market: 'BIST',
    currency: 'TRY',
    sector: 'Havacılık',
    startPrice: 284.5,
    annualDrift: 0.24,
    annualVol: 0.31,
    avgDailyVolume: 28500000,
    beta: 1.18,
    dividendYield: 2.1,
    expectedGrowthRate: 14.5,
    description: 'Küresel yolcu ve hava kargo taşımacılığı lideri bayrak taşıyıcı havayolu.',
    baseQuarterlyRevenue: 168000,
    revenueGrowthPerQ: 0.042,
    grossMargin: 0.245,
    ebitdaMargin: 0.225,
    netMargin: 0.142,
    sharesOutstanding: 1380,
    assetTurnoverAnnual: 0.68,
    debtToEquity: 0.85,
    currentRatio: 1.18,
    cashRatioOfAssets: 0.17,
    capexRatioOfRev: 0.11,
    benchmarks: SECTOR_BENCHMARKS['Havacılık'],
    news: [
      { id: 'thyao-1', date: '2026-11-18', source: 'KAP', title: 'Ekim ayı toplam yolcu sayısı yıllık %9,4 artışla 7,8 milyona ulaştı.', impact: 'POSITIVE' },
      { id: 'thyao-2', date: '2026-11-04', source: 'KAP', title: 'Yeni geniş gövde uçak teslimatı ile filo büyüklüğü 482 uçağa çıktı.', impact: 'POSITIVE' },
      { id: 'thyao-3', date: '2026-10-21', source: 'REUTERS', title: 'Jet yakıtı marjlarındaki artış 4. çeyrek maliyet baskısını gündeme getirdi.', impact: 'NEGATIVE' },
    ],
  },
  {
    symbol: 'ASELS',
    name: 'Aselsan Elektronik Sanayi',
    market: 'BIST',
    currency: 'TRY',
    sector: 'Savunma',
    startPrice: 68.4,
    annualDrift: 0.36,
    annualVol: 0.34,
    avgDailyVolume: 42000000,
    beta: 1.09,
    dividendYield: 0.6,
    expectedGrowthRate: 21.0,
    description: 'Savunma elektroniği, radar, hava savunma sistemleri ve aviyonik üreticisi.',
    baseQuarterlyRevenue: 29500,
    revenueGrowthPerQ: 0.065,
    grossMargin: 0.335,
    ebitdaMargin: 0.265,
    netMargin: 0.165,
    sharesOutstanding: 4560,
    assetTurnoverAnnual: 0.59,
    debtToEquity: 0.42,
    currentRatio: 1.62,
    cashRatioOfAssets: 0.14,
    capexRatioOfRev: 0.09,
    benchmarks: SECTOR_BENCHMARKS['Savunma'],
    news: [
      { id: 'asels-1', date: '2026-11-19', source: 'KAP', title: 'Uluslararası müşteri ile 184 milyon USD tutarında radar ihracat sözleşmesi imzalandı.', impact: 'POSITIVE' },
      { id: 'asels-2', date: '2026-11-02', source: 'KAP', title: 'Bakiye sipariş toplamı 14,2 milyar USD ile tarihi zirveyi yeniledi.', impact: 'POSITIVE' },
      { id: 'asels-3', date: '2026-10-14', source: 'KAP', title: 'AR-GE merkezinde yeni nesil AESA radar seri üretim hattı devreye alındı.', impact: 'NEUTRAL' },
    ],
  },
  {
    symbol: 'TUPRS',
    name: 'Tüpraş — Türkiye Petrol Rafinerileri',
    market: 'BIST',
    currency: 'TRY',
    sector: 'Enerji',
    startPrice: 152.0,
    annualDrift: 0.17,
    annualVol: 0.28,
    avgDailyVolume: 21500000,
    beta: 1.02,
    dividendYield: 7.8,
    expectedGrowthRate: 9.5,
    description: 'Türkiye rafineri kapasitesinin ana üreticisi ve sürdürülebilir havacılık yakıtı yatırımcısı.',
    baseQuarterlyRevenue: 192000,
    revenueGrowthPerQ: 0.028,
    grossMargin: 0.138,
    ebitdaMargin: 0.115,
    netMargin: 0.072,
    sharesOutstanding: 1926,
    assetTurnoverAnnual: 1.72,
    debtToEquity: 0.34,
    currentRatio: 1.48,
    cashRatioOfAssets: 0.26,
    capexRatioOfRev: 0.035,
    benchmarks: SECTOR_BENCHMARKS['Enerji'],
    news: [
      { id: 'tuprs-1', date: '2026-11-16', source: 'KAP', title: 'Akdeniz dizel ürün marjları varil başına 17,4 USD seviyesinde dengelendi.', impact: 'POSITIVE' },
      { id: 'tuprs-2', date: '2026-10-29', source: 'KAP', title: 'İzmit rafinerisinde planlı bakım süreci takvime uygun tamamlandı.', impact: 'NEUTRAL' },
      { id: 'tuprs-3', date: '2026-10-11', source: 'BLOOMBERG', title: 'Yönetim kurulu ara dönem temettü dağıtım takvimini açıkladı.', impact: 'POSITIVE' },
    ],
  },
  {
    symbol: 'KCHOL',
    name: 'Koç Holding A.Ş.',
    market: 'BIST',
    currency: 'TRY',
    sector: 'Holding',
    startPrice: 196.0,
    annualDrift: 0.21,
    annualVol: 0.29,
    avgDailyVolume: 18000000,
    beta: 1.12,
    dividendYield: 3.4,
    expectedGrowthRate: 13.0,
    description: 'Enerji, otomotiv, dayanıklı tüketim ve finans alanlarında Türkiye’nin en büyük yatırım holdingi.',
    baseQuarterlyRevenue: 445000,
    revenueGrowthPerQ: 0.035,
    grossMargin: 0.185,
    ebitdaMargin: 0.125,
    netMargin: 0.068,
    sharesOutstanding: 2536,
    assetTurnoverAnnual: 0.88,
    debtToEquity: 0.65,
    currentRatio: 1.32,
    cashRatioOfAssets: 0.19,
    capexRatioOfRev: 0.048,
    benchmarks: SECTOR_BENCHMARKS['Holding'],
    news: [
      { id: 'kchol-1', date: '2026-11-15', source: 'KAP', title: 'Solo net nakit pozisyonu 920 milyon USD seviyesini korudu.', impact: 'POSITIVE' },
      { id: 'kchol-2', date: '2026-10-25', source: 'REUTERS', title: 'Avrupa beyaz eşya talep daralması dayanıklı tüketim segmentini sınırladı.', impact: 'NEGATIVE' },
    ],
  },
  {
    symbol: 'BIMAS',
    name: 'BİM Birleşik Mağazalar A.Ş.',
    market: 'BIST',
    currency: 'TRY',
    sector: 'Perakende',
    startPrice: 512.0,
    annualDrift: 0.28,
    annualVol: 0.26,
    avgDailyVolume: 4800000,
    beta: 0.78,
    dividendYield: 2.9,
    expectedGrowthRate: 16.5,
    description: 'Yüksek indirimli gıda perakendeciliğinde lider, güçlü nakit akışlı mağaza ağı.',
    baseQuarterlyRevenue: 118000,
    revenueGrowthPerQ: 0.052,
    grossMargin: 0.204,
    ebitdaMargin: 0.078,
    netMargin: 0.049,
    sharesOutstanding: 607,
    assetTurnoverAnnual: 2.35,
    debtToEquity: 0.29,
    currentRatio: 1.12,
    cashRatioOfAssets: 0.15,
    capexRatioOfRev: 0.028,
    benchmarks: SECTOR_BENCHMARKS['Perakende'],
    news: [
      { id: 'bimas-1', date: '2026-11-14', source: 'KAP', title: 'Toplam mağaza sayısı yurt dışı operasyonlar dahil 13.640 adede ulaştı.', impact: 'POSITIVE' },
      { id: 'bimas-2', date: '2026-10-30', source: 'KAP', title: 'FİLE formatında benzer mağaza (LFL) sepet büyümesi enflasyonun üzerinde gerçekleşti.', impact: 'POSITIVE' },
    ],
  },
  {
    symbol: 'SISE',
    name: 'Türkiye Şişe ve Cam Fabrikaları',
    market: 'BIST',
    currency: 'TRY',
    sector: 'Sanayi',
    startPrice: 44.2,
    annualDrift: 0.11,
    annualVol: 0.27,
    avgDailyVolume: 36000000,
    beta: 0.96,
    dividendYield: 1.8,
    expectedGrowthRate: 11.0,
    description: 'Mimari cam, otomotiv camı, cam ambalaj ve soda külünde küresel üretici.',
    baseQuarterlyRevenue: 46500,
    revenueGrowthPerQ: 0.024,
    grossMargin: 0.265,
    ebitdaMargin: 0.162,
    netMargin: 0.085,
    sharesOutstanding: 3063,
    assetTurnoverAnnual: 0.56,
    debtToEquity: 0.62,
    currentRatio: 1.54,
    cashRatioOfAssets: 0.13,
    capexRatioOfRev: 0.115,
    benchmarks: SECTOR_BENCHMARKS['Sanayi'],
    news: [
      { id: 'sise-1', date: '2026-11-12', source: 'KAP', title: 'ABD doğal soda külü projesinde kapasite fazı revizyonu paylaşıldı.', impact: 'NEUTRAL' },
      { id: 'sise-2', date: '2026-10-19', source: 'REUTERS', title: 'Avrupa inşaat camı talebinde kademeli toparlanma sinyalleri görülüyor.', impact: 'POSITIVE' },
    ],
  },
  {
    symbol: 'AKBNK',
    name: 'Akbank T.A.Ş.',
    market: 'BIST',
    currency: 'TRY',
    sector: 'Bankacılık',
    startPrice: 58.6,
    annualDrift: 0.26,
    annualVol: 0.36,
    avgDailyVolume: 64000000,
    beta: 1.32,
    dividendYield: 3.9,
    expectedGrowthRate: 15.0,
    description: 'Yüksek sermaye yeterliliğine sahip, dijital bankacılık odaklı özel ticari banka.',
    baseQuarterlyRevenue: 62000,
    revenueGrowthPerQ: 0.044,
    grossMargin: 0.52,
    ebitdaMargin: 0.36,
    netMargin: 0.265,
    sharesOutstanding: 5200,
    assetTurnoverAnnual: 0.14,
    debtToEquity: 1.45,
    currentRatio: 1.24,
    cashRatioOfAssets: 0.21,
    capexRatioOfRev: 0.032,
    benchmarks: SECTOR_BENCHMARKS['Bankacılık'],
    news: [
      { id: 'akbnk-1', date: '2026-11-17', source: 'KAP', title: '385 milyon USD + 260 milyon EUR sürdürülebilirlik temalı sendikasyon kredisi %118 oranla yenilendi.', impact: 'POSITIVE' },
      { id: 'akbnk-2', date: '2026-11-01', source: 'BLOOMBERG', title: 'Net faiz marjında 4. çeyrek itibarıyla kademeli genişleme bekleniyor.', impact: 'POSITIVE' },
    ],
  },
  {
    symbol: 'EREGL',
    name: 'Ereğli Demir ve Çelik Fabrikaları',
    market: 'BIST',
    currency: 'TRY',
    sector: 'Sanayi',
    startPrice: 49.8,
    annualDrift: 0.09,
    annualVol: 0.30,
    avgDailyVolume: 51000000,
    beta: 1.05,
    dividendYield: 2.2,
    expectedGrowthRate: 10.0,
    description: 'Türkiye’nin en büyük entegre yassı çelik üreticisi ve peletleme tesisi yatırımcısı.',
    baseQuarterlyRevenue: 54000,
    revenueGrowthPerQ: 0.022,
    grossMargin: 0.155,
    ebitdaMargin: 0.132,
    netMargin: 0.064,
    sharesOutstanding: 3500,
    assetTurnoverAnnual: 0.62,
    debtToEquity: 0.54,
    currentRatio: 1.68,
    cashRatioOfAssets: 0.12,
    capexRatioOfRev: 0.105,
    benchmarks: SECTOR_BENCHMARKS['Sanayi'],
    news: [
      { id: 'eregl-1', date: '2026-11-11', source: 'KAP', title: 'Ton başına FAVÖK rakamı 112 USD seviyesine yükseldi.', impact: 'POSITIVE' },
      { id: 'eregl-2', date: '2026-10-22', source: 'REUTERS', title: 'Çin çıkışlı sıcak haddelenmiş rulo (HRC) fiyatları küresel marjları baskılıyor.', impact: 'NEGATIVE' },
    ],
  },
  {
    symbol: 'FROTO',
    name: 'Ford Otomotiv Sanayi A.Ş.',
    market: 'BIST',
    currency: 'TRY',
    sector: 'Otomotiv',
    startPrice: 1015.0,
    annualDrift: 0.25,
    annualVol: 0.28,
    avgDailyVolume: 2100000,
    beta: 0.94,
    dividendYield: 5.4,
    expectedGrowthRate: 15.5,
    description: 'Avrupa ticari araç üretim üssü, elektrikli Transit ve Craiova tesis operatörü.',
    baseQuarterlyRevenue: 142000,
    revenueGrowthPerQ: 0.048,
    grossMargin: 0.145,
    ebitdaMargin: 0.108,
    netMargin: 0.082,
    sharesOutstanding: 350.9,
    assetTurnoverAnnual: 1.85,
    debtToEquity: 0.76,
    currentRatio: 1.28,
    cashRatioOfAssets: 0.16,
    capexRatioOfRev: 0.055,
    benchmarks: SECTOR_BENCHMARKS['Otomotiv'],
    news: [
      { id: 'froto-1', date: '2026-11-18', source: 'KAP', title: 'Avrupa ticari araç ihracat hacmi 3. çeyrekte yıllık %14 arttı.', impact: 'POSITIVE' },
      { id: 'froto-2', date: '2026-10-28', source: 'KAP', title: 'Yeniköy fabrikasında yeni nesil elektrikli ticari model üretimi hızlandı.', impact: 'POSITIVE' },
    ],
  },
  {
    symbol: 'GARAN',
    name: 'Türkiye Garanti Bankası A.Ş.',
    market: 'BIST',
    currency: 'TRY',
    sector: 'Bankacılık',
    startPrice: 118.5,
    annualDrift: 0.31,
    annualVol: 0.35,
    avgDailyVolume: 29000000,
    beta: 1.28,
    dividendYield: 3.1,
    expectedGrowthRate: 16.0,
    description: 'Yüksek özkaynak kârlılığı ve aktif kalitesiyle öne çıkan lider özel banka.',
    baseQuarterlyRevenue: 74000,
    revenueGrowthPerQ: 0.049,
    grossMargin: 0.56,
    ebitdaMargin: 0.39,
    netMargin: 0.295,
    sharesOutstanding: 4200,
    assetTurnoverAnnual: 0.15,
    debtToEquity: 1.38,
    currentRatio: 1.29,
    cashRatioOfAssets: 0.22,
    capexRatioOfRev: 0.028,
    benchmarks: SECTOR_BENCHMARKS['Bankacılık'],
    news: [
      { id: 'garan-1', date: '2026-11-15', source: 'KAP', title: 'Özkaynak kârlılığı (ROE) sektör ortalamasının 520 bps üzerinde gerçekleşti.', impact: 'POSITIVE' },
      { id: 'garan-2', date: '2026-10-24', source: 'KAP', title: 'Takipteki krediler oranı %2,1 ile güçlü karşılık tamponunu korudu.', impact: 'POSITIVE' },
    ],
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    market: 'GLOBAL',
    currency: 'USD',
    sector: 'Teknoloji',
    startPrice: 218.5,
    annualDrift: 0.18,
    annualVol: 0.22,
    avgDailyVolume: 52000000,
    beta: 1.15,
    dividendYield: 0.45,
    expectedGrowthRate: 10.5,
    description: 'Tüketici donanımı, yüksek marjlı servis ekosistemi ve Apple Silicon lideri.',
    baseQuarterlyRevenue: 94500,
    revenueGrowthPerQ: 0.024,
    grossMargin: 0.465,
    ebitdaMargin: 0.342,
    netMargin: 0.264,
    sharesOutstanding: 15150,
    assetTurnoverAnnual: 1.08,
    debtToEquity: 1.48,
    currentRatio: 1.06,
    cashRatioOfAssets: 0.19,
    capexRatioOfRev: 0.028,
    benchmarks: SECTOR_BENCHMARKS['Teknoloji'],
    news: [
      { id: 'aapl-1', date: '2026-11-19', source: 'SEC', title: 'Servis gelirleri çeyreklik bazda 26,8 milyar USD ile yeni rekor kırdı.', impact: 'POSITIVE' },
      { id: 'aapl-2', date: '2026-11-05', source: 'BLOOMBERG', title: 'Hindistan üretim payı toplam iPhone sevkiyatının %19’una yükseldi.', impact: 'NEUTRAL' },
    ],
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    market: 'GLOBAL',
    currency: 'USD',
    sector: 'Yarıİletken',
    startPrice: 126.0,
    annualDrift: 0.44,
    annualVol: 0.46,
    avgDailyVolume: 245000000,
    beta: 1.68,
    dividendYield: 0.03,
    expectedGrowthRate: 26.0,
    description: 'Yapay zekâ veri merkezi GPU mimarileri ve CUDA yazılım platformu küresel lideri.',
    baseQuarterlyRevenue: 34500,
    revenueGrowthPerQ: 0.095,
    grossMargin: 0.742,
    ebitdaMargin: 0.635,
    netMargin: 0.545,
    sharesOutstanding: 24500,
    assetTurnoverAnnual: 1.42,
    debtToEquity: 0.16,
    currentRatio: 3.85,
    cashRatioOfAssets: 0.42,
    capexRatioOfRev: 0.035,
    benchmarks: SECTOR_BENCHMARKS['Yarıİletken'],
    news: [
      { id: 'nvda-1', date: '2026-11-20', source: 'SEC', title: 'Veri merkezi gelirleri yıllık %78 artarak piyasa beklentisini aştı.', impact: 'POSITIVE' },
      { id: 'nvda-2', date: '2026-11-08', source: 'REUTERS', title: 'Yeni nesil raf ölçekli AI sunucu teslimatlarında arz kısıtı hafifliyor.', impact: 'POSITIVE' },
    ],
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    market: 'GLOBAL',
    currency: 'USD',
    sector: 'Teknoloji',
    startPrice: 418.0,
    annualDrift: 0.19,
    annualVol: 0.21,
    avgDailyVolume: 21500000,
    beta: 0.96,
    dividendYield: 0.72,
    expectedGrowthRate: 13.5,
    description: 'Kurumsal bulut bilişim (Azure), üretkenlik yazılımları ve kurumsal yapay zekâ altyapısı.',
    baseQuarterlyRevenue: 65200,
    revenueGrowthPerQ: 0.036,
    grossMargin: 0.695,
    ebitdaMargin: 0.525,
    netMargin: 0.362,
    sharesOutstanding: 7430,
    assetTurnoverAnnual: 0.54,
    debtToEquity: 0.31,
    currentRatio: 1.38,
    cashRatioOfAssets: 0.16,
    capexRatioOfRev: 0.185,
    benchmarks: SECTOR_BENCHMARKS['Teknoloji'],
    news: [
      { id: 'msft-1', date: '2026-11-17', source: 'SEC', title: 'Azure bulut gelir büyümesi %33 seviyesinde; AI iş yükleri 11 puan katkı sağladı.', impact: 'POSITIVE' },
      { id: 'msft-2', date: '2026-10-30', source: 'BLOOMBERG', title: 'Yüksek veri merkezi CapEx harcamaları kısa vadeli serbest nakit akışı marjını sınırladı.', impact: 'NEGATIVE' },
    ],
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    market: 'GLOBAL',
    currency: 'USD',
    sector: 'Otomotiv',
    startPrice: 248.0,
    annualDrift: 0.22,
    annualVol: 0.54,
    avgDailyVolume: 88000000,
    beta: 1.92,
    dividendYield: 0.0,
    expectedGrowthRate: 18.0,
    description: 'Elektrikli araçlar, enerji depolama sistemleri ve otonom sürüş yazılım platformu.',
    baseQuarterlyRevenue: 25400,
    revenueGrowthPerQ: 0.032,
    grossMargin: 0.188,
    ebitdaMargin: 0.165,
    netMargin: 0.095,
    sharesOutstanding: 3210,
    assetTurnoverAnnual: 0.88,
    debtToEquity: 0.18,
    currentRatio: 1.84,
    cashRatioOfAssets: 0.27,
    capexRatioOfRev: 0.102,
    benchmarks: SECTOR_BENCHMARKS['Otomotiv'],
    news: [
      { id: 'tsla-1', date: '2026-11-18', source: 'SEC', title: 'Megapack enerji depolama kurulumları çeyreklik 11,4 GWh ile rekor kırdı.', impact: 'POSITIVE' },
      { id: 'tsla-2', date: '2026-11-03', source: 'REUTERS', title: 'Avrupa EV pazarındaki fiyat rekabeti otomotiv brüt marjında dalgalanma yarattı.', impact: 'NEGATIVE' },
    ],
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    market: 'GLOBAL',
    currency: 'USD',
    sector: 'E-Ticaret',
    startPrice: 186.5,
    annualDrift: 0.24,
    annualVol: 0.27,
    avgDailyVolume: 41000000,
    beta: 1.19,
    dividendYield: 0.0,
    expectedGrowthRate: 17.5,
    description: 'Küresel e-ticaret, AWS bulut altyapısı ve dijital reklamcılık ekosistemi.',
    baseQuarterlyRevenue: 158000,
    revenueGrowthPerQ: 0.034,
    grossMargin: 0.488,
    ebitdaMargin: 0.196,
    netMargin: 0.098,
    sharesOutstanding: 10510,
    assetTurnoverAnnual: 1.12,
    debtToEquity: 0.56,
    currentRatio: 1.14,
    cashRatioOfAssets: 0.15,
    capexRatioOfRev: 0.118,
    benchmarks: SECTOR_BENCHMARKS['E-Ticaret'],
    news: [
      { id: 'amzn-1', date: '2026-11-16', source: 'SEC', title: 'AWS işletme kâr marjı %37,2 ile tarihi yüksek seviyesine ulaştı.', impact: 'POSITIVE' },
      { id: 'amzn-2', date: '2026-10-29', source: 'BLOOMBERG', title: 'Bölgesel lojistik otomasyonu birim teslimat maliyetlerini %8 düşürdü.', impact: 'POSITIVE' },
    ],
  },
];

function generateBusinessDates(count: number, endDateStr: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${endDateStr}T12:00:00Z`);
  while (dates.length < count) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(current.toISOString().slice(0, 10));
    }
    current.setUTCDate(current.getUTCDate() - 1);
  }
  return dates.reverse();
}

function generateOHLCV(bp: StockBlueprint, days = 365): OHLCVBar[] {
  const rng = createPRNG(hashString(`OHLCV_${bp.symbol}_2026`));
  const dates = generateBusinessDates(days, '2026-11-20');
  const bars: OHLCVBar[] = [];

  const dt = 1 / 252;
  const baseMu = bp.annualDrift;
  const baseSigma = bp.annualVol;
  let prevClose = bp.startPrice;

  const phaseShift = rng() * Math.PI * 2;
  const cyclePeriod = 65 + Math.floor(rng() * 55);

  for (let i = 0; i < dates.length; i++) {
    const regimeWave = Math.sin((2 * Math.PI * i) / cyclePeriod + phaseShift);
    const localVol =
      baseSigma *
      (0.72 + 0.48 * Math.abs(Math.cos((2 * Math.PI * i) / (cyclePeriod * 1.4) + phaseShift)));
    const localMu = baseMu + regimeWave * 0.22;

    const z = nextGaussian(rng);
    const gapZ = nextGaussian(rng);

    const openGap = gapZ * (localVol * Math.sqrt(dt) * 0.28);
    const open = Math.max(0.5, prevClose * (1 + openGap));

    const logReturn = (localMu - 0.5 * localVol * localVol) * dt + localVol * Math.sqrt(dt) * z;
    const close = Math.max(0.5, open * Math.exp(logReturn));

    const intradayRange = Math.abs(nextGaussian(rng)) * localVol * Math.sqrt(dt) * 0.72;
    const high = Math.max(open, close) * (1 + intradayRange * (0.45 + rng() * 0.55));
    const low = Math.max(0.25, Math.min(open, close) * (1 - intradayRange * (0.45 + rng() * 0.55)));

    const absMove = Math.abs(close - open) / open;
    const spike = rng() > 0.965 ? 1.85 + rng() * 0.9 : 1.0;
    const volMultiplier =
      (0.72 + (absMove / (localVol * Math.sqrt(dt) + 1e-4)) * 0.45) * (0.85 + rng() * 0.3) * spike;
    const volume = Math.round(bp.avgDailyVolume * volMultiplier);

    bars.push({
      time: dates[i],
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume,
    });

    prevClose = close;
  }

  return bars;
}

function generateQuarters(bp: StockBlueprint): QuarterlyFinancial[] {
  const rng = createPRNG(hashString(`FIN_${bp.symbol}_2026`));
  const labels = [
    '2024 Q4',
    '2025 Q1',
    '2025 Q2',
    '2025 Q3',
    '2025 Q4',
    '2026 Q1',
    '2026 Q2',
    '2026 Q3',
  ];

  const quarters: QuarterlyFinancial[] = [];
  let rev = bp.baseQuarterlyRevenue * 0.82;
  let shares = bp.sharesOutstanding * 1.008;
  let leverageScale = 1.06;
  let currentRatioScale = 0.96;
  let marginTrend = -0.008;

  for (let i = 0; i < labels.length; i++) {
    const seasonal = i % 4 === 3 ? 1.05 : i % 4 === 0 ? 0.96 : 1.0;
    const noise = 1 + (rng() - 0.48) * 0.04;
    rev = rev * (1 + bp.revenueGrowthPerQ) * noise;
    const qRev = rev * seasonal;

    marginTrend += 0.0022 + (rng() - 0.45) * 0.002;
    const gMargin = Math.max(0.08, Math.min(0.85, bp.grossMargin + marginTrend));
    const eMargin = Math.max(0.05, Math.min(0.75, bp.ebitdaMargin + marginTrend * 0.8));
    const nMargin = Math.max(0.02, Math.min(0.65, bp.netMargin + marginTrend * 0.65));

    const grossProfit = qRev * gMargin;
    const ebitda = qRev * eMargin;
    const operatingIncome = ebitda * 0.84;
    const netIncome = qRev * nMargin;

    const annualizedRev = qRev * 4;
    const totalAssets = annualizedRev / bp.assetTurnoverAnnual;
    leverageScale = Math.max(0.82, leverageScale - 0.012 + (rng() - 0.5) * 0.01);
    const totalDebt = totalAssets * (bp.debtToEquity / (1 + bp.debtToEquity)) * leverageScale;
    const shareholdersEquity = Math.max(totalAssets * 0.22, totalAssets - totalDebt * 1.18);
    const cashAndEquivalents = totalAssets * bp.cashRatioOfAssets * (0.94 + rng() * 0.14);

    currentRatioScale += 0.008 + (rng() - 0.5) * 0.015;
    const effectiveCurrentRatio = Math.max(0.85, bp.currentRatio * currentRatioScale);
    const currentLiabilities = totalAssets * 0.24;
    const currentAssets = currentLiabilities * effectiveCurrentRatio;
    const retainedEarnings = shareholdersEquity * (0.48 + i * 0.018);

    const operatingCashFlow =
      netIncome * (1.12 + rng() * 0.22) + (ebitda - operatingIncome) * 0.6;
    const capex = qRev * bp.capexRatioOfRev * (0.9 + rng() * 0.2);

    shares = shares * (bp.market === 'GLOBAL' ? 0.9975 : 1.0);

    quarters.push({
      period: labels[i],
      revenue: round2(qRev),
      grossProfit: round2(grossProfit),
      ebitda: round2(ebitda),
      operatingIncome: round2(operatingIncome),
      netIncome: round2(netIncome),
      totalAssets: round2(totalAssets),
      currentAssets: round2(currentAssets),
      currentLiabilities: round2(currentLiabilities),
      totalDebt: round2(totalDebt),
      cashAndEquivalents: round2(cashAndEquivalents),
      shareholdersEquity: round2(shareholdersEquity),
      retainedEarnings: round2(retainedEarnings),
      operatingCashFlow: round2(operatingCashFlow),
      capex: round2(capex),
      sharesOutstanding: round2(shares),
    });
  }

  return quarters;
}

let cachedUniverse: StockAsset[] | null = null;

export function getSeedStockUniverse(): StockAsset[] {
  if (cachedUniverse) return cachedUniverse;

  cachedUniverse = STOCK_BLUEPRINTS.map((bp) => ({
    symbol: bp.symbol,
    name: bp.name,
    market: bp.market,
    currency: bp.currency,
    sector: bp.sector,
    beta: bp.beta,
    dividendYield: bp.dividendYield,
    expectedGrowthRate: bp.expectedGrowthRate,
    description: bp.description,
    bars: generateOHLCV(bp, 365),
    quarters: generateQuarters(bp),
    benchmarks: bp.benchmarks,
    news: bp.news,
    dataSource: 'SEED',
    lastUpdated: '2026-11-20',
  }));

  return cachedUniverse;
}

export function getSeedStockBySymbol(symbol: string): StockAsset | undefined {
  const normalized = symbol.trim().toUpperCase();
  return getSeedStockUniverse().find((s) => s.symbol === normalized);
}

export function getMacroTickers(): MacroTicker[] {
  const universe = getSeedStockUniverse();
  const bistStocks = universe.filter((s) => s.market === 'BIST');
  const globalStocks = universe.filter((s) => s.market === 'GLOBAL');

  const avgChange = (items: StockAsset[]): number => {
    const sum = items.reduce((acc, s) => {
      const len = s.bars.length;
      if (len < 2) return acc;
      const pct = ((s.bars[len - 1].close - s.bars[len - 2].close) / s.bars[len - 2].close) * 100;
      return acc + pct;
    }, 0);
    return round2(sum / Math.max(1, items.length));
  };

  return [
    { symbol: 'XU100', label: 'BIST 100', price: 10482.45, changePct: avgChange(bistStocks) },
    { symbol: 'SPX', label: 'S&P 500', price: 6124.8, changePct: avgChange(globalStocks) },
    { symbol: 'USDTRY', label: 'USD/TRY', price: 36.42, changePct: 0.18, prefix: '₺' },
    { symbol: 'XAUUSD', label: 'ALTIN (ONS)', price: 2748.6, changePct: 0.64, prefix: '$' },
    { symbol: 'VIX', label: 'VIX', price: 15.82, changePct: -2.14 },
  ];
}