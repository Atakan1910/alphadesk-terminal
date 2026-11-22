import { useState } from 'react';
import type { MonteCarloConePoint } from '../../types/market';

interface MonteCarloConeSvgProps {
  cone: MonteCarloConePoint[];
  currency: string;
  dcfIntrinsic?: number;
}

export function MonteCarloConeSvg({ cone, currency, dcfIntrinsic }: MonteCarloConeSvgProps) {
  const [hoverIdx, setHoverIdx] = useState<number>(cone.length - 1);

  if (cone.length < 2) return null;

  const currencySym = currency === 'TRY' ? '₺' : '$';
  const safeIdx = Math.min(Math.max(0, hoverIdx), cone.length - 1);
  const activePoint = cone[safeIdx];

  const allValues = cone.flatMap((c) => [c.p10, c.p90]);
  if (dcfIntrinsic && dcfIntrinsic > 0) {
    allValues.push(dcfIntrinsic);
  }
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const padVal = Math.max(0.5, (rawMax - rawMin) * 0.08);
  const minVal = Math.max(0, rawMin - padVal);
  const maxVal = rawMax + padVal;
  const span = Math.max(1, maxVal - minVal);

  const width = 760;
  const height = 270;
  const padL = 60;
  const padR = 24;
  const padT = 20;
  const padB = 34;
  const usableW = width - padL - padR;
  const usableH = height - padT - padB;

  const xOf = (idx: number) => padL + (idx / (cone.length - 1)) * usableW;
  const yOf = (val: number) => padT + ((maxVal - val) / span) * usableH;

  const makeLine = (picker: (p: MonteCarloConePoint) => number) =>
    cone.map((pt, i) => `${xOf(i).toFixed(1)},${yOf(picker(pt)).toFixed(1)}`).join(' ');

  const outerPolygon = [
    ...cone.map((pt, i) => `${xOf(i).toFixed(1)},${yOf(pt.p90).toFixed(1)}`),
    ...[...cone]
      .reverse()
      .map((pt, revIdx) => {
        const origIdx = cone.length - 1 - revIdx;
        return `${xOf(origIdx).toFixed(1)},${yOf(pt.p10).toFixed(1)}`;
      }),
  ].join(' ');

  const innerPolygon = [
    ...cone.map((pt, i) => `${xOf(i).toFixed(1)},${yOf(pt.p75).toFixed(1)}`),
    ...[...cone]
      .reverse()
      .map((pt, revIdx) => {
        const origIdx = cone.length - 1 - revIdx;
        return `${xOf(origIdx).toFixed(1)},${yOf(pt.p25).toFixed(1)}`;
      }),
  ].join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => {
    const val = maxVal - span * r;
    return { val, y: padT + usableH * r };
  });

  const hasDcf =
    typeof dcfIntrinsic === 'number' &&
    Number.isFinite(dcfIntrinsic) &&
    dcfIntrinsic > 0 &&
    dcfIntrinsic >= minVal &&
    dcfIntrinsic <= maxVal;

  return (
    <div className="space-y-3">
      {/* Seçili Ay Canlı Olasılık Şeridi */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border border-[#27272a] bg-[#09090b] text-xs font-mono tabular-nums">
        <span className="text-zinc-400">
          Ufuk: <strong className="text-zinc-100">{activePoint.label}</strong>
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[#f43f5e]">
            Ayı (%10): {currencySym}
            {activePoint.p10.toFixed(2)}
          </span>
          <span className="text-[#f59e0b]">
            Medyan (%50): {currencySym}
            {activePoint.p50.toFixed(2)}
          </span>
          <span className="text-[#10b981]">
            Boğa (%90): {currencySym}
            {activePoint.p90.toFixed(2)}
          </span>
        </div>
      </div>

      {/* İnteraktif SVG Olasılık Konisi */}
      <div className="w-full overflow-x-auto border border-[#27272a] bg-[#09090b] p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-64 min-w-[520px]"
          role="img"
          aria-label="12 aylık Monte Carlo olasılık konisi"
        >
          {yTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={padL}
                y1={t.y}
                x2={width - padR}
                y2={t.y}
                stroke="#18181b"
                strokeWidth={1}
              />
              <text
                x={padL - 8}
                y={t.y + 3}
                textAnchor="end"
                fill="#71717a"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
              >
                {currencySym}
                {t.val.toFixed(0)}
              </text>
            </g>
          ))}

          {/* P10-P90 dış bandı ve P25-P75 çeyrekler arası bant (düz şeffaf dolgu, gradyansız) */}
          <polygon points={outerPolygon} fill="#52525b" fillOpacity={0.14} />
          <polygon points={innerPolygon} fill="#f59e0b" fillOpacity={0.12} />

          {/* DCF Adil Değer Yatay Referans Çizgisi */}
          {hasDcf && (
            <g>
              <line
                x1={padL}
                y1={yOf(dcfIntrinsic!)}
                x2={width - padR}
                y2={yOf(dcfIntrinsic!)}
                stroke="#38bdf8"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text
                x={width - padR - 4}
                y={yOf(dcfIntrinsic!) - 5}
                textAnchor="end"
                fill="#38bdf8"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
              >
                DCF Adil Değer: {currencySym}
                {dcfIntrinsic!.toFixed(2)}
              </text>
            </g>
          )}

          {/* Boğa / Medyan / Ayı Eğrileri */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            points={makeLine((p) => p.p90)}
          />
          <polyline
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2.5}
            points={makeLine((p) => p.p50)}
          />
          <polyline
            fill="none"
            stroke="#f43f5e"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            points={makeLine((p) => p.p10)}
          />

          {/* Aktif Ay Dikey Kılavuz Çizgisi ve Noktalar */}
          <line
            x1={xOf(safeIdx)}
            y1={padT}
            x2={xOf(safeIdx)}
            y2={height - padB}
            stroke="#3f3f46"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
          <circle cx={xOf(safeIdx)} cy={yOf(activePoint.p90)} r={3.5} fill="#10b981" />
          <circle cx={xOf(safeIdx)} cy={yOf(activePoint.p50)} r={4.5} fill="#f59e0b" />
          <circle cx={xOf(safeIdx)} cy={yOf(activePoint.p10)} r={3.5} fill="#f43f5e" />

          {/* X Ekseni Ay Etiketleri & Etkileşim Şeritleri */}
          {cone.map((pt, i) => {
            const cx = xOf(i);
            const sliceW = usableW / Math.max(1, cone.length - 1);
            return (
              <g key={pt.month}>
                {i % 2 === 0 && (
                  <text
                    x={cx}
                    y={height - 10}
                    textAnchor="middle"
                    fill={i === safeIdx ? '#f4f4f5' : '#71717a'}
                    fontSize="10"
                    fontFamily="ui-monospace, monospace"
                  >
                    {pt.label}
                  </text>
                )}
                <rect
                  x={cx - sliceW / 2}
                  y={padT}
                  width={sliceW}
                  height={usableH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoverIdx(i)}
                  onClick={() => setHoverIdx(i)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
