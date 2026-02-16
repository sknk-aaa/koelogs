// frontend/src/pages/InsightsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchInsights } from "../api/insights";
import type { DailyDurationPoint, InsightsData, MenuRankingItem } from "../types/insights";
import LineChart from "../features/insights/components/LineChart";
import ColoredTag from "../components/ColoredTag";

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

function maxDaily(points: DailyDurationPoint[]) {
  let m = 0;
  for (const p of points) m = Math.max(m, p.duration_min || 0);
  return m;
}

function MenuRankingPreview({ items }: { items: MenuRankingItem[] }) {
  const top = items.slice(0, 8);
  const totalCount = items.reduce((sum, x) => sum + (x.count || 0), 0);
  const maxC = top.reduce((m, x) => Math.max(m, x.count), 1);

  if (top.length === 0) {
    return <div style={styles.muted}>データなし（直近期間にメニュー記録がありません）</div>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {top.map((it, idx) => {
        const pctBar = clamp((it.count / maxC) * 100, 0, 100);
        const pctText = totalCount > 0 ? ((it.count / totalCount) * 100).toFixed(1) : "0.0";
        return (
          <div key={it.menu_id} style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>{idx + 1}.</div>
                <ColoredTag text={it.name} color={it.color} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 900 }}>
                {it.count} 回（{pctText}%）
              </div>
            </div>

            <div style={styles.barTrack}>
              <div style={{ ...styles.barFill, width: `${pctBar}%` }} />
            </div>
          </div>
        );
      })}

      <div style={styles.muted}>合計 {totalCount} 回</div>
    </div>
  );
}

function ClickableCard({
  title,
  to,
  children,
}: {
  title: string;
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link to={to} style={styles.clickCard}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>{title}</div>
        <div style={styles.cardHint}>
          <span style={styles.hintText}>詳細を見る</span>
          <ChevronRight />
        </div>
      </div>
      {children}
    </Link>
  );
}

function StaticCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M7.5 4.5L12.8 10L7.5 15.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}

function formatDateSlash(iso: string | null): string | null {
  if (!iso) return null;
  // ISO "YYYY-MM-DD" → "YYYY/MM/DD"
  return iso.replace(/-/g, "/");
}

export default function InsightsPage() {
  const days = 30;
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
  const maxY = useMemo(() => (data ? maxDaily(data.daily_durations) : 0), [data]);

  if (state.kind === "loading") {
    return (
      <div style={styles.page}>
        <h1 style={styles.h1}>分析</h1>
        <div style={styles.muted}>読み込み中…</div>
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

  if (!data) {
    return (
      <div style={styles.page}>
        <h1 style={styles.h1}>分析</h1>
        <div style={styles.muted}>データがありません</div>
      </div>
    );
  }

  const falNote = data.top_notes.falsetto.note ?? "—";
  const cheNote = data.top_notes.chest.note ?? "—";
  const falDate = data.top_notes.falsetto.date;
  const cheDate = data.top_notes.chest.date;

  const falFormatted = formatDateSlash(falDate);
  const cheFormatted = formatDateSlash(cheDate);

  const freq = `${data.practice_days_count} / ${data.range.days} 日`;

  return (
    <div style={styles.page}>
      <div style={styles.sub}>期間: {formatRange(data.range.from, data.range.to)}</div>

      <div style={styles.grid}>
        <ClickableCard title="練習時間の推移" to="/insights/time">
          <div style={styles.row}>
            <div style={styles.k}>最大</div>
            <div style={styles.v}>{maxY} 分</div>
          </div>
          <div style={styles.mini}>タップで詳細（日別内訳）</div>
          <div style={{ marginTop: 10 }}>
            <LineChart points={data.daily_durations} />
          </div>
        </ClickableCard>

        <ClickableCard title="メニュー頻度" to="/insights/menus">
          <MenuRankingPreview items={data.menu_ranking} />
        </ClickableCard>

        <StaticCard title="最高到達音（全期間）">
          <div style={{ display: "grid", gap: 10 }}>
            <div style={styles.row}>
              <div style={styles.k}>裏声</div>
              <div style={styles.v}>
                {falNote}
                {falFormatted && <span style={styles.vSub}>（{falFormatted}）</span>}
              </div>
            </div>
            <div style={styles.row}>
              <div style={styles.k}>地声</div>
              <div style={styles.v}>
                {cheNote}
                {cheFormatted && <span style={styles.vSub}>（{cheFormatted}）</span>}
              </div>
            </div>
            <div style={styles.muted}>
              ※ ノート形式が崩れている（例: A4,C#4 以外）と集計対象外になります
            </div>
          </div>
        </StaticCard>

        <StaticCard title="練習日数（直近期間）">
          <div style={styles.row}>
            <div style={styles.k}>練習した日</div>
            <div style={styles.v}>{freq}</div>
          </div>
        </StaticCard>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  vSub: {
    fontSize: 12,
    fontWeight: 800,
    opacity: 0.55,
    marginLeft: 6,
  },
  page: {
    padding: "16px 14px 90px",
    maxWidth: 920,
    margin: "0 auto",
    color: "#111",
    overflowX: "hidden",
  },
  h1: { fontSize: 18, fontWeight: 900, margin: "6px 0 6px" },
  sub: { fontSize: 12, opacity: 0.75, marginBottom: 14 },

  grid: { display: "grid", gap: 12, minWidth: 0 },

  card: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
    minWidth: 0,
  },
  clickCard: {
    display: "block",
    textDecoration: "none",
    color: "inherit",
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    cursor: "pointer",
    minWidth: 0,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
    minWidth: 0,
  },
  cardTitle: { fontSize: 13, fontWeight: 800, opacity: 0.9 },
  cardHint: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    opacity: 0.75,
    fontWeight: 800,
    flexShrink: 0,
  },
  hintText: { textDecoration: "underline", textUnderlineOffset: 3 },

  mini: { fontSize: 12, opacity: 0.7, marginTop: 8, lineHeight: 1.4 },
  muted: { fontSize: 12, opacity: 0.7, lineHeight: 1.5 },

  errorBox: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,0,0,0.04)",
  },

  barTrack: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    background: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 999, background: "rgba(0,0,0,0.5)" },

  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  k: { fontSize: 13, opacity: 0.8, fontWeight: 700 },
  v: { fontSize: 20, fontWeight: 900 },
};
