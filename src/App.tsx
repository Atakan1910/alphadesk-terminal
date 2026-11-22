import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LogicalRange } from 'lightweight-charts';
import { AlertTriangle, Briefcase, FlaskConical, Newspaper, Star } from 'lucide-react';
import { DcfCalculator } from './components/analysis/DcfCalculator';
import { FundamentalXRay } from './components/analysis/FundamentalXRay';
import { TechnicalConsensus } from './components/analysis/TechnicalConsensus';
import {
  IndicatorToolbar,
  type OverlayConfig,
  type SubChartKey,
} from './components/chart/IndicatorToolbar';
import { ProChart } from './components/chart/ProChart';
import { SubChartPanel } from './components/chart/SubChartPanel';
import { MultiHorizonForecast } from './components/forecast/MultiHorizonForecast';
import { SettingsModal } from './components/layout/SettingsModal';
import { SidebarWatchlist } from './components/layout/SidebarWatchlist';
import { TopTicker, type TerminalTab } from './components/layout/TopTicker';
import { BacktestLab } from './components/portfolio/BacktestLab';
import { PortfolioRiskPanel } from './components/portfolio/PortfolioRiskPanel';
import { ScreenerHeatmap } from './components/portfolio/ScreenerHeatmap';
import { HybridMarketDataAdapter } from './data/dataAdapter';
import { getMacroTickers } from './data/seedMarketData';
import { computeMultiHorizonForecast } from './engine/forecastEngine';
import {
  calculateDcfValuation,
  computeFundamentalMetrics,
  getDefaultDcfInput,
} from './engine/fundamentalScoring';
import { computeTechnicalSnapshot } from './engine/technicalIndicators';
import { useTerminalStore } from './hooks/useTerminalStore';
import type { MacroTicker, StockAsset } from './types/market';

const DEFAULT_OVERLAYS: OverlayConfig = {
  ema9: false,
  ema21: false,
  ema50: false,
  ema200: false,
  sma20: false,
  bollinger: false,
  vwap: false,
  sr: false,
  fibonacci: false,
};

export default function App() {
  const store = useTerminalStore();

  const [assets, setAssets] = useState<StockAsset[]>(() =>
    HybridMarketDataAdapter.getAllSeedAssets()
  );
  const [tickers, setTickers] = useState<MacroTicker[]>(() => getMacroTickers());
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [pipelineActive, setPipelineActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiWarning, setApiWarning] = useState<string | null>(null);
  const [liveOverride, setLiveOverride] = useState<StockAsset | null>(null);

  const [activeTab, setActiveTab] = useState<TerminalTab>('CHART');
  const [labSubTab, setLabSubTab] = useState<'PORTFOLIO' | 'BACKTEST'>('PORTFOLIO');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [overlays, setOverlays] = useState<OverlayConfig>(DEFAULT_OVERLAYS);
  const [subCharts, setSubCharts] = useState<SubChartKey[]>([]);
  const [syncedRange, setSyncedRange] = useState<LogicalRange | null>(null);

  const loadUniverse = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    if (forceRefresh) {
      try {
        await fetch('/api/run-etl', { method: 'POST' });
      } catch {
        // Statik sunucuda veya dev server dışındaysa hata fırlatmadan devam et
      }
    }
    const result = await HybridMarketDataAdapter.loadAllAssets(forceRefresh);
    setAssets(result.assets);
    setTickers(result.macro);
    setGeneratedAt(result.generatedAt);
    setPipelineActive(result.pipelineActive);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    HybridMarketDataAdapter.loadAllAssets(false).then((result) => {
      if (!active) return;
      setAssets(result.assets);
      setTickers(result.macro);
      setGeneratedAt(result.generatedAt);
      setPipelineActive(result.pipelineActive);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const hasLiveApi =
    store.apiSettings.provider !== 'NONE' && Boolean(store.apiSettings.apiKey.trim());

  useEffect(() => {
    let active = true;
    if (!hasLiveApi) {
      return;
    }

    HybridMarketDataAdapter.loadAsset(store.activeSymbol, store.apiSettings).then((res) => {
      if (!active) return;
      setLiveOverride(res.asset);
      setApiWarning(res.warning);
    });

    return () => {
      active = false;
    };
  }, [store.activeSymbol, store.apiSettings, hasLiveApi]);

  const activeAsset = useMemo(() => {
    if (hasLiveApi && liveOverride && liveOverride.symbol === store.activeSymbol) {
      return liveOverride;
    }
    return assets.find((a) => a.symbol === store.activeSymbol) ?? assets[0];
  }, [assets, hasLiveApi, liveOverride, store.activeSymbol]);

  const activeApiWarning = hasLiveApi ? apiWarning : null;

  const technical = useMemo(
    () => computeTechnicalSnapshot(activeAsset.bars),
    [activeAsset.bars]
  );

  const fundamental = useMemo(
    () => computeFundamentalMetrics(activeAsset),
    [activeAsset]
  );

  const dcf = useMemo(
    () => calculateDcfValuation(activeAsset, getDefaultDcfInput(activeAsset)),
    [activeAsset]
  );

  const forecast = useMemo(
    () =>
      computeMultiHorizonForecast(
        activeAsset,
        technical,
        activeAsset.quarters.length > 0 ? dcf.intrinsicValuePerShare : undefined
      ),
    [activeAsset, technical, dcf.intrinsicValuePerShare]
  );

  const usdTryRate = useMemo(() => {
    const found = tickers.find((t) => t.symbol === 'USDTRY');
    return found && found.price > 0 ? found.price : 36.42;
  }, [tickers]);

  const handleJumpToStock = useCallback(
    (symbol: string) => {
      store.setActiveSymbol(symbol);
      setActiveTab('CHART');
    },
    [store]
  );

  const toggleOverlay = (key: keyof OverlayConfig) => {
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSubChart = (key: SubChartKey) => {
    setSubCharts((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const lastBar = activeAsset.bars[activeAsset.bars.length - 1];
  const prevBar = activeAsset.bars[activeAsset.bars.length - 2] ?? lastBar;
  const dailyDiff = lastBar.close - prevBar.close;
  const dailyPct = prevBar.close > 0 ? (dailyDiff / prevBar.close) * 100 : 0;
  const isWatched = store.watchlist.includes(activeAsset.symbol);
  const currencySymbol = activeAsset.currency === 'TRY' ? '₺' : '$';

  const showStockHeader = activeTab !== 'SCREENER';

  return (
    <div className="h-screen flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden">
      <TopTicker
        tickers={tickers}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pipelineActive={pipelineActive}
        activeDataSource={activeAsset.dataSource}
        generatedAt={generatedAt}
        isLoading={isLoading}
        onRefresh={() => void loadUniverse(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <SidebarWatchlist
          assets={assets}
          activeSymbol={activeAsset.symbol}
          watchlist={store.watchlist}
          onSelectSymbol={store.setActiveSymbol}
          onToggleWatchlist={store.toggleWatchlist}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Ferah Hisse Başlığı + 3 Hızlı Özet Kartı */}
          {showStockHeader && (
            <div className="px-5 py-4 border-b border-[#27272a] bg-[#111113] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => store.toggleWatchlist(activeAsset.symbol)}
                    className="p-2 border border-[#27272a] bg-[#09090b] hover:border-[#f59e0b]"
                    title={isWatched ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        isWatched ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-zinc-500'
                      }`}
                      strokeWidth={1.5}
                    />
                  </button>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-lg font-mono font-semibold text-zinc-100">
                        {activeAsset.symbol}
                      </h1>
                      <span className="text-sm text-zinc-300">{activeAsset.name}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {activeAsset.market === 'BIST' ? 'Borsa İstanbul' : 'ABD Borsası'} ·{' '}
                      {activeAsset.sector} · Son veri: {activeAsset.lastUpdated}
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono tabular-nums">
                  <div className="text-2xl font-semibold text-zinc-100">
                    {currencySymbol}
                    {lastBar.close.toFixed(2)}
                  </div>
                  <div
                    className={`text-xs mt-0.5 ${
                      dailyPct >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
                    }`}
                  >
                    {dailyDiff >= 0 ? '+' : ''}
                    {dailyDiff.toFixed(2)} ({dailyPct >= 0 ? '+' : ''}
                    {dailyPct.toFixed(2)}%)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('CHART')}
                  className="text-left border border-[#27272a] bg-[#09090b] hover:border-zinc-500 px-3.5 py-2.5 transition-colors"
                >
                  <div className="text-[11px] text-zinc-500">Teknik Görünüm</div>
                  <div className="mt-1 flex items-baseline justify-between font-mono tabular-nums">
                    <span
                      className={`text-sm font-semibold ${
                        technical.consensusScore >= 58
                          ? 'text-[#10b981]'
                          : technical.consensusScore <= 42
                            ? 'text-[#f43f5e]'
                            : 'text-[#f59e0b]'
                      }`}
                    >
                      {technical.rating}
                    </span>
                    <span className="text-xs text-zinc-400">{technical.consensusScore}/100</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('FUNDAMENTALS')}
                  className="text-left border border-[#27272a] bg-[#09090b] hover:border-zinc-500 px-3.5 py-2.5 transition-colors"
                >
                  <div className="text-[11px] text-zinc-500">Şirket Sağlığı & Değerleme</div>
                  <div className="mt-1 flex items-baseline justify-between font-mono tabular-nums">
                    <span className="text-sm font-semibold text-zinc-100">
                      {activeAsset.quarters.length > 0
                        ? `F-Score ${fundamental.piotroski.score}/9 (${fundamental.piotroski.grade})`
                        : 'Bilanço Yok'}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {fundamental.pe ? `F/K ${fundamental.pe}x` : 'Detay →'}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('FORECAST')}
                  className="text-left border border-[#27272a] bg-[#09090b] hover:border-zinc-500 px-3.5 py-2.5 transition-colors"
                >
                  <div className="text-[11px] text-zinc-500">12 Aylık İstatistiksel Medyan</div>
                  <div className="mt-1 flex items-baseline justify-between font-mono tabular-nums">
                    <span className="text-sm font-semibold text-[#f59e0b]">
                      {currencySymbol}
                      {forecast.longTerm.baseTarget12M.toFixed(2)}
                    </span>
                    <span className="text-xs text-zinc-400">
                      T+1 Yön: %{forecast.daily.bullishProbabilityPct}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {activeApiWarning && (
            <div className="flex items-center gap-2 px-5 py-2 bg-[#f59e0b]/10 border-b border-[#f59e0b]/30 text-xs text-[#f59e0b]">
              <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>{activeApiWarning}</span>
            </div>
          )}

          {/* SEKME 1: GRAFİK & TEKNİK ANALİZ */}
          {activeTab === 'CHART' && (
            <div className="flex-1 flex flex-col">
              <IndicatorToolbar
                timeframe={store.timeframe}
                onTimeframeChange={store.setTimeframe}
                overlays={overlays}
                onToggleOverlay={toggleOverlay}
                activeSubCharts={subCharts}
                onToggleSubChart={toggleSubChart}
              />

              <ProChart
                symbol={activeAsset.symbol}
                currency={activeAsset.currency}
                bars={activeAsset.bars}
                technical={technical}
                timeframe={store.timeframe}
                overlays={overlays}
                onVisibleRangeChange={setSyncedRange}
              />

              {subCharts.map((sc) => (
                <SubChartPanel
                  key={sc}
                  type={sc}
                  bars={activeAsset.bars}
                  technical={technical}
                  visibleRange={syncedRange}
                />
              ))}

              <div className="p-5 space-y-5 max-w-6xl w-full mx-auto">
                <TechnicalConsensus technical={technical} />

                {activeAsset.news.length > 0 && (
                  <section className="border border-[#27272a] bg-[#111113] p-5 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                      <Newspaper className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                      <span>Öne Çıkan KAP & Haber Katalizörleri</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {activeAsset.news.map((item) => (
                        <div
                          key={item.id}
                          className="border border-[#27272a] bg-[#09090b] p-3 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                            <span>
                              {item.source} · {item.date}
                            </span>
                            <span
                              className={
                                item.impact === 'POSITIVE'
                                  ? 'text-[#10b981]'
                                  : item.impact === 'NEGATIVE'
                                    ? 'text-[#f43f5e]'
                                    : 'text-zinc-400'
                              }
                            >
                              {item.impact === 'POSITIVE'
                                ? 'Olumlu'
                                : item.impact === 'NEGATIVE'
                                  ? 'Olumsuz'
                                  : 'Nötr'}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed">{item.title}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          )}

          {/* SEKME 2: ŞİRKET RÖNTGENİ & TEMEL ANALİZ */}
          {activeTab === 'FUNDAMENTALS' && (
            <div className="p-5 space-y-5 max-w-6xl w-full mx-auto">
              <FundamentalXRay asset={activeAsset} metrics={fundamental} />
              <DcfCalculator key={activeAsset.symbol} asset={activeAsset} />
            </div>
          )}

          {/* SEKME 3: TAHMİN MERKEZİ */}
          {activeTab === 'FORECAST' && (
            <div className="p-5 max-w-6xl w-full mx-auto">
              <MultiHorizonForecast
                asset={activeAsset}
                forecast={forecast}
                dcfIntrinsic={
                  activeAsset.quarters.length > 0 ? dcf.intrinsicValuePerShare : undefined
                }
              />
            </div>
          )}

          {/* SEKME 4: TARAYICI & SEKTÖR ISI HARİTASI */}
          {activeTab === 'SCREENER' && (
            <div className="p-5 max-w-7xl w-full mx-auto">
              <ScreenerHeatmap assets={assets} onSelectStock={handleJumpToStock} />
            </div>
          )}

          {/* SEKME 5: BACKTEST & PORTFÖY RİSK LABORATUVARI */}
          {activeTab === 'PORTFOLIO' && (
            <div className="p-5 space-y-4 max-w-6xl w-full mx-auto">
              <div className="flex items-center gap-2 border-b border-[#27272a] pb-3">
                <button
                  type="button"
                  onClick={() => setLabSubTab('PORTFOLIO')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs border transition-colors ${
                    labSubTab === 'PORTFOLIO'
                      ? 'border-[#f59e0b] bg-[#18181b] text-zinc-100 font-medium'
                      : 'border-[#27272a] bg-[#111113] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Sanal Portföy & Risk ({store.portfolio.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLabSubTab('BACKTEST')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs border transition-colors ${
                    labSubTab === 'BACKTEST'
                      ? 'border-[#f59e0b] bg-[#18181b] text-zinc-100 font-medium'
                      : 'border-[#27272a] bg-[#111113] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Strateji Backtest ({activeAsset.symbol})</span>
                </button>
              </div>

              {labSubTab === 'PORTFOLIO' ? (
                <PortfolioRiskPanel
                  assets={assets}
                  positions={store.portfolio}
                  usdTryRate={usdTryRate}
                  onAddPosition={store.addPosition}
                  onRemovePosition={store.removePosition}
                  onClearPortfolio={store.clearPortfolio}
                  onLoadSample={() => store.loadSamplePortfolio(assets)}
                  onExportJson={store.exportPortfolioJson}
                  onImportJson={store.importPortfolioJson}
                  onSelectStock={handleJumpToStock}
                />
              ) : (
                <BacktestLab asset={activeAsset} />
              )}
            </div>
          )}
        </main>
      </div>

      <SettingsModal
        open={settingsOpen}
        settings={store.apiSettings}
        pipelineActive={pipelineActive}
        generatedAt={generatedAt}
        onSave={store.setApiSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
