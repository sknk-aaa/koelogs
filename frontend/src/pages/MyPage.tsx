import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchInsights } from "../api/insights";
import { useAuth } from "../features/auth/useAuth";
import DurationHeatmapCalendar from "../features/insights/components/DurationHeatmapCalendar";
import { RANGE_MISSION_FLAG } from "../features/missions/constants";
import type { BadgeProgress } from "../types/gamification";
import type { InsightsData } from "../types/insights";
import InfoModal from "../components/InfoModal";

import "./MyPage.css";

const HEATMAP_DAYS = 90;
const SUMMARY_DAYS_OPTIONS = [30, 90] as const;
const BADGES_COLLAPSED_COUNT = 9;
const BADGE_DISPLAY_ORDER: string[] = [
  "first_log",
  "streak_3",
  "streak_7",
  "streak_30",
  "measurement_master",
  "ai_user_5",
  "ai_user_30",
  "ai_user_50",
  "ai_user_100",
  "community_post_1",
  "community_post_5",
  "community_post_20",
  "monthly_memo_streak_1",
  "monthly_memo_streak_3",
  "monthly_memo_streak_6",
  "monthly_memo_streak_12",
  "ai_contribution_1",
  "ai_contribution_5",
  "ai_contribution_20",
  "ai_contribution_50",
  "ai_contribution_100",
  "xp_500",
  "xp_1000",
  "xp_2000",
];
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

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MyPage() {
  const { me } = useAuth();
  const [summaryDays, setSummaryDays] = useState<SummaryDays>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryInsights, setSummaryInsights] = useState<InsightsData | null>(null);
  const [heatmapInsights, setHeatmapInsights] = useState<InsightsData | null>(null);
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [badgesExpanded, setBadgesExpanded] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeProgress | null>(null);
  const [insightsReloadKey, setInsightsReloadKey] = useState(0);

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

      if (!cancelled) {
        setSummaryInsights(summaryRes.data ?? null);
        setHeatmapInsights(heatmapRes.data ?? null);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me, summaryDays, insightsReloadKey]);

  const today = summaryInsights?.range.to ?? toISODate(new Date());
  const hasDailyLog = (summaryInsights?.total_practice_days_count ?? 0) > 0;
  const hasTopNote = !!summaryInsights?.top_notes.falsetto.note || !!summaryInsights?.top_notes.chest.note;
  const hasDisplayName = !!me?.display_name?.trim();
  const progress = summaryInsights?.gamification ?? null;
  const rangeMissionOverride =
    typeof window !== "undefined" && window.localStorage.getItem(RANGE_MISSION_FLAG) === "1";

  const missions = useMemo(() => {
    if (!summaryInsights || !progress) return [] as Mission[];
    return [
      {
        key: "range",
        title: "音域を測定しよう",
        description: "裏声または地声の最高音を1つ記録してみましょう。",
        to: `/training?mission=range`,
        done: hasTopNote || rangeMissionOverride,
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
        key: "measurement",
        title: "測定をやってみよう",
        description: "トレーニング画面から1回測定を実行してみましょう。",
        to: "/training",
        done: progress.measurement_runs_count > 0,
      },
      {
        key: "ai_recommendation",
        title: "AIお勧め機能を使用してみよう",
        description: "日ログ画面でAI提案を1回生成してみましょう。",
        to: `/log?mode=day&date=${encodeURIComponent(today)}`,
        done: progress.ai_recommendations_count > 0,
      },
    ] satisfies Mission[];
  }, [hasDailyLog, hasDisplayName, hasTopNote, summaryInsights, progress, today, rangeMissionOverride]);

  useEffect(() => {
    if (!rangeMissionOverride || !hasTopNote) return;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(RANGE_MISSION_FLAG);
    }
  }, [rangeMissionOverride, hasTopNote]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setInsightsReloadKey((prev) => prev + 1);
    window.addEventListener("insights:update", handler);
    return () => {
      window.removeEventListener("insights:update", handler);
    };
  }, []);

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
  const orderedBadges = useMemo(
    () => {
      const orderMap = new Map(BADGE_DISPLAY_ORDER.map((key, index) => [key, index]));
      return [...(progress?.badges ?? [])].sort((a, b) => {
        const ai = orderMap.get(a.key) ?? Number.MAX_SAFE_INTEGER;
        const bi = orderMap.get(b.key) ?? Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return a.name.localeCompare(b.name, "ja");
      });
    },
    [progress?.badges]
  );
  const visibleBadges = useMemo(
    () => (badgesExpanded ? orderedBadges : orderedBadges.slice(0, BADGES_COLLAPSED_COUNT)),
    [badgesExpanded, orderedBadges]
  );
  const hasHiddenBadges = orderedBadges.length > BADGES_COLLAPSED_COUNT;

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
        <div className="myPage__cardTitleRow">
          <div className="myPage__cardTitle myPage__cardTitle--tight">進捗</div>
          <InfoModal
            title="XP（進捗）について"
            bodyClassName="myPage__xpInfoBody"
          >
            <div className="myPage__xpInfoLead">
              XPは「継続の証」として、日々の練習記録を評価します。
            </div>
            <div className="myPage__xpInfoBlocks">
              <section className="myPage__xpInfoBlock">
                <div className="myPage__xpInfoTitle">
                  <span className="myPage__xpInfoIcon" aria-hidden="true">📝</span>
                  <span>ログ記録</span>
                </div>
                <ul>
                  <li>日ログを保存するたびにXPを蓄積</li>
                  <li>月振り返り（メモ）を更新すると追加ボーナス</li>
                </ul>
              </section>
              <section className="myPage__xpInfoBlock">
                <div className="myPage__xpInfoTitle">
                  <span className="myPage__xpInfoIcon" aria-hidden="true">🎚</span>
                  <span>測定・分析</span>
                </div>
                <ul>
                  <li>Trainingページで測定を完了するとXP付与</li>
                  <li>Insights上で一定の計測を達成すると累積</li>
                </ul>
              </section>
              <section className="myPage__xpInfoBlock">
                <div className="myPage__xpInfoTitle">
                  <span className="myPage__xpInfoIcon" aria-hidden="true">🌐</span>
                  <span>コミュニティ + AI</span>
                </div>
                <ul>
                  <li>コミュニティ投稿を公開・貢献するとXP</li>
                  <li>AIおすすめを生成・活用してもXPを獲得</li>
                </ul>
              </section>
            </div>
            <div className="myPage__xpInfoNote">
              XPは上達の約束ではなく、継続を実感するための指標です。
            </div>
          </InfoModal>
        </div>
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
        <div className="myPage__cardTitleRow">
          <div className="myPage__cardTitle myPage__cardTitle--tight">バッジ</div>
          <div className="myPage__badgeSummary">
            {progress.badge_unlocked_count}/{progress.badge_total_count} 獲得
          </div>
        </div>
        <div className="myPage__badgeGrid">
          {visibleBadges.map((badge) => (
            <button
              type="button"
              key={badge.key}
              className={`myPage__badge ${badge.unlocked ? "is-unlocked" : "is-locked"}`}
              onClick={() => setSelectedBadge(badge)}
              aria-label={`${badge.name} の詳細を見る`}
            >
              <img src={badge.icon_path} alt={badge.name} className="myPage__badgeIcon" />
              <div className="myPage__badgeName">{badge.name}</div>
              <div className="myPage__badgeMeta">
                {badge.unlocked ? "獲得済み" : `${badge.progress_current}/${badge.progress_required}`}
              </div>
            </button>
          ))}
        </div>
        {hasHiddenBadges && (
          <button
            type="button"
            className="myPage__badgeToggle"
            aria-expanded={badgesExpanded}
            onClick={() => setBadgesExpanded((prev) => !prev)}
          >
            {badgesExpanded ? "バッジをたたむ" : `すべてのバッジを見る（${orderedBadges.length}件）`}
          </button>
        )}
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

      {selectedBadge && (
        <div
          className="myPage__modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="バッジ詳細"
          onClick={() => setSelectedBadge(null)}
        >
          <section className="myPage__modalCard myPage__badgeModalCard" onClick={(e) => e.stopPropagation()}>
            <div className="myPage__modalHead">
              <div className="myPage__modalTitle">バッジ詳細</div>
              <button type="button" className="myPage__modalClose" onClick={() => setSelectedBadge(null)}>
                閉じる
              </button>
            </div>
            <div className="myPage__badgeDetail">
              <img src={selectedBadge.icon_path} alt={selectedBadge.name} className="myPage__badgeDetailIcon" />
              <div className="myPage__badgeDetailName">{selectedBadge.name}</div>
              <div className="myPage__badgeDetailDesc">{selectedBadge.description}</div>
              <div className="myPage__badgeDetailRow">
                <span>進捗</span>
                <strong>
                  {selectedBadge.progress_current}/{selectedBadge.progress_required}
                </strong>
              </div>
              <div className="myPage__badgeDetailRow">
                <span>状態</span>
                <strong>{selectedBadge.unlocked ? "獲得済み" : "挑戦中"}</strong>
              </div>
              {selectedBadge.unlocked && (
                <div className="myPage__badgeDetailRow">
                  <span>獲得日時</span>
                  <strong>{formatDateTime(selectedBadge.unlocked_at) ?? "達成済み（同期待ち）"}</strong>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
