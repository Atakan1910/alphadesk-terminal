import { useEffect, useState } from 'react';
import { Globe, KeyRound, ShieldAlert, X } from 'lucide-react';
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
  const [workerUrl, setWorkerUrl] = useState<string>(settings.workerUrl);
  const [provider, setProvider] = useState<ApiSettings['provider']>(settings.provider);
  const [apiKey, setApiKey] = useState<string>(settings.apiKey);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSave = () => {
    onSave({
      workerUrl: workerUrl.trim().replace(/\/+$/, ''),
      provider,
      apiKey: apiKey.trim(),
    });
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
              Canlı Borsa Proxy & Veri Ayarları
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
          {/* Cloudflare Worker Canlı Arama Proxy */}
          <div className="border border-[#f59e0b]/40 bg-[#09090b] p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-100">
              <Globe className="w-3.5 h-3.5 text-[#f59e0b]" strokeWidth={1.5} />
              <span>Cloudflare Worker Adresi (Tüm BIST & Dünya Hisseleri)</span>
            </div>
            <input
              type="url"
              value={workerUrl}
              onChange={(e) => setWorkerUrl(e.target.value)}
              placeholder="https://alphadesk-proxy.kullanici.workers.dev"
              className="w-full bg-[#111113] border border-[#27272a] focus:border-[#f59e0b] focus:outline-none px-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600"
            />
            <p className="text-[11px] text-zinc-500">
              Adres tanımlandığında sol arama kutusundan listede olmayan tüm BIST ve global hisseleri
              canlı çekebilirsiniz.
            </p>
          </div>

          <div className="border border-[#27272a] bg-[#09090b] p-3 space-y-1 font-mono tabular-nums">
            <div className="text-[11px] uppercase text-zinc-400">Varsayılan ETL Katmanı</div>
            <div className="text-zinc-200">
              {pipelineActive
                ? `PIPELINE_JSON Aktif · ${generatedAt ?? '-'}`
                : 'SEED · Yerel Deterministik Yedek'}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] uppercase text-zinc-400">
              Opsiyonel Harici API (Finnhub / Alpha Vantage)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'NONE', label: 'Kapalı' },
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
                {provider} API Anahtarı
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API anahtarınızı yapıştırın..."
                className="w-full bg-[#09090b] border border-[#27272a] focus:border-[#f59e0b] focus:outline-none px-3 py-2 text-xs font-mono text-zinc-100"
              />
            </div>
          )}

          <div className="flex items-start gap-2 border border-[#27272a] bg-[#18181b]/60 p-2.5 text-[11px] text-zinc-400">
            <ShieldAlert className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>
              Tüm ayarlar yalnızca tarayıcınızdaki LocalStorage içinde saklanır.
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
