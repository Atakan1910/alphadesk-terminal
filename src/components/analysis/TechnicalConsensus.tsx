import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import type { TechnicalSnapshot } from '../../types/market';

interface TechnicalConsensusProps {
  technical: TechnicalSnapshot;
}

export function TechnicalConsensus({ technical }: TechnicalConsensusProps) {
  const buyCount = technical.signals.filter((s) => s.action === 'BUY').length;
  const neutralCount = technical.signals.filter((s) => s.action === 'NEUTRAL').length;
  const sellCount = technical.signals.filter((s) => s.action === 'SELL').length;

  const verdictColor =
    technical.consensusScore >= 58
      ? 'text-[#10b981]'
      : technical.consensusScore <= 42
        ? 'text-[#f43f5e]'
        : 'text-[#f59e0b]';

  const summarySentence =
    technical.consensusScore >= 75
      ? 'Hareketli ortalamalar ve momentum göstergeleri güçlü yükseliş eğiliminde.'
      : technical.consensusScore >= 58
        ? 'Teknik göstergelerin çoğunluğu pozitif bölgede; trend yukarı yönlü.'
        : technical.consensusScore <= 25
          ? 'Göstergeler belirgin satış baskısı ve aşağı yönlü trende işaret ediyor.'
          : technical.consensusScore <= 42
            ? 'Kısa ve orta vadeli göstergelerde zayıflama hakim.'
            : 'Alıcı ve satıcı sinyalleri dengede; yatay / kararsız görünüm.';

  return (
    <section className="border border-[#27272a] bg-[#111113] p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#27272a] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#f59e0b]" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-zinc-100">Teknik Konsensüs Özeti</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">{summarySentence}</p>
        </div>

        <div className="text-right font-mono tabular-nums">
          <div className={`text-2xl font-semibold ${verdictColor}`}>
            {technical.rating}
          </div>
          <div className="text-xs text-zinc-500">Puan: {technical.consensusScore} / 100</div>
        </div>
      </div>

      {/* Görsel Puan Çubuğu */}
      <div className="space-y-2">
        <div className="h-2 w-full bg-[#18181b] border border-[#27272a] relative">
          <div
            className="h-full transition-all"
            style={{
              width: `${technical.consensusScore}%`,
              backgroundColor:
                technical.consensusScore >= 58
                  ? '#10b981'
                  : technical.consensusScore <= 42
                    ? '#f43f5e'
                    : '#f59e0b',
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-zinc-400">
          <span className="text-[#f43f5e]">Sat Sinyali: {sellCount}</span>
          <span className="text-[#f59e0b]">Nötr: {neutralCount}</span>
          <span className="text-[#10b981]">Al Sinyali: {buyCount}</span>
        </div>
      </div>

      {/* İndikatör Tablosu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {technical.signals.map((sig) => {
          const badgeClass =
            sig.action === 'BUY'
              ? 'border-[#10b981]/40 text-[#10b981] bg-[#10b981]/10'
              : sig.action === 'SELL'
                ? 'border-[#f43f5e]/40 text-[#f43f5e] bg-[#f43f5e]/10'
                : 'border-[#f59e0b]/40 text-[#f59e0b] bg-[#f59e0b]/10';
          const badgeLabel =
            sig.action === 'BUY' ? 'AL' : sig.action === 'SELL' ? 'SAT' : 'NÖTR';

          return (
            <div
              key={sig.name}
              className="border border-[#27272a] bg-[#09090b] p-3 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-xs text-zinc-400 truncate">{sig.name}</div>
                <div className="text-xs font-mono tabular-nums text-zinc-200 mt-0.5">
                  {sig.value}
                </div>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-mono border shrink-0 ${badgeClass}`}>
                {badgeLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Formasyon & Pivot Seviyeleri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
        <div className="border border-[#27272a] bg-[#09090b] p-3.5 space-y-2">
          <div className="text-xs font-medium text-zinc-300">Tespit Edilen Formasyonlar</div>
          {technical.patterns.length === 0 ? (
            <div className="text-xs text-zinc-500">
              Son seanslarda belirgin kırılım veya uyumsuzluk formasyonu oluşmadı.
            </div>
          ) : (
            <div className="space-y-2">
              {technical.patterns.map((p) => (
                <div key={p.label} className="flex items-start gap-2 text-xs">
                  {p.bias === 'BULLISH' ? (
                    <TrendingUp className="w-3.5 h-3.5 text-[#10b981] shrink-0 mt-0.5" strokeWidth={1.5} />
                  ) : p.bias === 'BEARISH' ? (
                    <TrendingDown className="w-3.5 h-3.5 text-[#f43f5e] shrink-0 mt-0.5" strokeWidth={1.5} />
                  ) : (
                    <Activity className="w-3.5 h-3.5 text-[#f59e0b] shrink-0 mt-0.5" strokeWidth={1.5} />
                  )}
                  <div>
                    <span className="font-medium text-zinc-200">{p.label}:</span>{' '}
                    <span className="text-zinc-400">{p.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-[#27272a] bg-[#09090b] p-3.5 space-y-2">
          <div className="text-xs font-medium text-zinc-300">Önemli Fiyat Seviyeleri (Pivot)</div>
          <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
            <div className="p-2 border border-[#27272a] bg-[#111113]">
              <div className="text-[10px] text-[#10b981]">Destekler</div>
              <div className="mt-1 text-zinc-200">
                S1: {technical.pivots.s1}
                <br />
                S2: {technical.pivots.s2}
              </div>
            </div>
            <div className="p-2 border border-[#f59e0b]/40 bg-[#111113] flex flex-col justify-center items-center">
              <div className="text-[10px] text-[#f59e0b]">Ana Pivot</div>
              <div className="mt-1 text-sm font-semibold text-zinc-100">{technical.pivots.p}</div>
            </div>
            <div className="p-2 border border-[#27272a] bg-[#111113]">
              <div className="text-[10px] text-[#f43f5e]">Dirençler</div>
              <div className="mt-1 text-zinc-200">
                R1: {technical.pivots.r1}
                <br />
                R2: {technical.pivots.r2}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

