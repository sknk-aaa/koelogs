import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchInsights } from "../api/insights";
import type { InsightsData, MenuRankingItem } from "../types/insights";
import ColoredTag from "../components/ColoredTag";
import MetronomeLoader from "../components/MetronomeLoader";
import { useAuth } from "../features/auth/useAuth";
import { makeMockInsights } from "../features/insights/mockInsights";
import "./InsightsPages.css";

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
  const { me, isLoading: authLoading } = useAuth();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [sortMode, setSortMode] = useState<SortMode>("count_desc");
  const [q, setQ] = useState("");
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const guestMode = !authLoading && !me;
  const guestData = useMemo(
    () => (guestMode ? makeMockInsights(days) : null),
    [guestMode, days]
  );

  useEffect(() => {
    if (authLoading || guestMode) return;

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
  }, [authLoading, days, guestMode]);

  const derived = useMemo(() => {
    const source = guestData ?? (state.kind === "ready" ? state.data : null);
    if (!source) return null;

    const items: MenuRankingItem[] = source.menu_ranking ?? [];
    const totalCount = items.reduce((sum, it) => sum + (it.count || 0), 0);

    const nq = normalize(q);
    const filtered = nq ? items.filter((it) => normalize(it.name).includes(nq)) : items.slice();

    const sorted = filtered.sort((a, b) => {
      if (sortMode === "name_asc") {
        return a.name.localeCompare(b.name, "ja");
      }
      const diff = (b.count || 0) - (a.count || 0);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name, "ja");
    });

    const maxC = Math.max(1, ...sorted.map((x) => x.count || 0));

    return { totalCount, list: sorted, maxC, range: source.range };
  }, [guestData, q, sortMode, state]);

  const content = (() => {
    if (!guestData && state.kind === "loading") return <MetronomeLoader label="読み込み中..." />;
    if (!guestData && state.kind === "error") return <div className="insightsError">取得に失敗しました: {state.message}</div>;
    if (!derived) return null;

    const { totalCount, list, maxC, range } = derived;

    return (
      <div className="insightsStack">
        <section className="insightsCard">
          <div className="insightsCard__head">
            <div className="insightsCard__title">サマリー</div>
          </div>

          <div className="insightsSummaryRow">
            <div className="insightsBadge">対象期間: {formatRange(range.from, range.to)}</div>
            <div className="insightsBadge">合計: {totalCount} 回</div>
            <div className="insightsBadge">表示: {list.length} 件</div>
          </div>
          <div className="insightsMuted">※ 合計は「期間内に記録されたメニュー総数」です（重複含む）</div>
        </section>

        <section className="insightsCard">
          <div className="insightsCard__head">
            <div className="insightsCard__title">ランキング（全件）</div>
          </div>

          {list.length === 0 ? (
            <div className="insightsMuted">該当なし</div>
          ) : (
            <div className="insightsBars">
              {list.map((it, idx) => {
                const pctText = totalCount > 0 ? (((it.count || 0) / totalCount) * 100).toFixed(1) : "0.0";
                const pctBar = clamp(((it.count || 0) / maxC) * 100, 0, 100);

                return (
                  <div key={it.menu_id} className="insightsRankRow">
                    <div className="insightsRankTop">
                      <div className="insightsRankNo">{idx + 1}</div>
                      <div style={{ display: "grid", gap: 4 }}>
                        <ColoredTag text={it.name} color={it.color} />
                        <div className="insightsMuted">
                          {it.count} 回（{pctText}%）
                        </div>
                      </div>
                    </div>
                    <div className="insightsBarTrack" aria-hidden="true">
                      <div className="insightsBarFill" style={{ width: `${pctBar}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  })();

  return (
    <div className="page insightsPage">
      <div className="insightsPage__bg" aria-hidden="true" />

      <section className="card insightsHero">
        <div className="insightsHero__head">
          <div>
            <div className="insightsHero__kicker">Insights</div>
            <h1 className="insightsHero__title">メニュー頻度（詳細）</h1>
            <p className="insightsHero__sub">検索・ソートで全件を確認できます。</p>
          </div>
          <Link to="/insights" className="insightsBack">
            戻る
          </Link>
        </div>

        <div className="insightsControls">
          <div className="insightsSegment">
            {PERIODS.map((p) => {
              const active = p === days;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDays(p)}
                  className={`insightsSegment__btn${active ? " is-active" : ""}`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <div className="insightsControls__row">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="検索（部分一致）"
              className="insightsInput"
            />

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="insightsSelect"
            >
              <option value="count_desc">回数（降順）</option>
              <option value="name_asc">名前（昇順）</option>
            </select>
          </div>
        </div>
      </section>

      {guestMode && (
        <section className="card insightsGuest">
          <div className="insightsGuest__title">ゲスト表示中</div>
          <div className="insightsGuest__text">
            分析画面の構成は確認できます。個人の練習履歴に基づく詳細データはログイン後に表示されます。
          </div>
        </section>
      )}

      {content}
    </div>
  );
}
