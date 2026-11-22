import type {
  AltmanZResult,
  DcfInput,
  DcfResult,
  FundamentalMetrics,
  PiotroskiCriterion,
  PiotroskiResult,
  QuarterlyFinancial,
  StockAsset,
} from '../types/market';

function round(val: number, digits = 2): number {
  if (!Number.isFinite(val)) return 0;
  const f = Math.pow(10, digits);
  return Math.round(val * f) / f;
}

function sumField(
  quarters: QuarterlyFinancial[],
  picker: (q: QuarterlyFinancial) => number
): number {
  return quarters.reduce((acc, q) => acc + picker(q), 0);
}

function safeDiv(num: number, den: number): number | null {
  if (!Number.isFinite(num) || !Number.isFinite(den) || Math.abs(den) < 1e-9) {
    return null;
  }
  return num / den;
}

export function getDefaultDcfInput(asset: StockAsset): DcfInput {
  const isBist = asset.market === 'BIST';
  return {
    growthRatePct: round(Math.min(25, Math.max(4, asset.expectedGrowthRate)), 1),
    waccPct: isBist ? 16.5 : 9.5,
    terminalGrowthPct: isBist ? 5.0 : 3.0,
    projectionYears: 5,
  };
}

export function computeFundamentalMetrics(asset: StockAsset): FundamentalMetrics {
  const latestPrice = asset.bars[asset.bars.length - 1]?.close ?? 0;
  const quarters = asset.quarters;

  if (quarters.length === 0) {
    return {
      marketCap: 0,
      enterpriseValue: 0,
      pe: null,
      pb: null,
      evEbitda: null,
      peg: null,
      roe: 0,
      roa: 0,
      grossMargin: 0,
      ebitdaMargin: 0,
      netMargin: 0,
      currentRatio: 0,
      netDebtToEbitda: 0,
      fcfTTM: 0,
      revenueGrowthYoY: 0,
      netIncomeGrowthYoY: 0,
      piotroski: { score: 0, grade: 'Zayıf', criteria: [] },
      altmanZ: {
        score: 0,
        zone: 'Riskli Bölge',
        components: { x1: 0, x2: 0, x3: 0, x4: 0, x5: 0 },
      },
    };
  }

  const latestQ = quarters[quarters.length - 1];
  const ttmSlice = quarters.slice(-Math.min(4, quarters.length));
  const annualizeFactor = ttmSlice.length > 0 ? 4 / ttmSlice.length : 1;

  const revenueTTM = sumField(ttmSlice, (q) => q.revenue) * annualizeFactor;
  const grossProfitTTM = sumField(ttmSlice, (q) => q.grossProfit) * annualizeFactor;
  const ebitdaTTM = sumField(ttmSlice, (q) => q.ebitda) * annualizeFactor;
  const ebitTTM = sumField(ttmSlice, (q) => q.operatingIncome) * annualizeFactor;
  const netIncomeTTM = sumField(ttmSlice, (q) => q.netIncome) * annualizeFactor;
  const ocfTTM = sumField(ttmSlice, (q) => q.operatingCashFlow) * annualizeFactor;
  const capexTTM = sumField(ttmSlice, (q) => q.capex) * annualizeFactor;
  const fcfTTM = ocfTTM - capexTTM;

  // Comparison window (prior TTM if >= 8 quarters, otherwise earliest quarter annualized)
  const hasFullPriorTTM = quarters.length >= 8;
  const prevQ = hasFullPriorTTM
    ? quarters[quarters.length - 5]
    : quarters[0];
  const prevFlowSlice = hasFullPriorTTM
    ? quarters.slice(-8, -4)
    : quarters.slice(0, Math.max(1, quarters.length - 1));
  const prevAnnualize = prevFlowSlice.length > 0 ? 4 / prevFlowSlice.length : 1;

  const prevRevenueTTM = sumField(prevFlowSlice, (q) => q.revenue) * prevAnnualize;
  const prevGrossProfitTTM = sumField(prevFlowSlice, (q) => q.grossProfit) * prevAnnualize;
  const prevNetIncomeTTM = sumField(prevFlowSlice, (q) => q.netIncome) * prevAnnualize;

  const marketCap = latestPrice * latestQ.sharesOutstanding;
  const netDebt = latestQ.totalDebt - latestQ.cashAndEquivalents;
  const enterpriseValue = Math.max(1, marketCap + netDebt);

  const rawPE = netIncomeTTM > 0 ? safeDiv(marketCap, netIncomeTTM) : null;
  const rawPB = latestQ.shareholdersEquity > 0 ? safeDiv(marketCap, latestQ.shareholdersEquity) : null;
  const rawEvEbitda = ebitdaTTM > 0 ? safeDiv(enterpriseValue, ebitdaTTM) : null;
  const rawPEG =
    rawPE !== null && asset.expectedGrowthRate > 0 ? rawPE / asset.expectedGrowthRate : null;

  const roe = (safeDiv(netIncomeTTM, latestQ.shareholdersEquity) ?? 0) * 100;
  const roa = (safeDiv(netIncomeTTM, latestQ.totalAssets) ?? 0) * 100;
  const prevRoa = (safeDiv(prevNetIncomeTTM, prevQ.totalAssets) ?? 0) * 100;

  const grossMargin = (safeDiv(grossProfitTTM, revenueTTM) ?? 0) * 100;
  const prevGrossMargin = (safeDiv(prevGrossProfitTTM, prevRevenueTTM) ?? 0) * 100;
  const ebitdaMargin = (safeDiv(ebitdaTTM, revenueTTM) ?? 0) * 100;
  const netMargin = (safeDiv(netIncomeTTM, revenueTTM) ?? 0) * 100;

  const currentRatio = safeDiv(latestQ.currentAssets, latestQ.currentLiabilities) ?? 0;
  const prevCurrentRatio = safeDiv(prevQ.currentAssets, prevQ.currentLiabilities) ?? 0;
  const netDebtToEbitda = ebitdaTTM > 0 ? netDebt / ebitdaTTM : 0;

  const revenueGrowthYoY =
    prevRevenueTTM > 0 ? ((revenueTTM - prevRevenueTTM) / prevRevenueTTM) * 100 : 0;
  const netIncomeGrowthYoY =
    Math.abs(prevNetIncomeTTM) > 1e-6
      ? ((netIncomeTTM - prevNetIncomeTTM) / Math.abs(prevNetIncomeTTM)) * 100
      : 0;

  // --- Piotroski F-Score (9 Criteria) ---
  const leverageCurr = safeDiv(latestQ.totalDebt, latestQ.totalAssets) ?? 0;
  const leveragePrev = safeDiv(prevQ.totalDebt, prevQ.totalAssets) ?? 0;

  const turnoverCurr = safeDiv(revenueTTM, latestQ.totalAssets) ?? 0;
  const turnoverPrev = safeDiv(prevRevenueTTM, prevQ.totalAssets) ?? 0;

  const criteria: PiotroskiCriterion[] = [
    {
      id: 1,
      category: 'Kârlılık',
      label: 'Pozitif Aktif Kârlılığı (ROA > 0)',
      passed: roa > 0,
      detail: `TTM ROA: %${round(roa, 2)}`,
    },
    {
      id: 2,
      category: 'Kârlılık',
      label: 'Pozitif İşletme Nakit Akışı (OCF > 0)',
      passed: ocfTTM > 0,
      detail: `TTM OCF: ${round(ocfTTM, 1)}M`,
    },
    {
      id: 3,
      category: 'Kârlılık',
      label: 'Artan Aktif Kârlılığı (ΔROA > 0)',
      passed: roa > prevRoa,
      detail: `%${round(prevRoa, 2)} → %${round(roa, 2)}`,
    },
    {
      id: 4,
      category: 'Kârlılık',
      label: 'Nakit Kalitesi (OCF > Net Kâr)',
      passed: ocfTTM > netIncomeTTM,
      detail: `OCF ${round(ocfTTM, 1)}M vs Net Kâr ${round(netIncomeTTM, 1)}M`,
    },
    {
      id: 5,
      category: 'Kaldıraç & Likidite',
      label: 'Azalan Borçluluk (ΔBorç/Aktif ≤ 0)',
      passed: leverageCurr <= leveragePrev + 0.002,
      detail: `%${round(leveragePrev * 100, 1)} → %${round(leverageCurr * 100, 1)}`,
    },
    {
      id: 6,
      category: 'Kaldıraç & Likidite',
      label: 'Güçlenen Likidite (ΔCari Oran > 0)',
      passed: currentRatio > prevCurrentRatio,
      detail: `${round(prevCurrentRatio, 2)}x → ${round(currentRatio, 2)}x`,
    },
    {
      id: 7,
      category: 'Kaldıraç & Likidite',
      label: 'Sermaye Sulandırması Yok (ΔHisse ≤ 0)',
      passed: latestQ.sharesOutstanding <= prevQ.sharesOutstanding * 1.005,
      detail: `${round(prevQ.sharesOutstanding, 1)}M → ${round(latestQ.sharesOutstanding, 1)}M`,
    },
    {
      id: 8,
      category: 'Operasyonel Verimlilik',
      label: 'Artan Brüt Kâr Marjı (ΔBrüt Marj > 0)',
      passed: grossMargin > prevGrossMargin,
      detail: `%${round(prevGrossMargin, 1)} → %${round(grossMargin, 1)}`,
    },
    {
      id: 9,
      category: 'Operasyonel Verimlilik',
      label: 'Artan Aktif Devir Hızı (ΔCiro/Aktif > 0)',
      passed: turnoverCurr > turnoverPrev,
      detail: `${round(turnoverPrev, 2)}x → ${round(turnoverCurr, 2)}x`,
    },
  ];

  const fScore = criteria.filter((c) => c.passed).length;
  const piotroski: PiotroskiResult = {
    score: fScore,
    grade: fScore >= 7 ? 'Güçlü' : fScore >= 4 ? 'Orta' : 'Zayıf',
    criteria,
  };

  // --- Altman Z-Score ---
  const totalAssets = Math.max(1, latestQ.totalAssets);
  const workingCapital = latestQ.currentAssets - latestQ.currentLiabilities;
  const totalLiabilities = Math.max(
    1,
    latestQ.totalAssets - latestQ.shareholdersEquity
  );

  const x1 = workingCapital / totalAssets;
  const x2 = latestQ.retainedEarnings / totalAssets;
  const x3 = ebitTTM / totalAssets;
  const x4 = marketCap / totalLiabilities;
  const x5 = revenueTTM / totalAssets;

  const zRaw = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5;
  const zScore = round(zRaw, 2);

  const altmanZ: AltmanZResult = {
    score: zScore,
    zone: zScore >= 2.99 ? 'Güvenli Bölge' : zScore >= 1.81 ? 'Gri Bölge' : 'Riskli Bölge',
    components: {
      x1: round(x1, 3),
      x2: round(x2, 3),
      x3: round(x3, 3),
      x4: round(x4, 3),
      x5: round(x5, 3),
    },
  };

  return {
    marketCap: round(marketCap, 1),
    enterpriseValue: round(enterpriseValue, 1),
    pe: rawPE !== null ? round(rawPE, 2) : null,
    pb: rawPB !== null ? round(rawPB, 2) : null,
    evEbitda: rawEvEbitda !== null ? round(rawEvEbitda, 2) : null,
    peg: rawPEG !== null ? round(rawPEG, 2) : null,
    roe: round(roe, 2),
    roa: round(roa, 2),
    grossMargin: round(grossMargin, 2),
    ebitdaMargin: round(ebitdaMargin, 2),
    netMargin: round(netMargin, 2),
    currentRatio: round(currentRatio, 2),
    netDebtToEbitda: round(netDebtToEbitda, 2),
    fcfTTM: round(fcfTTM, 1),
    revenueGrowthYoY: round(revenueGrowthYoY, 2),
    netIncomeGrowthYoY: round(netIncomeGrowthYoY, 2),
    piotroski,
    altmanZ,
  };
}

export function calculateDcfValuation(asset: StockAsset, input: DcfInput): DcfResult {
  const currentPrice = asset.bars[asset.bars.length - 1]?.close ?? 0;
  const quarters = asset.quarters;

  if (quarters.length === 0 || currentPrice <= 0) {
    return {
      intrinsicValuePerShare: 0,
      currentPrice,
      marginOfSafetyPct: 0,
      upsidePct: 0,
      projectedCashFlows: [],
      terminalValuePv: 0,
      equityValue: 0,
    };
  }

  const latestQ = quarters[quarters.length - 1];
  const ttmSlice = quarters.slice(-Math.min(4, quarters.length));
  const annualizeFactor = 4 / ttmSlice.length;

  const ocfTTM = sumField(ttmSlice, (q) => q.operatingCashFlow) * annualizeFactor;
  const capexTTM = sumField(ttmSlice, (q) => q.capex) * annualizeFactor;
  const netIncomeTTM = sumField(ttmSlice, (q) => q.netIncome) * annualizeFactor;
  const ebitdaTTM = sumField(ttmSlice, (q) => q.ebitda) * annualizeFactor;

  const rawFcf = ocfTTM - capexTTM;
  // Normalize base FCF only if heavy CapEx cycle produced negative/zero FCF
  const baseFcf =
    rawFcf > 0
      ? rawFcf
      : Math.max(netIncomeTTM * 0.72, ebitdaTTM * 0.35, currentPrice * latestQ.sharesOutstanding * 0.02);

  const years = Math.max(3, Math.min(10, Math.round(input.projectionYears)));
  const g = input.growthRatePct / 100;
  const gTerm = Math.min(input.terminalGrowthPct / 100, (input.waccPct - 1.0) / 100);
  const wacc = Math.max(gTerm + 0.01, input.waccPct / 100);

  const projectedCashFlows: { year: number; fcf: number; discountedFcf: number }[] = [];
  let pvCashFlows = 0;
  let runningFcf = baseFcf;

  for (let year = 1; year <= years; year++) {
    // Smooth fade of growth toward terminal growth in later years
    const fadeWeight = (year - 1) / Math.max(1, years);
    const effectiveG = g * (1 - fadeWeight * 0.25) + gTerm * (fadeWeight * 0.25);
    runningFcf = runningFcf * (1 + effectiveG);
    const discountedFcf = runningFcf / Math.pow(1 + wacc, year);
    pvCashFlows += discountedFcf;

    projectedCashFlows.push({
      year,
      fcf: round(runningFcf, 1),
      discountedFcf: round(discountedFcf, 1),
    });
  }

  const terminalValue = (runningFcf * (1 + gTerm)) / (wacc - gTerm);
  const terminalValuePv = terminalValue / Math.pow(1 + wacc, years);

  const enterpriseValue = pvCashFlows + terminalValuePv;
  const netCash = latestQ.cashAndEquivalents - latestQ.totalDebt;
  const equityValue = Math.max(1, enterpriseValue + netCash);
  const shares = Math.max(0.1, latestQ.sharesOutstanding);

  const intrinsicValuePerShare = round(equityValue / shares, 2);
  const upsidePct =
    currentPrice > 0 ? round(((intrinsicValuePerShare - currentPrice) / currentPrice) * 100, 2) : 0;
  const marginOfSafetyPct =
    intrinsicValuePerShare > 0
      ? round(((intrinsicValuePerShare - currentPrice) / intrinsicValuePerShare) * 100, 2)
      : 0;

  return {
    intrinsicValuePerShare,
    currentPrice: round(currentPrice, 2),
    marginOfSafetyPct,
    upsidePct,
    projectedCashFlows,
    terminalValuePv: round(terminalValuePv, 1),
    equityValue: round(equityValue, 1),
  };
}
