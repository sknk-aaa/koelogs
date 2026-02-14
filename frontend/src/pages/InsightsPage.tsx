// frontend/src/pages/InsightsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { fetchInsights } from "../api/insights";
import type { DailyDurationPoint, InsightsData, MenuRankingItem } from "../types/insights";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: InsightsData };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatRange(from: string, to: string) {
  return `${from} 〜 ${to}`;
}

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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardBody}>{children}</div>
    </section>
  );
}

function LineChart({ points }: { points: DailyDurationPoint[] }) {
  const W = 720;
  const H = 220;
  const PAD = 18;

  const path = useMemo(() => buildLinePath(points, W, H, PAD), [points]);
  const maxY = useMemo(() => maxDuration(points), [points]);

  const labelStep = points.length >= 30 ? 5 : Math.max(1, Math.floor(points.length / 6));

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>最大: {maxY} 分</div>

      <div style={styles.chartWrap}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          role="img"
          aria-label="練習時間の推移（直近30日）"
        >
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(0,0,0,0.15)" />
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="rgba(0,0,0,0.08)" />

          <path d={path} fill="none" stroke="currentColor" strokeWidth={3} />

          {points.map((p, i) => {
            const x = PAD + ((W - PAD * 2) * i) / Math.max(1, points.length - 1);
            const y =
              PAD +
              (H - PAD * 2) -
              ((H - PAD * 2) * (p.duration_min || 0)) / Math.max(1, maxY);
            return <circle key={p.date} cx={x} cy={y} r={3} fill="currentColor" opacity={0.9} />;
          })}
        </svg>
      </div>

      <div style={styles.xLabels}>
        {points.map((p, i) => {
          if (i % labelStep !== 0 && i !== points.length - 1) return null;
          return (
            <div key={p.date} style={styles.xLabel}>
              {tickLabel(p.date)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MenuRanking({ items }: { items: MenuRankingItem[] }) {
  const top = items.slice(0, 10);

  // ✅ 母数（直近期間のメニュー総回数）に対する割合
  const totalCount = items.reduce((sum, x) => sum + (x.count || 0), 0);

  // ✅ バー幅は上位内の最大値基準（見やすさ優先）
  const maxC = top.reduce((m, x) => Math.max(m, x.count), 1);

  if (top.length === 0) {
    return <div style={{ opacity: 0.75 }}>データなし（直近期間にメニュー記録がありません）</div>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {top.map((it, idx) => {
        const pctBar = clamp((it.count / maxC) * 100, 0, 100);
        const pctText =
          totalCount > 0 ? ((it.count / totalCount) * 100).toFixed(1) : "0.0";

        return (
          <div key={it.menu} style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontWeight: 700 }}>
                {idx + 1}. {it.menu}
              </div>

              {/* ✅ 回数 + パーセント */}
              <div style={{ fontSize: 12, opacity: 0.75, whiteSpace: "nowrap" }}>
                {it.count} 回（{pctText}%）
              </div>
            </div>

            <div style={styles.barTrack}>
              <div style={{ ...styles.barFill, width: `${pctBar}%` }} />
            </div>
          </div>
        );
      })}

      {/* ✅ 母数の補足（誤解防止） */}
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
        合計 {totalCount} 回（直近期間に記録されたメニュー総数）
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [days] = useState(30);
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setState({ kind: "loading" });
      const res = await fetchInsights(days);
      if (cancelled) return;

      if ("error" in res && res.error) {
        setState({ kind: "error", message: res.error });
        return;
      }
      if (!res.data) {
        setState({ kind: "error", message: "No data" });
        return;
      }

      setState({ kind: "ready", data: res.data });
    })();

    return () => {
      cancelled = true;
    };
  }, [days]);

  if (state.kind === "loading") {
    return (
      <div style={styles.page}>
        <h1 style={styles.h1}>分析</h1>
        <div style={{ opacity: 0.75 }}>読み込み中…</div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div style={styles.page}>
        <h1 style={styles.h1}>分析</h1>
        <div style={styles.errorBox}>取得に失敗しました: {state.message}</div>
      </div>
    );
  }

  const data = state.data;
  const freq = `${data.practice_days_count} / ${data.range.days} 日`;
  const fal = data.top_notes.falsetto.note ?? "—";
  const che = data.top_notes.chest.note ?? "—";

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>分析</h1>

      <div style={styles.sub}>期間: {formatRange(data.range.from, data.range.to)}</div>

      <div style={styles.grid}>
        <Card title="練習日数（直近30日）">
          <div style={styles.big}>{freq}</div>
          <div style={styles.mini}>
            「練習した日」＝その期間に training_log が存在する日
          </div>
        </Card>

        <Card title="最高到達音（全期間）">
          <div style={{ display: "grid", gap: 10 }}>
            <div style={styles.row}>
              <div style={styles.k}>裏声</div>
              <div style={styles.v}>{fal}</div>
            </div>
            <div style={styles.row}>
              <div style={styles.k}>地声</div>
              <div style={styles.v}>{che}</div>
            </div>
            <div style={styles.mini}>
              ※ ノート形式が崩れている（例: A4 以外）と集計対象外になります
            </div>
          </div>
        </Card>

        <Card title="練習時間の推移（直近30日）">
          <LineChart points={data.daily_durations} />
        </Card>

        <Card title="メニュー頻度ランキング（直近30日）">
          <MenuRanking items={data.menu_ranking} />
        </Card>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "14px 14px 90px",
    maxWidth: 920,
    margin: "0 auto",
    color: "#111",
  },
  h1: {
    fontSize: 18,
    fontWeight: 900,
    margin: "6px 0 6px",
  },
  sub: {
    fontSize: 12,
    opacity: 0.75,
    marginBottom: 14,
  },
  grid: {
    display: "grid",
    gap: 12,
  },
  card: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 800,
    marginBottom: 10,
    opacity: 0.9,
  },
  cardBody: {},
  big: {
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: 0.2,
  },
  mini: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 8,
    lineHeight: 1.4,
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,0,0,0.04)",
  },
  chartWrap: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.06)",
    padding: 8,
    background: "rgba(0,0,0,0.02)",
    color: "#111",
  },
  xLabels: {
    marginTop: 8,
    display: "flex",
    justifyContent: "space-between",
    gap: 6,
    fontSize: 11,
    opacity: 0.7,
  },
  xLabel: {
    minWidth: 44,
    textAlign: "center",
  },
  barTrack: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    background: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    background: "rgba(0,0,0,0.5)",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  k: { fontSize: 13, opacity: 0.8, fontWeight: 700 },
  v: { fontSize: 20, fontWeight: 900 },
};
