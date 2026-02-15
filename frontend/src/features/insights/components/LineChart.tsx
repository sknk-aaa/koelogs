// frontend/src/features/insights/components/LineChart.tsx
import { useMemo } from "react";
import type { DailyDurationPoint } from "../../../types/insights";

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
    if (points.length >= 300) return 30; // 月1
    if (points.length >= 120) return 14; // 2週1
    if (points.length >= 60) return 7;
    if (points.length >= 30) return 5;
    return Math.max(1, Math.floor(points.length / 6));
  }, [points.length]);

  return (
    <div style={styles.wrap}>
      <div style={styles.topRow}>
        <div style={styles.legend}>最大: {maxY} 分</div>
        {points.length > 80 && <div style={styles.legendHint}>横スクロールで確認</div>}
      </div>

      {/* ✅ スクロールはここだけ */}
      <div style={styles.scrollArea}>
        <div style={{ width: contentW, minWidth: 0 }}>
          <svg
            viewBox={`0 0 ${contentW} ${H}`}
            style={styles.svg}
            aria-label="practice time chart"
            preserveAspectRatio="none"
          >
            <path d={path} fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth="3" />
            {points.map((p, i) => {
              const x = PAD + ((contentW - PAD * 2) * i) / Math.max(1, points.length - 1);
              const y =
                PAD +
                (H - PAD * 2) -
                ((H - PAD * 2) * (p.duration_min || 0)) / Math.max(1, maxY);
              return <circle key={p.date} cx={x} cy={y} r="3.2" fill="rgba(0,0,0,0.55)" />;
            })}
          </svg>

          {/* ✅ ラベルは絶対配置で横幅を押し広げない */}
          <div style={{ ...styles.xLabels, width: contentW }}>
            {points.map((p, i) => {
              if (i % labelStep !== 0 && i !== points.length - 1) return null;
              const leftPct = (i / Math.max(1, points.length - 1)) * 100;
              return (
                <div
                  key={p.date}
                  style={{
                    ...styles.xLabel,
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

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.06)",
    padding: 8,
    background: "rgba(0,0,0,0.02)",
    color: "#111",
    minWidth: 0,
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 8,
    minWidth: 0,
  },
  legend: { fontSize: 12, fontWeight: 800, opacity: 0.75 },
  legendHint: { fontSize: 12, fontWeight: 800, opacity: 0.6 },

  // ✅ ページ全体じゃなく、この箱だけ横スクロール
  scrollArea: {
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    WebkitOverflowScrolling: "touch",
    borderRadius: 12,
  },

  svg: { width: "100%", height: 220, display: "block" },

  xLabels: {
    position: "relative",
    height: 18,
    marginTop: 8,
    fontSize: 11,
    opacity: 0.7,
  },
  xLabel: {
    position: "absolute",
    top: 0,
    whiteSpace: "nowrap",
    textAlign: "center",
    minWidth: 0,
  },
};
