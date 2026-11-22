import { useEffect, useState } from 'react';
import { KeyRound, ShieldAlert, X } from 'lucide-react';
import type { ApiSettings } from '../../types/market';

interface SettingsModalProps {
  open: boolean;
  settings: ApiSettings;
  pipelineActive: boolean;
  generatedAt: string | null;
  onSave: (next: ApiSettings) => void;
  onClose: () => void;
}

export function SettingsModal(props: SettingsModalProps) {
  if (!props.open) return null;
  return <SettingsModalDialog {...props} />;
}

function SettingsModalDialog({
  settings,
  pipelineActive,
  generatedAt,
  onSave,
  onClose,
}: SettingsModalProps) {
  const [provider, setProvider] = useState<ApiSettings['provider']>(settings.provider);
  const [apiKey, setApiKey] = useState<string>(settings.apiKey);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!open) return null;

  const handleSave = () => {
    onSave({ provider, apiKey: apiKey.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg border border-[#27272a] bg-[#111113] text-zinc-100">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#f59e0b]" strokeWidth={1.5} />
            <h2 className="text-xs font-semibold uppercase tracking-wider">
              Hibrit Veri Kaynağı & API Ayarları
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          <div className="border border-[#27272a] bg-[#09090b] p-3 space-y-1 font-mono tabular-nums">
            <div className="text-[11px] uppercase text-zinc-400">Varsayılan Veri Katmanı</div>
            <div className="text-zinc-200">
              {pipelineActive
                ? `PIPELINE_JSON Aktif · Son Güncelleme: ${generatedAt ?? '-'}`
                : 'SEED · Deterministik Yerel Motor (public/market-data.json bulunamadı)'}
            </div>
            <div className="text-[11px] text-zinc-500 font-sans">
              BIST ve Global hisseler varsayılan olarak GitHub Actions / yfinance ETL çıktısından
              okunur; erişilemezse sıfır kesintiyle yerel deterministik motora geçer.
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] uppercase text-zinc-400">
              Opsiyonel Canlı API Sağlayıcısı (ABD / Global)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'NONE', label: 'Kapalı (ETL/Seed)' },
                  { id: 'FINNHUB', label: 'Finnhub' },
                  { id: 'ALPHAVANTAGE', label: 'Alpha Vantage' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setProvider(opt.id)}
                  className={`py-2 px-2 border text-xs font-mono transition-colors ${
                    provider === opt.id
                      ? 'border-[#f59e0b] bg-[#18181b] text-zinc-100'
                      : 'border-[#27272a] bg-[#09090b] text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {provider !== 'NONE' && (
            <div className="space-y-1.5">
              <label className="block text-[11px] uppercase text-zinc-400">
                {provider} API Anahtarı (Sadece LocalStorage içinde saklanır)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Ücretsiz API anahtarınızı yapıştırın..."
                className="w-full bg-[#09090b] border border-[#27272a] focus:border-[#f59e0b] focus:outline-none px-3 py-2 text-xs font-mono text-zinc-100"
              />
            </div>
          )}

          <div className="flex items-start gap-2 border border-[#27272a] bg-[#18181b]/60 p-2.5 text-[11px] text-zinc-400">
            <ShieldAlert className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>
              API anahtarınız sunucuya gönderilmez, yalnızca tarayıcınızda saklanır. Rate-limit veya
              ağ hatasında sistem otomatik olarak ETL / yerel veriye geri döner.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#27272a] bg-[#09090b]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-[#27272a] text-xs text-zinc-300 hover:border-zinc-500"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-medium"
          >
            Kaydet ve Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
