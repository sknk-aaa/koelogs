import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchInsights } from "../api/insights";
import { useAuth } from "../features/auth/useAuth";
import DurationHeatmapCalendar from "../features/insights/components/DurationHeatmapCalendar";
import type { InsightsData } from "../types/insights";

import "./MyPage.css";

const HEATMAP_DAYS = 90;
const SUMMARY_DAYS_OPTIONS = [30, 90] as const;
type SummaryDays = (typeof SUMMARY_DAYS_OPTIONS)[number];

type Mission = {
  key: string;
  title: string;
  description: string;
  to: string;
  done: boolean;
};

function pad(v: number): string {
  return String(v).padStart(2, "0");
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function MyPage() {
  const { me } = useAuth();
  const [summaryDays, setSummaryDays] = useState<SummaryDays>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryInsights, setSummaryInsights] = useState<InsightsData | null>(null);
  const [heatmapInsights, setHeatmapInsights] = useState<InsightsData | null>(null);
  const [missionModalOpen, setMissionModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!me) {
        setSummaryInsights(null);
        setHeatmapInsights(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const [summaryRes, heatmapRes] = await Promise.all([
        fetchInsights(summaryDays),
        fetchInsights(HEATMAP_DAYS),
      ]);
      if (cancelled) return;

      const summaryError = "error" in summaryRes ? summaryRes.error : null;
      const heatmapError = "error" in heatmapRes ? heatmapRes.error : null;
      if (summaryError || heatmapError) {
        setError(summaryError || heatmapError || "データを取得できませんでした。");
        setSummaryInsights(null);
        setHeatmapInsights(null);
        setLoading(false);
        return;
      }

      setSummaryInsights(summaryRes.data ?? null);
      setHeatmapInsights(heatmapRes.data ?? null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [me, summaryDays]);

  const today = summaryInsights?.range.to ?? toISODate(new Date());
  const hasDailyLog = (summaryInsights?.total_practice_days_count ?? 0) > 0;
  const hasTopNote = !!summaryInsights?.top_notes.falsetto.note || !!summaryInsights?.top_notes.chest.note;
  const hasDisplayName = !!me?.display_name?.trim();
  const progress = summaryInsights?.gamification ?? null;

  const missions = useMemo(() => {
    if (!summaryInsights || !progress) return [] as Mission[];
    return [
      {
        key: "range",
        title: "音域を測定しよう",
        description: "裏声または地声の最高音を1つ記録してみましょう。",
        to: `/log/new?date=${encodeURIComponent(today)}`,
        done: hasTopNote,
      },
      {
        key: "daily_log",
        title: "日ログを記録しよう",
        description: "まずは日ログを1件保存して、改善サイクルを開始しましょう。",
        to: `/log/new?date=${encodeURIComponent(today)}`,
        done: hasDailyLog,
      },
      {
        key: "profile_name",
        title: "名前を登録しよう",
        description: "表示名を登録して、プロフィールを整えましょう。",
        to: "/profile",
        done: hasDisplayName,
      },
      {
        key: "ai_analysis",
        title: "AI録音分析をやってみよう",
        description: "トレーニング画面から1回分析を実行してみましょう。",
        to: "/training",
        done: progress.analysis_sessions_count > 0,
      },
      {
        key: "ai_recommendation",
        title: "AIお勧め機能を使用してみよう",
        description: "日ログ画面でAI提案を1回生成してみましょう。",
        to: `/log?mode=day&date=${encodeURIComponent(today)}`,
        done: progress.ai_recommendations_count > 0,
      },
    ] satisfies Mission[];
  }, [hasDailyLog, hasDisplayName, hasTopNote, summaryInsights, progress, today]);

  const nextMission = missions.find((mission) => !mission.done) ?? null;
  const pendingCount = missions.filter((mission) => !mission.done).length;
  const levelProgressPercent = useMemo(() => {
    if (!progress) return 0;
    const cur = progress.total_xp - progress.current_level_total_xp;
    const req = progress.next_level_total_xp - progress.current_level_total_xp;
    if (req <= 0) return 100;
    return Math.max(0, Math.min(100, (cur / req) * 100));
  }, [progress]);

  const summaryTotalDurationMin = useMemo(
    () => (summaryInsights?.daily_durations ?? []).reduce((acc, point) => acc + (point.duration_min || 0), 0),
    [summaryInsights]
  );

  if (loading) {
    return (
      <div className="page myPage">
        <section className="card myPage__hero">
          <div className="myPage__kicker">My Page</div>
          <h1 className="myPage__title">マイページ</h1>
          <p className="myPage__sub">読み込み中…</p>
        </section>
      </div>
    );
  }

  if (error || !summaryInsights || !heatmapInsights || !progress) {
    return (
      <div className="page myPage">
        <section className="card myPage__hero">
          <div className="myPage__kicker">My Page</div>
          <h1 className="myPage__title">マイページ</h1>
          <p className="myPage__sub">データを取得できませんでした。</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page myPage">
      <section className="card myPage__missionCard">
        <div className="myPage__cardTitle">今日のミッション</div>
        {!nextMission ? (
          <div className="myPage__allClear">
            <div className="myPage__allClearTitle">全部クリア</div>
            <div className="myPage__allClearText">いま実行できるミッションは完了済みです。</div>
          </div>
        ) : (
          <div className="myPage__missionPrimary">
            <div className="myPage__missionTitle">{nextMission.title}</div>
            <div className="myPage__missionText">{nextMission.description}</div>
            <Link to={nextMission.to} className="myPage__missionBtn">
              挑戦する
            </Link>
          </div>
        )}
        <button type="button" className="myPage__missionListBtn" onClick={() => setMissionModalOpen(true)}>
          ミッション一覧を見る（残り {pendingCount} 件）
        </button>
      </section>

      <section className="card myPage__card">
        <div className="myPage__cardTitle">進捗</div>
        <div className="myPage__stats">
          <div className="myPage__stat">
            <div className="myPage__label">Lv</div>
            <div className="myPage__value">{progress.level}</div>
          </div>
          <div className="myPage__stat">
            <div className="myPage__label">総XP</div>
            <div className="myPage__value">{progress.total_xp}</div>
          </div>
          <div className="myPage__stat">
            <div className="myPage__label">次のLvまで</div>
            <div className="myPage__value">{progress.xp_to_next_level} XP</div>
          </div>
        </div>
        <div className="myPage__xpRail">
          <span className="myPage__xpFill" style={{ width: `${levelProgressPercent}%` }} />
        </div>
      </section>

      <section className="card myPage__card">
        <div className="myPage__cardTitle">バッジ</div>
        <div className="myPage__badgeGrid">
          {progress.badges.map((badge) => (
            <article
              key={badge.key}
              className={`myPage__badge ${badge.unlocked ? "is-unlocked" : "is-locked"}`}
            >
              <img src={badge.icon_path} alt={badge.name} className="myPage__badgeIcon" />
              <div className="myPage__badgeName">{badge.name}</div>
              <div className="myPage__badgeMeta">
                {badge.unlocked ? "獲得済み" : `${badge.progress_current}/${badge.progress_required}`}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card myPage__card">
        <div className="myPage__cardTitle">練習時間の推移</div>
        <div className="myPage__trendHead">
          <div className="myPage__summarySwitch" role="tablist" aria-label="サマリー期間">
            {SUMMARY_DAYS_OPTIONS.map((days) => (
              <button
                key={`summary-days-${days}`}
                type="button"
                role="tab"
                aria-selected={summaryDays === days}
                className={`myPage__summaryBtn${summaryDays === days ? " is-active" : ""}`}
                onClick={() => setSummaryDays(days)}
              >
                {days}日
              </button>
            ))}
          </div>
          <Link className="myPage__linkBtn" to="/insights/time" state={{ fromPath: "/mypage" }}>
            詳細を見る
          </Link>
        </div>
        <div className="myPage__daysGrid">
          <div className="myPage__dayItem">
            <div className="myPage__label">練習した日</div>
            <div className="myPage__value">{summaryInsights.practice_days_count} / {summaryInsights.range.days} 日</div>
          </div>
          <div className="myPage__dayItem">
            <div className="myPage__label">累計練習時間</div>
            <div className="myPage__value">{(summaryTotalDurationMin / 60).toFixed(1)} 時間</div>
          </div>
        </div>
        <DurationHeatmapCalendar points={heatmapInsights.daily_durations} />
        <div className="myPage__hint">色分けカレンダーは直近 {HEATMAP_DAYS} 日固定表示です</div>
      </section>

      {missionModalOpen && (
        <div className="myPage__modalOverlay" role="dialog" aria-modal="true" aria-label="ミッション一覧">
          <section className="myPage__modalCard">
            <div className="myPage__modalHead">
              <div className="myPage__modalTitle">ミッション一覧</div>
              <button type="button" className="myPage__modalClose" onClick={() => setMissionModalOpen(false)}>
                閉じる
              </button>
            </div>
            <div className="myPage__modalList">
              {missions.map((mission) => (
                <article key={mission.key} className={`myPage__modalMission ${mission.done ? "is-done" : ""}`}>
                  <div className="myPage__modalMissionTop">
                    <div className="myPage__missionTitle">{mission.title}</div>
                    <span className={`myPage__missionStatus ${mission.done ? "is-done" : "is-pending"}`}>
                      {mission.done ? "完了" : "挑戦中"}
                    </span>
                  </div>
                  <div className="myPage__missionText">{mission.description}</div>
                  <Link to={mission.to} className="myPage__missionBtn" onClick={() => setMissionModalOpen(false)}>
                    挑戦する
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
