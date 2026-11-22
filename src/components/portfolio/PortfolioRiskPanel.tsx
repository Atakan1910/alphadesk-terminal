import { useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  Download,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { computePortfolioRisk } from '../../engine/backtestEngine';
import type { PortfolioPosition, StockAsset } from '../../types/market';

interface PortfolioRiskPanelProps {
  assets: StockAsset[];
  positions: PortfolioPosition[];
  usdTryRate: number;
  onAddPosition: (symbol: string, quantity: number, avgCost: number) => void;
  onRemovePosition: (id: string) => void;
  onClearPortfolio: () => void;
  onLoadSample: () => void;
  onExportJson: () => string;
  onImportJson: (raw: string) => { ok: boolean; error?: string };
  onSelectStock: (symbol: string) => void;
}

const SECTOR_COLORS = [
  '#f59e0b',
  '#10b981',
  '#38bdf8',
  '#a855f7',
  '#f43f5e',
  '#e4e4e7',
  '#2dd4bf',
  '#fb923c',
];

export function PortfolioRiskPanel({
  assets,
  positions,
  usdTryRate,
  onAddPosition,
  onRemovePosition,
  onClearPortfolio,
  onLoadSample,
  onExportJson,
  onImportJson,
  onSelectStock,
}: PortfolioRiskPanelProps) {
  const defaultSymbol = assets[0]?.symbol ?? 'THYAO';
  const [symbol, setSymbol] = useState<string>(defaultSymbol);
  const [quantity, setQuantity] = useState<string>('100');
  const [avgCost, setAvgCost] = useState<string>(() => {
    const first = assets[0];
    const last = first?.bars[first.bars.length - 1]?.close ?? 0;
    return last > 0 ? last.toFixed(2) : '';
  });
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const summary = useMemo(
    () => computePortfolioRisk(positions, assets, usdTryRate),
    [positions, assets, usdTryRate]
  );

  const selectedAsset = useMemo(
    () => assets.find((a) => a.symbol === symbol) ?? assets[0],
    [assets, symbol]
  );

  const handleSymbolChange = (nextSym: string) => {
    setSymbol(nextSym);
    const found = assets.find((a) => a.symbol === nextSym);
    const lastPrice = found?.bars[found.bars.length - 1]?.close;
    if (lastPrice && lastPrice > 0) {
      setAvgCost(lastPrice.toFixed(2));
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    const cost = Number(avgCost);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(cost) || cost <= 0) {
      setStatusMsg('Lütfen geçerli adet ve alış maliyeti girin.');
      return;
    }
    onAddPosition(symbol, qty, cost);
    setStatusMsg(`${symbol} pozisyonu portföye eklendi.`);
  };

  const handleDownloadJson = () => {
    const content = onExportJson();
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alphadesk-portfoy-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg('Portföy ve izleme listesi JSON olarak indirildi.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const res = onImportJson(text);
      setStatusMsg(res.ok ? 'JSON yedeği başarıyla içe aktarıldı.' : res.error ?? 'Hata oluştu.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatTry = (val: number) =>
    `₺${val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      {/* Üst Başlık & JSON Araçları */}
      <section className="border border-[#27272a] bg-[#111113] p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#27272a] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#f59e0b]" strokeWidth={1.5} />
              <h2 className="text-sm font-semibold text-zinc-100">
                Sanal Portföy & Kantitatif Risk Analizi
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              BIST ve ABD hisselerinizi tek ekranda takip edin. ABD pozisyonları güncel USD/TRY (₺
              {usdTryRate.toFixed(2)}) kuruyla otomatik normalize edilir.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onLoadSample();
                setStatusMsg('Örnek karma portföy (BIST + ABD) yüklendi.');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#27272a] bg-[#09090b] hover:border-[#f59e0b] text-xs text-zinc-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#f59e0b]" strokeWidth={1.5} />
              <span>Örnek Portföy</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#27272a] bg-[#09090b] hover:border-zinc-500 text-xs text-zinc-300"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>JSON Dışa Aktar</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#27272a] bg-[#09090b] hover:border-zinc-500 text-xs text-zinc-300"
            >
              <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>İçe Aktar</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            {positions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClearPortfolio();
                  setStatusMsg('Portföy temizlendi.');
                }}
                className="px-2.5 py-1.5 border border-[#27272a] bg-[#09090b] hover:border-[#f43f5e] text-xs text-zinc-400 hover:text-[#f43f5e]"
              >
                Temizle
              </button>
            )}
          </div>
        </div>

        {/* Pozisyon Ekleme Formu */}
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
          <div className="sm:col-span-5">
            <label className="block text-[11px] text-zinc-400 mb-1">Hisse Seçimi</label>
            <select
              value={symbol}
              onChange={(e) => handleSymbolChange(e.target.value)}
              className="w-full bg-[#09090b] border border-[#27272a] focus:border-[#f59e0b] focus:outline-none px-2.5 py-2 text-xs font-mono text-zinc-100"
            >
              {assets.map((a) => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol} — {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] text-zinc-400 mb-1">Adet</label>
            <input
              type="number"
              step="any"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-[#09090b] border border-[#27272a] focus:border-[#f59e0b] focus:outline-none px-2.5 py-2 text-xs font-mono tabular-nums text-zinc-100"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] text-zinc-400 mb-1">
              Alış Maliyeti ({selectedAsset?.currency ?? 'TRY'})
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              value={avgCost}
              onChange={(e) => setAvgCost(e.target.value)}
              className="w-full bg-[#09090b] border border-[#27272a] focus:border-[#f59e0b] focus:outline-none px-2.5 py-2 text-xs font-mono tabular-nums text-zinc-100"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 bg-zinc-100 text-zinc-950 hover:bg-white py-2 px-3 text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Ekle</span>
            </button>
          </div>
        </form>

        {statusMsg && (
          <div className="text-xs text-[#f59e0b] font-mono">{statusMsg}</div>
        )}
      </section>

      {summary.positions.length === 0 ? (
        <div className="border border-[#27272a] bg-[#111113] p-8 text-center space-y-3">
          <ShieldAlert className="w-6 h-6 text-zinc-500 mx-auto" strokeWidth={1.5} />
          <div className="text-sm text-zinc-200 font-medium">Portföyünüzde henüz pozisyon yok</div>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Yukarıdaki formdan kendi hisselerinizi ekleyin veya Beta, Sharpe Oranı ve %95 Riske
            Maruz Değer (VaR) analizini anında görmek için Örnek Portföy butonuna basın.
          </p>
        </div>
      ) : (
        <>
          {/* Portföy Risk KPI Kartları */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 font-mono tabular-nums">
            <div className="border border-[#27272a] bg-[#111113] p-4">
              <div className="text-[11px] font-sans text-zinc-400">Toplam Değer (TL)</div>
              <div className="text-lg font-semibold text-zinc-100 mt-1">
                {formatTry(summary.totalValueTry)}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                Maliyet: {formatTry(summary.totalCostTry)}
              </div>
            </div>

            <div className="border border-[#27272a] bg-[#111113] p-4">
              <div className="text-[11px] font-sans text-zinc-400">Toplam Kâr / Zarar</div>
              <div
                className={`text-lg font-semibold mt-1 ${
                  summary.totalPnlTry >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
                }`}
              >
                {summary.totalPnlTry >= 0 ? '+' : ''}
                {formatTry(summary.totalPnlTry)}
              </div>
              <div
                className={`text-[11px] mt-0.5 ${
                  summary.totalPnlPct >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
                }`}
              >
                {summary.totalPnlPct >= 0 ? '+' : ''}
                {summary.totalPnlPct.toFixed(2)}%
              </div>
            </div>

            <div className="border border-[#27272a] bg-[#111113] p-4">
              <div className="text-[11px] font-sans text-zinc-400">Portföy Beta</div>
              <div className="text-lg font-semibold text-zinc-100 mt-1">
                {summary.weightedBeta.toFixed(2)}
              </div>
              <div className="text-[10px] font-sans text-zinc-500 mt-0.5">
                {summary.weightedBeta > 1.15
                  ? 'Piyasadan agresif'
                  : summary.weightedBeta < 0.85
                    ? 'Defansif yapı'
                    : 'Piyasaya paralel'}
              </div>
            </div>

            <div className="border border-[#27272a] bg-[#111113] p-4">
              <div className="text-[11px] font-sans text-zinc-400">Sharpe / Yıllık Vol.</div>
              <div className="text-lg font-semibold text-[#f59e0b] mt-1">
                {summary.sharpeRatio.toFixed(2)}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                Oynaklık: %{summary.annualizedVolPct.toFixed(1)}
              </div>
            </div>

            <div className="col-span-2 lg:col-span-1 border border-[#f43f5e]/40 bg-[#111113] p-4">
              <div className="text-[11px] font-sans text-zinc-400">1G VaR (%95 Risk)</div>
              <div className="text-lg font-semibold text-[#f43f5e] mt-1">
                -{formatTry(summary.var95DailyTry)}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                Günlük -%{summary.var95DailyPct.toFixed(2)} eşik
              </div>
            </div>
          </div>

          {/* Sektör Dağılımı Şeridi */}
          <section className="border border-[#27272a] bg-[#111113] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-200">Sektör Dağılımı</span>
              <span className="font-mono text-zinc-500">
                {summary.sectorAllocation.length} Sektör
              </span>
            </div>

            <div className="flex h-2.5 w-full overflow-hidden border border-[#27272a] bg-[#09090b]">
              {summary.sectorAllocation.map((sec, idx) => (
                <div
                  key={sec.sector}
                  style={{
                    width: `${sec.weightPct}%`,
                    backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length],
                  }}
                  title={`${sec.sector}: %${sec.weightPct}`}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-mono tabular-nums">
              {summary.sectorAllocation.map((sec, idx) => (
                <div key={sec.sector} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 shrink-0"
                    style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }}
                  />
                  <span className="font-sans text-zinc-300">{sec.sector}</span>
                  <span className="text-zinc-500">%{sec.weightPct.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Pozisyon Tablosu */}
          <section className="border border-[#27272a] bg-[#111113] overflow-x-auto">
            <table className="w-full text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-[#27272a] bg-[#09090b] text-zinc-400 text-left">
                  <th className="px-3.5 py-2.5 font-sans font-medium">Hisse</th>
                  <th className="px-3 py-2.5 font-sans font-medium text-right">Adet</th>
                  <th className="px-3 py-2.5 font-sans font-medium text-right">Maliyet</th>
                  <th className="px-3 py-2.5 font-sans font-medium text-right">Güncel</th>
                  <th className="px-3 py-2.5 font-sans font-medium text-right">Değer (TL)</th>
                  <th className="px-3 py-2.5 font-sans font-medium text-right">Kâr / Zarar</th>
                  <th className="px-3 py-2.5 font-sans font-medium text-right">Ağırlık</th>
                  <th className="px-3 py-2.5 font-sans font-medium text-right">Sil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]/60">
                {summary.positions.map((item) => {
                  const sym = item.asset.currency === 'TRY' ? '₺' : '$';
                  return (
                    <tr key={item.position.id} className="hover:bg-[#18181b]/60">
                      <td className="px-3.5 py-2.5">
                        <button
                          type="button"
                          onClick={() => onSelectStock(item.asset.symbol)}
                          className="text-left hover:text-[#f59e0b]"
                        >
                          <div className="font-semibold text-zinc-100">{item.asset.symbol}</div>
                          <div className="font-sans text-[11px] text-zinc-500">
                            {item.asset.sector}
                          </div>
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-200">
                        {item.position.quantity}
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-400">
                        {sym}
                        {item.position.avgCost.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-100">
                        {sym}
                        {item.currentPrice.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-100">
                        {formatTry(item.marketValueTry)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right ${
                          item.pnl >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'
                        }`}
                      >
                        {item.pnl >= 0 ? '+' : ''}
                        {sym}
                        {item.pnl.toFixed(2)} ({item.pnlPct >= 0 ? '+' : ''}
                        {item.pnlPct.toFixed(2)}%)
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-400">
                        %{item.weightPct.toFixed(1)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onRemovePosition(item.position.id)}
                          title="Pozisyonu sil"
                          className="p-1 text-zinc-500 hover:text-[#f43f5e]"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
