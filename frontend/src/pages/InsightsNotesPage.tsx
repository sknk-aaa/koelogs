import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchInsights } from "../api/insights";
import type { InsightsData } from "../types/insights";
import { useAuth } from "../features/auth/useAuth";
import { makeMockInsights } from "../features/insights/mockInsights";
import NotePitchChart from "../features/insights/components/NotePitchChart";
import "./InsightsPages.css";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: InsightsData };

const PERIODS = [30, 90, 365] as const;

function formatDateSlash(iso: string | null): string {
  if (!iso) return "—";
  return iso.replace(/-/g, "/");
}

export default function InsightsNotesPage() {
  const { me, isLoading: authLoading } = useAuth();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const guestMode = !authLoading && !me;
  const guestData = useMemo(() => (guestMode ? makeMockInsights(days) : null), [guestMode, days]);

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

  const data = guestData ?? (state.kind === "ready" ? state.data : null);

  return (
    <div className="page insightsPage">
      <div className="insightsPage__bg" aria-hidden="true" />

      <section className="card insightsHero">
        <div className="insightsHero__head">
          <div>
            <div className="insightsHero__kicker">Insights</div>
            <h1 className="insightsHero__title">最高音の推移（詳細）</h1>
            <p className="insightsHero__sub">裏声と地声の最高音を日次で確認できます。</p>
          </div>
          <Link to="/insights" className="insightsBack">
            戻る
          </Link>
        </div>

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
      </section>

      {guestMode && (
        <section className="card insightsGuest">
          <div className="insightsGuest__title">ゲスト表示中</div>
          <div className="insightsGuest__text">
            分析画面の構成は確認できます。個人の練習履歴に基づく詳細データはログイン後に表示されます。
          </div>
        </section>
      )}

      {!guestData && state.kind === "loading" && <div className="insightsMuted">読み込み中…</div>}
      {!guestData && state.kind === "error" && <div className="insightsError">取得に失敗しました: {state.message}</div>}

      {data && (
        <div className="insightsStack">
          <section className="insightsCard">
            <div className="insightsCard__head">
              <div className="insightsCard__title">日次推移</div>
            </div>
            <NotePitchChart
              falsetto={data.note_series.falsetto}
              chest={data.note_series.chest}
              showXAxis
            />
            <div className="insightsMuted">欠損日は線をつないで表示し、点のみ省略します。</div>
          </section>

          <section className="insightsCard">
            <div className="insightsCard__head">
              <div className="insightsCard__title">全期間の最高到達音</div>
            </div>
            <div className="insightsKeyValue">
              <div className="insightsKeyValue__k">裏声</div>
              <div className="insightsKeyValue__v">
                {data.top_notes.falsetto.note ?? "—"}
                <span className="insightsKeyValue__sub">（{formatDateSlash(data.top_notes.falsetto.date)}）</span>
              </div>
            </div>
            <div className="insightsKeyValue" style={{ marginTop: 8 }}>
              <div className="insightsKeyValue__k">地声</div>
              <div className="insightsKeyValue__v">
                {data.top_notes.chest.note ?? "—"}
                <span className="insightsKeyValue__sub">（{formatDateSlash(data.top_notes.chest.date)}）</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
