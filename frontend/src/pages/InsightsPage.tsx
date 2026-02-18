import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchInsights } from "../api/insights";
import type { DailyDurationPoint, InsightsData, MenuRankingItem } from "../types/insights";
import DurationHeatmapCalendar from "../features/insights/components/DurationHeatmapCalendar";
import NotePitchChart from "../features/insights/components/NotePitchChart";
import ColoredTag from "../components/ColoredTag";
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
    return <div className="insightsMuted">データなし（直近期間にメニュー記録がありません）</div>;
  }

  return (
    <div className="insightsBars">
      {top.map((it, idx) => {
        const pctBar = clamp((it.count / maxC) * 100, 0, 100);
        const pctText = totalCount > 0 ? ((it.count / totalCount) * 100).toFixed(1) : "0.0";
        return (
          <div key={it.menu_id} className="insightsBars__row">
            <div className="insightsBars__top">
              <div className="insightsBars__left">
                <div className="insightsBars__rank">{idx + 1}.</div>
                <ColoredTag text={it.name} color={it.color} />
              </div>
              <div className="insightsBars__meta">
                {it.count} 回（{pctText}%）
              </div>
            </div>
            <div className="insightsBarTrack">
              <div className="insightsBarFill" style={{ width: `${pctBar}%` }} />
            </div>
          </div>
        );
      })}
      <div className="insightsMuted">合計 {totalCount} 回</div>
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

function StaticCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="insightsCard">
      <div className="insightsCard__head">
        <div className="insightsCard__title">{title}</div>
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
  const maxY = useMemo(() => (data ? maxDaily(data.daily_durations) : 0), [data]);

  if (!guestData && state.kind === "loading") {
    return (
      <div className="page insightsPage">
        <div className="insightsPage__bg" aria-hidden="true" />
        <section className="card insightsHero">
          <div className="insightsHero__kicker">Insights</div>
          <h1 className="insightsHero__title">分析</h1>
          <p className="insightsHero__sub">読み込み中…</p>
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

  const freq = `${data.practice_days_count} / ${data.range.days} 日`;

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
        <div className="insightsHero__chips">
          <div className="insightsChip">期間: {formatRange(data.range.from, data.range.to)}</div>
          <div className="insightsChip">練習日数: {freq}</div>
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
        <ClickableCard title="練習時間の推移" to="/insights/time">
          <div className="insightsKeyValue">
            <div className="insightsKeyValue__k">最大</div>
            <div className="insightsKeyValue__v">{maxY} 分</div>
          </div>
          <div className="insightsMuted">タップで詳細（日付ラベル付き）</div>
          <div style={{ marginTop: 10 }}>
            <DurationHeatmapCalendar points={data.daily_durations} />
          </div>
        </ClickableCard>

        <ClickableCard title="メニュー頻度" to="/insights/menus">
          <MenuRankingPreview items={data.menu_ranking} />
        </ClickableCard>

        <ClickableCard title="最高音の推移（裏声 / 地声）" to="/insights/notes">
          <NotePitchChart
            falsetto={data.note_series.falsetto}
            chest={data.note_series.chest}
          />
          <div className="insightsMuted">欠損日は点を表示しません（記録なし / 入力なし）</div>
        </ClickableCard>

        <StaticCard title="練習日数（直近期間）">
          <div className="insightsStack">
            <div className="insightsKeyValue">
              <div className="insightsKeyValue__k">練習した日</div>
              <div className="insightsKeyValue__v">{freq}</div>
            </div>
            <div className="insightsKeyValue">
              <div className="insightsKeyValue__k">現在連続日数</div>
              <div className="insightsKeyValue__v">{data.streaks.current_days} 日</div>
            </div>
            <div className="insightsKeyValue">
              <div className="insightsKeyValue__k">最長継続日数</div>
              <div className="insightsKeyValue__v">{data.streaks.longest_days} 日</div>
            </div>
          </div>
        </StaticCard>
      </div>
    </div>
  );
}
