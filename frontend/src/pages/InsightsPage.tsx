import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchInsights } from "../api/insights";
import type { InsightsData } from "../types/insights";
import NotePitchChart from "../features/insights/components/NotePitchChart";
import MetronomeLoader from "../components/MetronomeLoader";
import { useAuth } from "../features/auth/useAuth";
import { makeMockInsights } from "../features/insights/mockInsights";
import "./InsightsPages.css";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: InsightsData };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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
    <Link to={to} className="insightsCard insightsCard--link">
      <div className="insightsCard__head">
        <div className="insightsCard__title">{title}</div>
        <div className="insightsCard__hint">
          <span className="insightsCard__hintText">詳細を見る</span>
          <ChevronRight />
        </div>
      </div>
      {children}
    </Link>
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

export default function InsightsPage() {
  const days = 30;
  const { me, isLoading: authLoading } = useAuth();
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

  const data = guestData ?? (state.kind === "ready" ? state.data : null);
  if (!guestData && state.kind === "loading") {
    return (
      <div className="page insightsPage">
        <div className="insightsPage__bg" aria-hidden="true" />
        <section className="card insightsHero">
          <div className="insightsHero__kicker">Insights</div>
          <h1 className="insightsHero__title">分析</h1>
          <MetronomeLoader label="読み込み中..." />
        </section>
      </div>
    );
  }

  if (!guestData && state.kind === "error") {
    return (
      <div className="page insightsPage">
        <div className="insightsPage__bg" aria-hidden="true" />
        <section className="card insightsHero">
          <div className="insightsHero__kicker">Insights</div>
          <h1 className="insightsHero__title">分析</h1>
          <div className="insightsError">取得に失敗しました: {state.message}</div>
        </section>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page insightsPage">
        <div className="insightsPage__bg" aria-hidden="true" />
        <section className="card insightsHero">
          <div className="insightsHero__kicker">Insights</div>
          <h1 className="insightsHero__title">分析</h1>
          <p className="insightsHero__sub">データがありません</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page insightsPage">
      <div className="insightsPage__bg" aria-hidden="true" />

      <section className="card insightsHero">
        <div className="insightsHero__head">
          <div>
            <div className="insightsHero__kicker">Insights</div>
            <h1 className="insightsHero__title">分析ダッシュボード</h1>
            <p className="insightsHero__sub">記録データの流れを俯瞰し、次の練習方針を決めるためのサマリーです。</p>
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

      <div className="insightsGrid">
        <ClickableCard title="声の成長推移（30日間）" to="/insights/notes">
          <NotePitchChart
            falsetto={data.note_series.falsetto}
            chest={data.note_series.chest}
          />
          <div className="insightsMuted">欠損日は点を表示しません（記録なし / 入力なし）</div>
        </ClickableCard>

        <ClickableCard title="練習時間（30日間）" to="/insights/time">
          <div className="insightsBars">
            {data.daily_durations.slice(-7).map((row) => {
              const max = Math.max(1, ...data.daily_durations.map((d) => d.duration_min || 0));
              const pct = clamp(((row.duration_min || 0) / max) * 100, 0, 100);
              return (
                <div key={`duration-${row.date}`} className="insightsBars__row">
                  <div className="insightsBars__top">
                    <div className="insightsBars__left">{row.date.slice(5)}</div>
                    <div className="insightsBars__meta">{row.duration_min || 0}分</div>
                  </div>
                  <div className="insightsBarTrack">
                    <div className="insightsBarFill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ClickableCard>
      </div>
    </div>
  );
}
