"use client";

import type { AssessmentDto } from "@/lib/dto";
import { formatDate } from "@/lib/format";

interface HealingChartProps {
  assessments: AssessmentDto[];
}

interface SeriesPoint {
  date: Date;
  value: number;
}

const WIDTH = 640;
const HEIGHT = 180;
const PAD_LEFT = 44;
const PAD_RIGHT = 40;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const PAIN_MAX = 10;
const MIN_MEASURED_POINTS = 2;

function toPoints(values: SeriesPoint[], min: number, max: number, xOf: (d: Date) => number) {
  const span = max - min || 1;
  return values
    .map((p) => {
      const y = PAD_TOP + (HEIGHT - PAD_TOP - PAD_BOTTOM) * (1 - (p.value - min) / span);
      return `${xOf(p.date).toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

interface ChartModel {
  areaSeries: SeriesPoint[];
  painSeries: SeriesPoint[];
  minT: number;
  maxT: number;
  areaMax: number;
  trend: number | null;
  xOf: (d: Date) => number;
}

function buildChartModel(assessments: AssessmentDto[]): ChartModel | null {
  const ordered = [...assessments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const areaSeries: SeriesPoint[] = ordered
    .filter((a) => a.areaMm2 != null)
    .map((a) => ({ date: new Date(a.createdAt), value: a.areaMm2 as number }));
  const painSeries: SeriesPoint[] = ordered
    .filter((a) => a.painScale != null)
    .map((a) => ({ date: new Date(a.createdAt), value: a.painScale as number }));

  if (areaSeries.length < MIN_MEASURED_POINTS && painSeries.length < MIN_MEASURED_POINTS) {
    return null;
  }

  const allDates = [...areaSeries, ...painSeries].map((p) => p.date.getTime());
  const minT = Math.min(...allDates);
  const maxT = Math.max(...allDates);
  const spanT = maxT - minT || 1;
  const first = areaSeries[0];
  const last = areaSeries[areaSeries.length - 1];
  const trend =
    areaSeries.length >= MIN_MEASURED_POINTS && first.value > 0
      ? Math.round(((last.value - first.value) / first.value) * 100)
      : null;

  return {
    areaSeries,
    painSeries,
    minT,
    maxT,
    areaMax: Math.max(...areaSeries.map((p) => p.value), 1),
    trend,
    xOf: (d: Date) =>
      PAD_LEFT + (WIDTH - PAD_LEFT - PAD_RIGHT) * ((d.getTime() - minT) / spanT),
  };
}

/**
 * Tendência de cicatrização: área da ferida (C×L) e dor ao longo das avaliações.
 * SVG puro — sem dependência externa (CSP default-src 'self').
 */
export function HealingChart({ assessments }: HealingChartProps) {
  const model = buildChartModel(assessments);
  if (!model) {
    return (
      <p className="text-xs text-slate-400">
        Registre medidas (C×L) ou dor em pelo menos duas avaliações para acompanhar a tendência.
      </p>
    );
  }
  const { areaSeries, painSeries, minT, maxT, areaMax, trend, xOf } = model;

  return (
    <div>
      {trend != null && (
        <p className={`mb-1 text-xs font-medium ${trend <= 0 ? "text-emerald-700" : "text-amber-600"}`}>
          {trend <= 0
            ? `Área reduziu ${Math.abs(trend)}% desde a primeira medição`
            : `Área aumentou ${trend}% desde a primeira medição`}
        </p>
      )}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full rounded border border-slate-200 bg-white"
        role="img"
        aria-label="Gráfico de evolução da condição"
      >
        <line
          x1={PAD_LEFT}
          y1={HEIGHT - PAD_BOTTOM}
          x2={WIDTH - PAD_RIGHT}
          y2={HEIGHT - PAD_BOTTOM}
          stroke="#cbd5e1"
        />
        {areaSeries.length >= MIN_MEASURED_POINTS && (
          <>
            <polyline
              points={toPoints(areaSeries, 0, areaMax, xOf)}
              fill="none"
              stroke="#0f766e"
              strokeWidth="2"
            />
            {areaSeries.map((p) => (
              <circle
                key={`a-${p.date.getTime()}`}
                cx={xOf(p.date)}
                cy={
                  PAD_TOP + (HEIGHT - PAD_TOP - PAD_BOTTOM) * (1 - p.value / areaMax)
                }
                r="3"
                fill="#0f766e"
              />
            ))}
            <text x={4} y={PAD_TOP + 4} fontSize="10" fill="#0f766e">
              {areaMax}mm²
            </text>
          </>
        )}
        {painSeries.length >= MIN_MEASURED_POINTS && (
          <>
            <polyline
              points={toPoints(painSeries, 0, PAIN_MAX, xOf)}
              fill="none"
              stroke="#d97706"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text x={WIDTH - PAD_RIGHT + 4} y={PAD_TOP + 4} fontSize="10" fill="#d97706">
              dor /10
            </text>
          </>
        )}
        <text x={PAD_LEFT} y={HEIGHT - 8} fontSize="10" fill="#64748b">
          {formatDate(new Date(minT).toISOString())}
        </text>
        <text x={WIDTH - PAD_RIGHT} y={HEIGHT - 8} fontSize="10" fill="#64748b" textAnchor="end">
          {formatDate(new Date(maxT).toISOString())}
        </text>
      </svg>
      <p className="mt-1 text-[11px] text-slate-400">
        Linha contínua: área da ferida (mm²) · tracejada: dor (0–10)
      </p>
    </div>
  );
}
