import { useMemo } from "react";
import type { DailyDurationPoint } from "../../../types/insights";
import "./LineChart.css";

function maxDuration(points: DailyDurationPoint[]) {
  let m = 0;
  for (const p of points) m = Math.max(m, p.duration_min || 0);
  return m;
}

function buildLinePath(points: DailyDurationPoint[], w: number, h: number, pad: number) {
  if (points.length === 0) return "";
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const maxY = Math.max(1, maxDuration(points));
  const n = points.length;

  const toX = (i: number) => pad + (innerW * i) / Math.max(1, n - 1);
  const toY = (v: number) => pad + innerH - (innerH * v) / maxY;

  let d = "";
  for (let i = 0; i < n; i++) {
    const x = toX(i);
    const y = toY(points[i].duration_min || 0);
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  return d;
}

function tickLabel(dateISO: string) {
  const m = dateISO.slice(5, 7);
  const d = dateISO.slice(8, 10);
  return `${m}/${d}`;
}

export default function LineChart({
  points,
  pxPerPoint = 10,
  minContentWidth = 720,
}: {
  points: DailyDurationPoint[];
  pxPerPoint?: number;
  minContentWidth?: number;
}) {
  const H = 220;
  const PAD = 18;

  const maxY = useMemo(() => maxDuration(points), [points]);

  const contentW = useMemo(() => {
    const w = points.length * pxPerPoint;
    return Math.max(minContentWidth, w);
  }, [points.length, pxPerPoint, minContentWidth]);

  const path = useMemo(() => buildLinePath(points, contentW, H, PAD), [points, contentW]);

  const labelStep = useMemo(() => {
    if (points.length >= 300) return 30;
    if (points.length >= 120) return 14;
    if (points.length >= 60) return 7;
    if (points.length >= 30) return 5;
    return Math.max(1, Math.floor(points.length / 6));
  }, [points.length]);

  return (
    <div className="lineChart">
      <div className="lineChart__top">
        <div className="lineChart__legend">最大: {maxY} 分</div>
        {points.length > 80 && <div className="lineChart__hint">横スクロールで確認</div>}
      </div>

      <div className="lineChart__scroll">
        <div style={{ width: contentW, minWidth: 0 }}>
          <svg
            viewBox={`0 0 ${contentW} ${H}`}
            className="lineChart__svg"
            aria-label="practice time chart"
            preserveAspectRatio="none"
          >
            <path d={path} fill="none" stroke="color-mix(in srgb, var(--accent) 42%, #121212)" strokeWidth="3" />
            {points.map((p, i) => {
              const x = PAD + ((contentW - PAD * 2) * i) / Math.max(1, points.length - 1);
              const y =
                PAD +
                (H - PAD * 2) -
                ((H - PAD * 2) * (p.duration_min || 0)) / Math.max(1, maxY);
              return (
                <circle
                  key={p.date}
                  cx={x}
                  cy={y}
                  r="3.2"
                  fill="color-mix(in srgb, var(--accent) 34%, #1f1f1f)"
                />
              );
            })}
          </svg>

          <div className="lineChart__labels" style={{ width: contentW }}>
            {points.map((p, i) => {
              if (i % labelStep !== 0 && i !== points.length - 1) return null;
              const leftPct = (i / Math.max(1, points.length - 1)) * 100;
              return (
                <div
                  key={p.date}
                  className="lineChart__label"
                  style={{
                    left: `${leftPct}%`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {tickLabel(p.date)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
