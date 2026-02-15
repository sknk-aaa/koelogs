// frontend/src/pages/InsightsTimePage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchInsights } from "../api/insights";
import type { InsightsData } from "../types/insights";
import LineChart from "../features/insights/components/LineChart";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: InsightsData };

const PERIODS = [30, 90, 365] as const;

function formatRange(from: string, to: string) {
  return `${from} 〜 ${to}`;
}

function sumTotalMinutes(data: InsightsData) {
  return data.daily_durations.reduce((sum, p) => sum + (p.duration_min || 0), 0);
}

function maxDailyMinutes(data: InsightsData) {
  let m = 0;
  for (const p of data.daily_durations) m = Math.max(m, p.duration_min || 0);
  return m;
}

export default function InsightsTimePage() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
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

  const data = state.kind === "ready" ? state.data : null;

  const total = useMemo(() => (data ? sumTotalMinutes(data) : 0), [data]);
  const max = useMemo(() => (data ? maxDailyMinutes(data) : 0), [data]);

  // 平均(分/日) = 期間日数で割る（休んだ日も含む）
  const avgPerDay = useMemo(() => {
    if (!data) return 0;
    const denom = Math.max(1, data.range.days);
    return Math.round((total / denom) * 10) / 10;
  }, [data, total]);

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
          <h1 style={styles.h1}>練習時間（詳細）</h1>
          <div style={styles.sub}>期間を切り替えて推移と集計を確認できます</div>
        </div>

        <Link to="/insights" style={styles.backLink}>
          戻る
        </Link>
      </div>

      <div style={styles.segment}>
        {PERIODS.map((p) => {
          const active = p === days;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setDays(p)}
              style={{ ...styles.segBtn, ...(active ? styles.segBtnActive : null) }}
            >
              {p}
            </button>
          );
        })}
      </div>

      {state.kind === "loading" && <div style={styles.sub}>読み込み中…</div>}

      {state.kind === "error" && (
        <div style={styles.errorBox}>取得に失敗しました: {state.message}</div>
      )}

      {state.kind === "ready" && data && (
        <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>サマリー</div>

            <div style={styles.statsGrid}>
              <Stat label="合計" value={`${total} 分`} />
              <Stat label="平均（分/日）" value={`${avgPerDay}`} />
              <Stat label="最大" value={`${max} 分`} />
              <Stat label="練習日数" value={`${data.practice_days_count} 日`} />
            </div>

            <div style={styles.mini}>期間: {formatRange(data.range.from, data.range.to)}</div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>練習時間の推移</div>

            {/* ✅ グラフのみ横スクロール（LineChart 内部で完結） */}
            <LineChart points={data.daily_durations} />

            <div style={styles.mini}>
              横スクロールで全期間を確認できます
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.statBox}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // ✅ ここが今回の主修正：詳細ページも横はみ出し禁止
  page: {
    padding: "14px 14px 90px",
    maxWidth: 920,
    margin: "0 auto",
    color: "#111",
    overflowX: "hidden",
  },
  topBar: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    minWidth: 0,
  },
  h1: { fontSize: 18, fontWeight: 900, margin: "6px 0 0" },
  sub: { fontSize: 12, opacity: 0.75 },
  mini: { fontSize: 12, opacity: 0.7, marginTop: 10, lineHeight: 1.4 },

  backLink: {
    textDecoration: "none",
    color: "inherit",
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.85,
    border: "1px solid rgba(0,0,0,0.10)",
    padding: "8px 10px",
    borderRadius: 12,
    flexShrink: 0,
  },

  segment: {
    display: "inline-flex",
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    background: "rgba(0,0,0,0.02)",
    minWidth: 0,
  },
  segBtn: {
    appearance: "none",
    border: "none",
    background: "transparent",
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 900,
    cursor: "pointer",
    opacity: 0.8,
    minWidth: 64,
  },
  segBtnActive: { background: "rgba(0,0,0,0.10)", opacity: 1 },

  card: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
    minWidth: 0,
  },
  cardTitle: { fontSize: 13, fontWeight: 800, marginBottom: 10, opacity: 0.9 },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
    minWidth: 0,
  },
  statBox: {
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 14,
    padding: 12,
    background: "rgba(0,0,0,0.02)",
    minWidth: 0,
  },
  statLabel: { fontSize: 12, opacity: 0.75, fontWeight: 900 },
  statValue: { fontSize: 20, fontWeight: 900, marginTop: 6 },

  errorBox: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,0,0,0.04)",
  },
};
