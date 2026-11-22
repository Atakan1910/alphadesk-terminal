import {
  Activity,
  Briefcase,
  LayoutGrid,
  LineChart,
  PanelLeft,
  RefreshCw,
  Settings,
} from 'lucide-react';
import type { DataSourceMode, MacroTicker, RemoteSearchItem, StockAsset } from '../../types/market';
import { CommandSearch } from './CommandSearch';

export type WorkspaceMode = 'STOCK' | 'MARKET' | 'PORTFOLIO';

interface TopTickerProps {
  tickers: MacroTicker[];
  assets: StockAsset[];
  workspace: WorkspaceMode;
  onWorkspaceChange: (mode: WorkspaceMode) => void;
  activeDataSource: DataSourceMode;
  generatedAt: string | null;
  workerUrl: string;
  loadingRemoteSymbol: string | null;
  isLoading: boolean;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  onSelectSymbol: (symbol: string) => void;
  onLoadRemoteStock: (item: RemoteSearchItem) => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

const WORKSPACES: { id: WorkspaceMode; label: string; icon: typeof LineChart }[] = [
  { id: 'STOCK', label: 'Hisse', icon: LineChart },
  { id: 'MARKET', label: 'Piyasa', icon: LayoutGrid },
  { id: 'PORTFOLIO', label: 'Portföy', icon: Briefcase },
];

export function TopTicker({
  tickers,
  assets,
  workspace,
  onWorkspaceChange,
  activeDataSource,
  generatedAt,
  workerUrl,
  loadingRemoteSymbol,
  isLoading,
  sidebarVisible,
  onToggleSidebar,
  onSelectSymbol,
  onLoadRemoteStock,
  onRefresh,
  onOpenSettings,
}: TopTickerProps) {
  const isLive = activeDataSource !== 'SEED';
  const sourceLabel =
    activeDataSource === 'CLOUDFLARE_WORKER'
      ? 'Canlı Proxy'
      : activeDataSource === 'PIPELINE_JSON'
        ? 'Gerçek Veri'
        : activeDataSource === 'SEED'
          ? 'Yerel Yedek'
          : 'Canlı API';

  return (
    <header className="border-b border-[#27272a] bg-[#111113] shrink-0">
      {/* İnce Makro Endeks Bandı */}
      <div className="flex items-center justify-between gap-4 px-4 py-1.5 border-b border-[#27272a]/80 bg-[#09090b] overflow-x-auto">
        <div className="flex items-center gap-5 shrink-0">
          {tickers.map((t) => (
            <div
              key={t.symbol}
              className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums whitespace-nowrap"
            >
              <span className="text-zinc-500">{t.label}</span>
              <span className="text-zinc-200">
                {t.prefix ?? ''}
                {t.price.toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className={t.changePct >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'}>
                {t.changePct >= 0 ? '+' : ''}
                {t.changePct.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] font-mono tabular-nums text-zinc-500 shrink-0">
          <span
            className={`w-1.5 h-1.5 ${isLive ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`}
            title={generatedAt ?? undefined}
          />
          <span className={isLive ? 'text-zinc-300' : 'text-[#f59e0b]'}>{sourceLabel}</span>
          {generatedAt && activeDataSource === 'PIPELINE_JSON' && (
            <span className="text-zinc-600">· {generatedAt.slice(0, 10)}</span>
          )}
        </div>
      </div>

      {/* Ana Ergonomik Üst Bar */}
      <div className="flex items-center justify-between gap-3 px-4 h-14">
        {/* Sol: Liste Toggle + Marka */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            title={sidebarVisible ? 'Hisse Listesini Gizle' : 'Hisse Listesini Göster'}
            className={`p-2 border transition-colors ${
              sidebarVisible
                ? 'border-zinc-600 bg-[#18181b] text-zinc-100'
                : 'border-[#27272a] bg-[#09090b] text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <PanelLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={() => onWorkspaceChange('STOCK')}
            className="flex items-center gap-2 text-left"
          >
            <Activity className="w-4 h-4 text-[#f59e0b]" strokeWidth={1.5} />
            <span className="text-sm font-semibold tracking-wider uppercase text-zinc-100 hidden sm:inline">
              AlphaDesk
            </span>
          </button>
        </div>

        {/* Merkez: Global Komut Arama (Ctrl+K) */}
        <CommandSearch
          assets={assets}
          workerUrl={workerUrl}
          loadingRemoteSymbol={loadingRemoteSymbol}
          onSelectSymbol={onSelectSymbol}
          onLoadRemoteStock={onLoadRemoteStock}
          onOpenSettings={onOpenSettings}
        />

        {/* Sağ: 3 Temiz Çalışma Alanı + Araçlar */}
        <div className="flex items-center gap-1.5 shrink-0">
          <nav className="flex items-center border border-[#27272a] bg-[#09090b] p-0.5">
            {WORKSPACES.map((item) => {
              const Icon = item.icon;
              const active = workspace === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onWorkspaceChange(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                    active
                      ? 'bg-[#18181b] text-zinc-100 font-medium'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${active ? 'text-[#f59e0b]' : 'text-zinc-500'}`}
                    strokeWidth={1.5}
                  />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Verileri Yenile"
            className="p-2 border border-[#27272a] bg-[#09090b] hover:border-zinc-500 text-zinc-400 hover:text-zinc-100 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
              strokeWidth={1.5}
            />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            title="Proxy ve Veri Ayarları"
            className="p-2 border border-[#27272a] bg-[#09090b] hover:border-zinc-500 text-zinc-400 hover:text-zinc-100"
          >
            <Settings className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
