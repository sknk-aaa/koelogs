// frontend/src/pages/InsightsMenusPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchInsights } from "../api/insights";
import type { InsightsData, MenuRankingItem } from "../types/insights";
import ColoredTag from "../components/ColoredTag";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: InsightsData };

const PERIODS = [30, 90, 365] as const;
type SortMode = "count_desc" | "name_asc";

function formatRange(from: string, to: string) {
  return `${from} 〜 ${to}`;
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function InsightsMenusPage() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [sortMode, setSortMode] = useState<SortMode>("count_desc");
  const [q, setQ] = useState("");
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

  const derived = useMemo(() => {
    if (state.kind !== "ready") return null;

    const items: MenuRankingItem[] = state.data.menu_ranking ?? [];
    const totalCount = items.reduce((sum, it) => sum + (it.count || 0), 0);

    const nq = normalize(q);
    const filtered = nq
      ? items.filter((it) => normalize(it.name).includes(nq))
      : items.slice();

    const sorted = filtered.sort((a, b) => {
      if (sortMode === "name_asc") {
        return a.name.localeCompare(b.name, "ja");
      }
      // count_desc
      const diff = (b.count || 0) - (a.count || 0);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name, "ja");
    });

    const maxC = Math.max(1, ...sorted.map((x) => x.count || 0));

    return { totalCount, list: sorted, maxC, range: state.data.range };
  }, [q, sortMode, state]);

  const content = (() => {
    if (state.kind === "loading") return <div style={styles.sub}>読み込み中…</div>;
    if (state.kind === "error")
      return <div style={styles.errorBox}>取得に失敗しました: {state.message}</div>;
    if (!derived) return null;

    const { totalCount, list, maxC, range } = derived;

    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>サマリー</div>
          <div style={styles.summaryRow}>
            <div style={styles.badge}>対象期間: {formatRange(range.from, range.to)}</div>
            <div style={styles.badge}>合計: {totalCount} 回</div>
            <div style={styles.badge}>表示: {list.length} 件</div>
          </div>
          <div style={styles.mini}>※ 合計は「期間内に記録されたメニュー総数」です（重複含む）</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>ランキング（全件）</div>

          {list.length === 0 ? (
            <div style={styles.muted}>該当なし</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {list.map((it, idx) => {
                const pctText =
                  totalCount > 0 ? (((it.count || 0) / totalCount) * 100).toFixed(1) : "0.0";
                const pctBar = clamp(((it.count || 0) / maxC) * 100, 0, 100);

                return (
                  <div key={it.menu_id} style={styles.rankRow}>
                    <div style={styles.rankTop}>
                      <div style={styles.rankLeft}>
                        <div style={styles.rankNo}>{idx + 1}</div>

                        {/* ✅ 色付きタグ（menu_id設計） */}
                        <div style={{ display: "grid", gap: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <ColoredTag text={it.name} color={it.color} />
                          </div>
                          <div style={styles.rankMeta}>
                            {it.count} 回（{pctText}%）
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={styles.rankBarTrack} aria-hidden="true">
                      <div style={{ ...styles.rankBarFill, width: `${pctBar}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  })();

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div style={{ display: "grid", gap: 4 }}>
          <h1 style={styles.h1}>メニュー頻度（詳細）</h1>
          <div style={styles.sub}>検索・ソートで全件を確認できます</div>
        </div>

        <Link to="/insights" style={styles.backLink}>
          戻る
        </Link>
      </div>

      <div style={styles.controls}>
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

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="検索（部分一致）"
          style={styles.search}
        />

        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          style={styles.select}
        >
          <option value="count_desc">回数（降順）</option>
          <option value="name_asc">名前（昇順）</option>
        </select>
      </div>

      {content}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "14px 14px 90px", maxWidth: 920, margin: "0 auto", color: "#111" },
  topBar: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  h1: { fontSize: 18, fontWeight: 900, margin: "6px 0 0" },
  sub: { fontSize: 12, opacity: 0.75 },
  mini: { fontSize: 12, opacity: 0.7, marginTop: 10, lineHeight: 1.4 },
  muted: { fontSize: 12, opacity: 0.7, lineHeight: 1.5 },

  backLink: {
    textDecoration: "none",
    color: "inherit",
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.85,
    border: "1px solid rgba(0,0,0,0.10)",
    padding: "8px 10px",
    borderRadius: 12,
  },

  controls: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  segment: {
    display: "inline-flex",
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 14,
    overflow: "hidden",
    background: "rgba(0,0,0,0.02)",
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

  search: {
    width: "100%",
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 14,
    padding: "10px 12px",
    fontSize: 13,
    outline: "none",
    background: "#fff",
  },
  select: {
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 14,
    padding: "10px 12px",
    fontSize: 13,
    background: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  card: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
  },
  cardTitle: { fontSize: 13, fontWeight: 800, marginBottom: 10, opacity: 0.9 },

  summaryRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  badge: {
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.85,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(0,0,0,0.02)",
    borderRadius: 999,
    padding: "6px 10px",
  },

  rankRow: {
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 12,
    display: "grid",
    gap: 10,
    background: "rgba(0,0,0,0.01)",
  },
  rankTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  rankLeft: { display: "flex", alignItems: "center", gap: 10 },
  rankNo: {
    width: 30,
    height: 30,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "#fff",
    flexShrink: 0,
  },
  rankMeta: { fontSize: 12, opacity: 0.75, fontWeight: 800 },

  rankBarTrack: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    background: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  rankBarFill: { height: "100%", borderRadius: 999, background: "rgba(0,0,0,0.55)" },

  errorBox: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,0,0,0.04)",
  },
};
