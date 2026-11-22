import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LogicalRange } from 'lightweight-charts';
import { AlertTriangle, Newspaper } from 'lucide-react';
import { DcfCalculator } from './components/analysis/DcfCalculator';
import { FundamentalXRay } from './components/analysis/FundamentalXRay';
import { TechnicalConsensus } from './components/analysis/TechnicalConsensus';
import type { OverlayConfig, SubChartKey } from './components/chart/IndicatorToolbar';
import { ProChart } from './components/chart/ProChart';
import { SubChartPanel } from './components/chart/SubChartPanel';
import { MultiHorizonForecast } from './components/forecast/MultiHorizonForecast';
import { SettingsModal } from './components/layout/SettingsModal';
import { SidebarWatchlist } from './components/layout/SidebarWatchlist';
import { StockStatsRail } from './components/layout/StockStatsRail';
import { TopTicker, type WorkspaceMode } from './components/layout/TopTicker';
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
import type { MacroTicker, RemoteSearchItem, StockAsset } from './types/market';

type StockSubTab = 'OVERVIEW' | 'FUNDAMENTALS' | 'FORECAST' | 'BACKTEST';

const STOCK_SUB_TABS: { id: StockSubTab; label: string }[] = [
  { id: 'OVERVIEW', label: 'Genel Bakış & Teknik' },
  { id: 'FUNDAMENTALS', label: 'Finansallar & DCF' },
  { id: 'FORECAST', label: 'Fiyat Tahmini' },
  { id: 'BACKTEST', label: 'Strateji Testi' },
];

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
  const [loadingRemoteSymbol, setLoadingRemoteSymbol] = useState<string | null>(null);

  const [workspace, setWorkspace] = useState<WorkspaceMode>('STOCK');
  const [stockSubTab, setStockSubTab] = useState<StockSubTab>('OVERVIEW');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : false
  );

  const [overlays, setOverlays] = useState<OverlayConfig>(DEFAULT_OVERLAYS);
  const [subCharts, setSubCharts] = useState<SubChartKey[]>([]);
  const [syncedRange, setSyncedRange] = useState<LogicalRange | null>(null);

  const loadUniverse = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
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

  const isApiConfigured =
    store.apiSettings.provider !== 'NONE' && Boolean(store.apiSettings.apiKey.trim());

  useEffect(() => {
    let active = true;
    if (!isApiConfigured) {
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
  }, [store.activeSymbol, store.apiSettings, isApiConfigured]);

  const activeAsset = useMemo(() => {
    if (isApiConfigured && liveOverride && liveOverride.symbol === store.activeSymbol) {
      return liveOverride;
    }
    return assets.find((a) => a.symbol === store.activeSymbol) ?? assets[0];
  }, [assets, liveOverride, store.activeSymbol, isApiConfigured]);

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

  const activePosition = useMemo(
    () => store.portfolio.find((p) => p.symbol === activeAsset.symbol),
    [store.portfolio, activeAsset.symbol]
  );

  const handleSelectStock = useCallback(
    (symbol: string) => {
      store.setActiveSymbol(symbol);
      setWorkspace('STOCK');
    },
    [store]
  );

  const handleLoadRemoteStock = useCallback(
    async (item: RemoteSearchItem) => {
      if (!store.apiSettings.workerUrl.trim()) return;
      setLoadingRemoteSymbol(item.yfSymbol);
      setApiWarning(null);
      const fetched = await HybridMarketDataAdapter.fetchRemoteStock(
        item.yfSymbol,
        store.apiSettings.workerUrl,
        item
      );
      setLoadingRemoteSymbol(null);

      if (!fetched) {
        setApiWarning(
          `${item.yfSymbol} verisi alınamadı. Sembolü veya Cloudflare Worker adresini kontrol edin.`
        );
        return;
      }

      setAssets((prev) => {
        const idx = prev.findIndex((a) => a.symbol === fetched.symbol);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = fetched;
          return copy;
        }
        return [fetched, ...prev];
      });
      store.setActiveSymbol(fetched.symbol);
      setWorkspace('STOCK');
      setStockSubTab('OVERVIEW');
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

  const isWatched = store.watchlist.includes(activeAsset.symbol);

  return (
    <div className="h-screen flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden">
      <TopTicker
        tickers={tickers}
        assets={assets}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        activeDataSource={activeAsset.dataSource}
        generatedAt={generatedAt}
        workerUrl={store.apiSettings.workerUrl}
        loadingRemoteSymbol={loadingRemoteSymbol}
        isLoading={isLoading}
        sidebarVisible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible((v) => !v)}
        onSelectSymbol={handleSelectStock}
        onLoadRemoteStock={(item) => void handleLoadRemoteStock(item)}
        onRefresh={() => void loadUniverse(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <SidebarWatchlist
          assets={assets}
          activeSymbol={activeAsset.symbol}
          watchlist={store.watchlist}
          visible={sidebarVisible}
          onSelectSymbol={handleSelectStock}
          onToggleWatchlist={store.toggleWatchlist}
          onClose={() => setSidebarVisible(false)}
        />

        <main className="flex-1 min-w-0 overflow-y-auto">
          {apiWarning && (
            <div className="flex items-center gap-2 px-5 py-2 bg-[#f59e0b]/10 border-b border-[#f59e0b]/30 text-xs text-[#f59e0b]">
              <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>{apiWarning}</span>
            </div>
          )}

          {/* ÇALIŞMA ALANI 1: HİSSE DETAY (2 SÜTUNLU ERGONOMİK DÜZEN) */}
          {workspace === 'STOCK' && (
            <div className="max-w-[1440px] mx-auto p-4 lg:p-6">
              <div className="flex flex-col xl:flex-row items-start gap-6">
                {/* Sol / Ana İçerik Akışı */}
                <div className="flex-1 min-w-0 w-full space-y-5">
                  <ProChart
                    asset={activeAsset}
                    technical={technical}
                    timeframe={store.timeframe}
                    onTimeframeChange={store.setTimeframe}
                    overlays={overlays}
                    onToggleOverlay={toggleOverlay}
                    activeSubCharts={subCharts}
                    onToggleSubChart={toggleSubChart}
                    isWatched={isWatched}
                    onToggleWatchlist={() => store.toggleWatchlist(activeAsset.symbol)}
                    onVisibleRangeChange={setSyncedRange}
                  />

                  {subCharts.length > 0 && (
                    <div className="border-x border-t border-[#27272a]">
                      {subCharts.map((sc) => (
                        <SubChartPanel
                          key={sc}
                          type={sc}
                          bars={activeAsset.bars}
                          technical={technical}
                          visibleRange={syncedRange}
                        />
                      ))}
                    </div>
                  )}

                  {/* Hisse İçi Bağlamsal Alt Sekmeler (Underline Stili) */}
                  <div className="border-b border-[#27272a] flex items-center gap-6 overflow-x-auto">
                    {STOCK_SUB_TABS.map((tab) => {
                      const active = stockSubTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setStockSubTab(tab.id)}
                          className={`pb-3 text-xs whitespace-nowrap border-b-2 transition-colors ${
                            active
                              ? 'border-[#f59e0b] text-zinc-100 font-medium'
                              : 'border-transparent text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Alt Sekme İçerikleri */}
                  {stockSubTab === 'OVERVIEW' && (
                    <div className="space-y-5">
                      <TechnicalConsensus technical={technical} />

                      {activeAsset.news.length > 0 && (
                        <section className="border border-[#27272a] bg-[#111113] p-5 space-y-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                            <Newspaper className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                            <span>KAP & Haber Akışı</span>
                          </div>
                          <div className="divide-y divide-[#27272a]/70">
                            {activeAsset.news.map((item) => (
                              <div key={item.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
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
                                <p className="text-xs text-zinc-300 leading-relaxed">
                                  {item.title}
                                </p>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  )}

                  {stockSubTab === 'FUNDAMENTALS' && (
                    <div className="space-y-5">
                      <FundamentalXRay asset={activeAsset} metrics={fundamental} />
                      <DcfCalculator key={activeAsset.symbol} asset={activeAsset} />
                    </div>
                  )}

                  {stockSubTab === 'FORECAST' && (
                    <MultiHorizonForecast
                      asset={activeAsset}
                      forecast={forecast}
                      dcfIntrinsic={
                        activeAsset.quarters.length > 0 ? dcf.intrinsicValuePerShare : undefined
                      }
                    />
                  )}

                  {stockSubTab === 'BACKTEST' && <BacktestLab asset={activeAsset} />}
                </div>

                {/* Sağ İstatistik, Aralık & Hızlı Portföy Sütunu */}
                <StockStatsRail
                  asset={activeAsset}
                  technical={technical}
                  fundamental={fundamental}
                  forecast={forecast}
                  position={activePosition}
                  onAddPosition={store.addPosition}
                  onNavigateSubTab={setStockSubTab}
                  onOpenPortfolio={() => setWorkspace('PORTFOLIO')}
                />
              </div>
            </div>
          )}

          {/* ÇALIŞMA ALANI 2: PİYASA TARAYICI & ISI HARİTASI */}
          {workspace === 'MARKET' && (
            <div className="max-w-[1440px] mx-auto p-4 lg:p-6">
              <ScreenerHeatmap assets={assets} onSelectStock={handleSelectStock} />
            </div>
          )}

          {/* ÇALIŞMA ALANI 3: PORTFÖY & RİSK PANELİ */}
          {workspace === 'PORTFOLIO' && (
            <div className="max-w-6xl mx-auto p-4 lg:p-6">
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
                onSelectStock={handleSelectStock}
              />
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
