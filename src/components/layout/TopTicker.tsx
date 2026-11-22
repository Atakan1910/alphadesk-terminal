import {
  Activity,
  BarChart2,
  Briefcase,
  Cpu,
  LayoutGrid,
  Menu,
  Radio,
  RefreshCw,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import type { DataSourceMode, MacroTicker } from '../../types/market';

export type TerminalTab = 'CHART' | 'FUNDAMENTALS' | 'FORECAST' | 'SCREENER' | 'PORTFOLIO';

interface TopTickerProps {
  tickers: MacroTicker[];
  activeTab: TerminalTab;
  onTabChange: (tab: TerminalTab) => void;
  pipelineActive: boolean;
  activeDataSource: DataSourceMode;
  generatedAt: string | null;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onToggleMobileSidebar: () => void;
}

const NAV_TABS: { id: TerminalTab; label: string; icon: typeof BarChart2 }[] = [
  { id: 'CHART', label: 'Grafik & Teknik', icon: BarChart2 },
  { id: 'FUNDAMENTALS', label: 'Şirket Röntgeni', icon: ShieldCheck },
  { id: 'FORECAST', label: 'Tahmin Merkezi', icon: Cpu },
  { id: 'SCREENER', label: 'Tarayıcı & Isı Haritası', icon: LayoutGrid },
  { id: 'PORTFOLIO', label: 'Backtest & Portföy', icon: Briefcase },
];

function formatShortUtc(iso: string | null): string {
  if (!iso) return 'Yerel';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  return `${d.toISOString().slice(5, 16).replace('T', ' ')} UTC`;
}

export function TopTicker({
  tickers,
  activeTab,
  onTabChange,
  pipelineActive,
  activeDataSource,
  generatedAt,
  isLoading,
  onRefresh,
  onOpenSettings,
  onToggleMobileSidebar,
}: TopTickerProps) {
  const isLive = activeDataSource !== 'SEED';

  return (
    <header className="border-b border-[#27272a] bg-[#111113] shrink-0">
      {/* Üst Makro Ticker Şeridi */}
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-[#27272a] bg-[#09090b] overflow-x-auto">
        <div className="flex items-center gap-4 shrink-0">
          {tickers.map((t) => (
            <div
              key={t.symbol}
              className="flex items-center gap-2 text-[11px] font-mono tabular-nums whitespace-nowrap"
            >
              <span className="text-zinc-500 uppercase tracking-wide">{t.label}</span>
              <span className="text-zinc-200 font-medium">
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

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 border text-[10px] font-mono tabular-nums ${
              isLive
                ? 'border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]'
                : 'border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#f59e0b]'
            }`}
          >
            <Radio className="w-3 h-3" strokeWidth={1.5} />
            <span>
              {activeDataSource}
              {pipelineActive && activeDataSource === 'PIPELINE_JSON'
                ? ` · ${formatShortUtc(generatedAt)}`
                : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Veriyi Yenile"
            className="p-1 border border-[#27272a] bg-[#111113] hover:border-zinc-500 text-zinc-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            title="API & Veri Ayarları"
            className="flex items-center gap-1.5 px-2 py-1 border border-[#27272a] bg-[#111113] hover:border-zinc-500 text-[11px] text-zinc-300"
          >
            <Settings className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden md:inline">Ayarlar</span>
          </button>
        </div>
      </div>

      {/* Marka + Ana Terminal Sekme Navigasyonu */}
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-1.5 border border-[#27272a] bg-[#18181b] text-zinc-300 hover:border-zinc-500"
            aria-label="Hisse Listesini Aç"
          >
            <Menu className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#f59e0b]" strokeWidth={1.5} />
            <div className="leading-none">
              <span className="text-xs font-semibold tracking-widest uppercase text-zinc-100">
                AlphaDesk
              </span>
              <span className="ml-1.5 text-[10px] font-mono uppercase text-zinc-500 hidden sm:inline">
                QUANT TERMINAL
              </span>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs border whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-[#f59e0b] bg-[#18181b] text-zinc-100 font-medium'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]/60'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${isActive ? 'text-[#f59e0b]' : 'text-zinc-500'}`}
                  strokeWidth={1.5}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
