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

  const yTicks = useMemo(() => {
    const ratios = [1, 0.75, 0.5, 0.25, 0];
    const innerH = H - PAD * 2;
    const seen = new Set<number>();

    return ratios
      .map((ratio) => {
        const value = Math.round(maxY * ratio);
        const y = PAD + innerH - innerH * ratio;
        return { value, y };
      })
      .filter((t) => {
        if (seen.has(t.value)) return false;
        seen.add(t.value);
        return true;
      });
  }, [H, PAD, maxY]);

  return (
    <div className="lineChart">
      <div className="lineChart__top">
        <div className="lineChart__legend">最大: {maxY} 分</div>
        {points.length > 80 && <div className="lineChart__hint">横スクロールで確認</div>}
      </div>

      <div className="lineChart__plot">
        <div className="lineChart__yAxis" aria-hidden="true">
          <div className="lineChart__yTitle">分</div>
          {yTicks.map((t) => (
            <div key={`y-${t.value}-${t.y}`} className="lineChart__yTick" style={{ top: `${t.y}px` }}>
              {t.value}
            </div>
          ))}
        </div>

        <div className="lineChart__scroll">
          <div style={{ width: contentW, minWidth: 0 }}>
            <svg
              viewBox={`0 0 ${contentW} ${H}`}
              className="lineChart__svg"
              aria-label="practice time chart"
              preserveAspectRatio="none"
            >
              {yTicks.map((t) => (
                <line
                  key={`grid-${t.value}-${t.y}`}
                  x1={PAD}
                  x2={contentW - PAD}
                  y1={t.y}
                  y2={t.y}
                  stroke="rgba(56, 124, 205, 0.2)"
                  strokeDasharray="4 4"
                />
              ))}
              <path d={path} fill="none" stroke="color-mix(in srgb, var(--accent) 78%, #0b3f77)" strokeWidth="3" />
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
                    fill="color-mix(in srgb, var(--accent) 72%, #0f4e9f)"
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
    </div>
  );
}
