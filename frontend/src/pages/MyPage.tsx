import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { fetchInsights } from "../api/insights";
import { fetchMissions } from "../api/missions";
import { useAuth } from "../features/auth/useAuth";
import DurationHeatmapCalendar from "../features/insights/components/DurationHeatmapCalendar";
import type { BadgeProgress } from "../types/gamification";
import type { InsightsData } from "../types/insights";
import type { MissionsResponseData } from "../types/missions";
import InfoModal from "../components/InfoModal";
import TutorialModal from "../components/TutorialModal";
import { loadTutorialStage, saveTutorialStage, type TutorialStage } from "../features/tutorial/tutorialFlow";
import handPointerImage from "../assets/tutorial/pointer.png";

import "./MyPage.css";

const HEATMAP_DAYS = 90;
const SUMMARY_DAYS_OPTIONS = [30, 90] as const;
const BADGES_COLLAPSED_COUNT = 9;
const BEGINNER_COMPLETE_MODAL_SEEN_KEY_PREFIX = "koelogs:beginner_complete_modal_seen:user_";
const BEGINNER_LAST_PENDING_KEY_PREFIX = "koelogs:beginner_last_pending:user_";
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
  const navigate = useNavigate();
  const { me } = useAuth();
  const [summaryDays, setSummaryDays] = useState<SummaryDays>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryInsights, setSummaryInsights] = useState<InsightsData | null>(null);
  const [heatmapInsights, setHeatmapInsights] = useState<InsightsData | null>(null);
  const [missionsData, setMissionsData] = useState<MissionsResponseData | null>(null);
  const [badgesExpanded, setBadgesExpanded] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeProgress | null>(null);
  const [insightsReloadKey, setInsightsReloadKey] = useState(0);
  const [tutorialStage, setTutorialStage] = useState<TutorialStage | null>(null);
  const [beginnerMissionModalOpen, setBeginnerMissionModalOpen] = useState(false);
  const [beginnerCompletionModalStep, setBeginnerCompletionModalStep] = useState<"congrats" | "unlocked" | null>(null);
  const [missionGuideStep, setMissionGuideStep] = useState<"overview" | "log_link" | "measurement_start" | null>(null);
  const beginnerMissionOpenBtnRef = useRef<HTMLButtonElement | null>(null);
  const beginnerMeasurementMissionBtnRef = useRef<HTMLAnchorElement | null>(null);
  const [guideHandPos, setGuideHandPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!me) {
        setSummaryInsights(null);
        setHeatmapInsights(null);
        setMissionsData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const [summaryRes, heatmapRes, missionsRes] = await Promise.all([
        fetchInsights(summaryDays),
        fetchInsights(HEATMAP_DAYS),
        fetchMissions(),
      ]);
      if (cancelled) return;

      const summaryError = "error" in summaryRes ? summaryRes.error : null;
      const heatmapError = "error" in heatmapRes ? heatmapRes.error : null;
      if (summaryError || heatmapError || missionsRes.error || !missionsRes.data) {
        setError(summaryError || heatmapError || missionsRes.error || "データを取得できませんでした。");
        setSummaryInsights(null);
        setHeatmapInsights(null);
        setMissionsData(null);
        setLoading(false);
        return;
      }

      if (!cancelled) {
        setSummaryInsights(summaryRes.data ?? null);
        setHeatmapInsights(heatmapRes.data ?? null);
        setMissionsData(missionsRes.data);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me, summaryDays, insightsReloadKey]);

  const progress = summaryInsights?.gamification ?? null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setInsightsReloadKey((prev) => prev + 1);
    window.addEventListener("insights:update", handler);
    return () => {
      window.removeEventListener("insights:update", handler);
    };
  }, []);

  useEffect(() => {
    if (!me) {
      setTutorialStage(null);
      return;
    }
    const stage = loadTutorialStage(me.id);
    if (
      stage === "mypage_intro" ||
      stage === "mypage_open_mission_modal" ||
      stage === "mypage_force_click_measurement"
    ) {
      setTutorialStage(stage);
      return;
    }
    setTutorialStage(null);
  }, [me]);

  useEffect(() => {
    if (tutorialStage === "mypage_force_click_measurement") {
      setBeginnerMissionModalOpen(true);
    }
  }, [tutorialStage]);

  const tutorialMeasurementDone = useMemo(() => {
    if (!me) return false;
    const stage = loadTutorialStage(me.id);
    return stage === "range_measured" || stage === "tutorial_completed" || stage === "completed";
  }, [me, tutorialStage]);
  const beginnerMissions = useMemo(
    () =>
      (missionsData?.beginner ?? []).map((mission) =>
        mission.key === "beginner_measurement" ? { ...mission, done: mission.done || tutorialMeasurementDone } : mission
      ),
    [missionsData?.beginner, tutorialMeasurementDone]
  );
  const dailyMissions = missionsData?.daily ?? [];
  const continuousMissions = missionsData?.continuous ?? [];
  const beginnerTotalCount = beginnerMissions.length;
  const beginnerPendingCount = beginnerMissions.filter((mission) => !mission.done).length;
  const beginnerDoneCount = Math.max(0, beginnerTotalCount - beginnerPendingCount);
  const beginnerProgressPercent = beginnerTotalCount > 0 ? Math.round((beginnerDoneCount / beginnerTotalCount) * 100) : 0;
  const dailyPendingCount = dailyMissions.filter((mission) => !mission.done).length;
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
      return [...continuousMissions].sort((a, b) => {
        const ai = orderMap.get(a.key) ?? Number.MAX_SAFE_INTEGER;
        const bi = orderMap.get(b.key) ?? Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return a.name.localeCompare(b.name, "ja");
      });
    },
    [continuousMissions]
  );
  const visibleBadges = useMemo(
    () => (badgesExpanded ? orderedBadges : orderedBadges.slice(0, BADGES_COLLAPSED_COUNT)),
    [badgesExpanded, orderedBadges]
  );
  const hasHiddenBadges = orderedBadges.length > BADGES_COLLAPSED_COUNT;
  const forceOpenBeginnerMissionModal = tutorialStage === "mypage_open_mission_modal" && !beginnerMissionModalOpen;
  const forceSelectMeasurementMission = tutorialStage === "mypage_force_click_measurement";
  const tutorialPointerActive = forceOpenBeginnerMissionModal || forceSelectMeasurementMission;
  const targetMeasurementDone = beginnerMissions.some((mission) => mission.key === "beginner_measurement" && mission.done);

  useEffect(() => {
    const current = beginnerPendingCount;
    if (!me || beginnerTotalCount === 0) return;

    const seenKey = `${BEGINNER_COMPLETE_MODAL_SEEN_KEY_PREFIX}${me.id}`;
    const lastPendingKey = `${BEGINNER_LAST_PENDING_KEY_PREFIX}${me.id}`;
    let lastPending: number | null = null;
    let alreadyShown = false;

    try {
      const raw = window.localStorage.getItem(lastPendingKey);
      lastPending = raw == null ? null : Number.parseInt(raw, 10);
      alreadyShown = window.localStorage.getItem(seenKey) === "1";
    } catch {
      lastPending = null;
      alreadyShown = false;
    }

    if (current === 0 && !alreadyShown && lastPending != null && lastPending > 0) {
      setBeginnerCompletionModalStep("congrats");
      try {
        window.localStorage.setItem(seenKey, "1");
      } catch {
        // no-op
      }
    }

    if (current > 0) {
      try {
        window.localStorage.removeItem(seenKey);
      } catch {
        // no-op
      }
    }

    try {
      window.localStorage.setItem(lastPendingKey, String(current));
    } catch {
      // no-op
    }
  }, [beginnerPendingCount, beginnerTotalCount, me]);

  useEffect(() => {
    if (!me || !forceSelectMeasurementMission || !targetMeasurementDone) return;
    saveTutorialStage(me.id, "training_range_intro");
    setTutorialStage(null);
    navigate("/training?mission=range&tutorial=beginner");
  }, [forceSelectMeasurementMission, me, navigate, targetMeasurementDone]);

  useEffect(() => {
    if (!forceOpenBeginnerMissionModal) return;
    const id = window.setTimeout(() => {
      beginnerMissionOpenBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(id);
  }, [forceOpenBeginnerMissionModal]);

  useEffect(() => {
    if (!forceSelectMeasurementMission || !beginnerMissionModalOpen) return;
    const id = window.setTimeout(() => {
      beginnerMeasurementMissionBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(id);
  }, [beginnerMissionModalOpen, forceSelectMeasurementMission]);

  useEffect(() => {
    if (!forceOpenBeginnerMissionModal) {
      setGuideHandPos(null);
      return;
    }
    const target = beginnerMissionOpenBtnRef.current;
    if (!target) return;

    const update = () => {
      const rect = target.getBoundingClientRect();
      setGuideHandPos({
        left: rect.left + rect.width * 0.5,
        top: rect.top + rect.height - 24,
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [forceOpenBeginnerMissionModal]);

  useEffect(() => {
    if (!tutorialPointerActive) {
      delete document.body.dataset.mypageTutorialLockFooter;
      return;
    }
    document.body.dataset.mypageTutorialLockFooter = "true";
    return () => {
      delete document.body.dataset.mypageTutorialLockFooter;
    };
  }, [tutorialPointerActive]);

  const openBeginnerMissionModal = () => {
    setBeginnerMissionModalOpen(true);
    if (me && tutorialStage === "mypage_open_mission_modal") {
      setMissionGuideStep("overview");
    }
  };

  const closeBeginnerMissionModal = () => {
    if (forceSelectMeasurementMission || missionGuideStep) return;
    setBeginnerMissionModalOpen(false);
  };
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

  if (error || !summaryInsights || !heatmapInsights || !progress || !missionsData) {
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
        <div className="myPage__cardTitle myPage__cardTitle--tight">ミッション</div>
        <button
          type="button"
          ref={beginnerMissionOpenBtnRef}
          className={`myPage__missionGuideCard ${forceOpenBeginnerMissionModal ? "is-guided" : ""}`}
          onClick={openBeginnerMissionModal}
        >
          <div className="myPage__missionGuideTitle">ミッションをクリアしよう</div>
          <div className="myPage__missionGuideMetaRow">
            <span className="myPage__missionGuideLabel">ビギナーミッション</span>
            <span className="myPage__missionGuideCount">
              {beginnerDoneCount} / {beginnerTotalCount}
            </span>
            <span className="myPage__missionGuideArrow" aria-hidden="true">
              ›
            </span>
          </div>
          <span className="myPage__missionGuideProgressTrack" aria-hidden="true">
            <span className="myPage__missionGuideProgressFill" style={{ width: `${beginnerProgressPercent}%` }} />
          </span>
        </button>
      </section>

      <section className="card myPage__card">
        <div className="myPage__cardTitleRow">
          <div className="myPage__cardTitle myPage__cardTitle--tight">継続ミッション（バッジ）</div>
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

      {beginnerMissionModalOpen && (
        <div
          className="myPage__modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="ミッション一覧"
          onClick={closeBeginnerMissionModal}
        >
          <section className={`myPage__modalCard ${forceSelectMeasurementMission ? "is-guide" : ""}`} onClick={(e) => e.stopPropagation()}>
            {forceSelectMeasurementMission && <div className="myPage__modalClickBlocker" aria-hidden="true" />}
            <div className="myPage__modalHead">
              <div className="myPage__modalTitle">ミッション一覧</div>
              {!forceSelectMeasurementMission && (
                <button type="button" className="myPage__modalClose" onClick={closeBeginnerMissionModal}>
                  閉じる
                </button>
              )}
            </div>
            <div className="myPage__modalList">
              <section className="myPage__missionGroup">
                <div className="myPage__missionGroupHead">
                  <div className="myPage__missionGroupTitle">ビギナーミッション</div>
                  <span className={`myPage__missionStatus ${beginnerPendingCount === 0 ? "is-done" : "is-pending"}`}>
                    {beginnerPendingCount === 0 ? "完了" : `残り ${beginnerPendingCount} 件`}
                  </span>
                </div>
              {beginnerMissions.map((mission) => {
                const isTarget = mission.key === "beginner_measurement";
                const lockByTutorial = forceSelectMeasurementMission && !isTarget;
                const showAction = !mission.done;
                return (
                  <article
                    key={mission.key}
                    className={`myPage__modalMission ${mission.done ? "is-done" : ""} ${lockByTutorial ? "is-locked" : ""}`}
                  >
                    <div className="myPage__modalMissionTop">
                      <div className="myPage__missionTitle">{mission.title}</div>
                      <span className={`myPage__missionStatus ${mission.done ? "is-done" : "is-pending"}`}>
                        {mission.done ? "達成" : "未達成"}
                      </span>
                    </div>
                    <div className="myPage__missionText">{mission.description}</div>
                    {showAction && (
                      <div className="myPage__missionActionWrap">
                        <Link
                          to={mission.to}
                          ref={isTarget ? beginnerMeasurementMissionBtnRef : undefined}
                          className={`myPage__missionBtn ${lockByTutorial ? "is-disabled" : ""} ${isTarget && forceSelectMeasurementMission ? "is-guided" : ""}`}
                          onClick={(e) => {
                            if (lockByTutorial) {
                              e.preventDefault();
                              return;
                            }
                            if (isTarget && forceSelectMeasurementMission) {
                              e.preventDefault();
                              if (!me) return;
                              saveTutorialStage(me.id, "training_range_intro");
                              setTutorialStage(null);
                              setBeginnerMissionModalOpen(false);
                              navigate("/training?mission=range&tutorial=beginner");
                              return;
                            }
                            if (mission.key === "beginner_daily_log") {
                              e.preventDefault();
                              const now = new Date();
                              const yyyy = String(now.getFullYear());
                              const mm = String(now.getMonth() + 1).padStart(2, "0");
                              const dd = String(now.getDate()).padStart(2, "0");
                              setBeginnerMissionModalOpen(false);
                              navigate(`/log?mode=day&date=${yyyy}-${mm}-${dd}&missionGuide=beginner_daily_log`);
                              return;
                            }
                            if (mission.key === "beginner_ai") {
                              e.preventDefault();
                              const now = new Date();
                              const yyyy = String(now.getFullYear());
                              const mm = String(now.getMonth() + 1).padStart(2, "0");
                              const dd = String(now.getDate()).padStart(2, "0");
                              const aiCustomizationDone =
                                beginnerMissions.find((item) => item.key === "beginner_ai_customization")?.done === true;
                              setBeginnerMissionModalOpen(false);
                              navigate(
                                `/log?mode=day&date=${yyyy}-${mm}-${dd}&missionGuide=beginner_ai&aiCustomDone=${aiCustomizationDone ? "1" : "0"}`
                              );
                            }
                          }}
                          aria-disabled={lockByTutorial}
                        >
                          挑戦する
                        </Link>
                        {isTarget && forceSelectMeasurementMission && !mission.done && (
                          <div className="myPage__tapGuide myPage__tapGuide--inline" role="status" aria-live="polite">
                            <img src={handPointerImage} alt="" className="myPage__tapGuideFinger myPage__tapGuideImage" aria-hidden="true" />
                            <span>ここをクリック！</span>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
              </section>
              {beginnerPendingCount === 0 && (
                <section className="myPage__missionGroup">
                  <div className="myPage__missionGroupHead">
                    <div className="myPage__missionGroupTitle">デイリーミッション</div>
                    <span className={`myPage__missionStatus ${dailyPendingCount === 0 ? "is-done" : "is-pending"}`}>
                      {dailyPendingCount === 0 ? "完了" : `残り ${dailyPendingCount} 件`}
                    </span>
                  </div>
                  {dailyMissions.map((mission) => {
                    const lockByTutorial = forceSelectMeasurementMission;
                    return (
                      <article
                        key={mission.key}
                        className={`myPage__modalMission ${mission.done ? "is-done" : ""} ${lockByTutorial ? "is-locked" : ""}`}
                      >
                        <div className="myPage__modalMissionTop">
                          <div className="myPage__missionTitle">{mission.title}</div>
                          <span className={`myPage__missionStatus ${mission.done ? "is-done" : "is-pending"}`}>
                            {mission.done ? "達成" : "未達成"}
                          </span>
                        </div>
                        <div className="myPage__missionText">{mission.description}</div>
                        {!mission.done && (
                          <Link
                            to={mission.to}
                            className={`myPage__missionBtn ${lockByTutorial ? "is-disabled" : ""}`}
                            onClick={(e) => {
                              if (lockByTutorial) e.preventDefault();
                            }}
                            aria-disabled={lockByTutorial}
                          >
                            挑戦する
                          </Link>
                        )}
                      </article>
                    );
                  })}
                </section>
              )}
            </div>
          </section>
        </div>
      )}

      {forceOpenBeginnerMissionModal && (
        <>
          <div className="myPage__guideOverlay" aria-hidden="true" />
          {guideHandPos && (
            <div
              className="myPage__guideHand"
              style={{ left: `${guideHandPos.left}px`, top: `${guideHandPos.top}px` }}
              role="status"
              aria-live="polite"
              aria-label="ここをタップ"
            >
              <img src={handPointerImage} alt="" className="myPage__guideHandIcon myPage__guideHandImage" aria-hidden="true" />
            </div>
          )}
        </>
      )}

      <TutorialModal
        open={tutorialStage === "mypage_intro"}
        badge="MISSION"
        title="ビギナーミッション"
        paragraphs={[
          "上から順に進めるだけで、Koelogsの基本機能をひと通り体験できます。",
          "迷ったら、まずはここから始めてみましょう。",
        ]}
        primaryLabel="ビギナーミッションを確認する"
        onPrimary={() => {
          if (!me) return;
          saveTutorialStage(me.id, "mypage_open_mission_modal");
          setTutorialStage("mypage_open_mission_modal");
        }}
        onClose={() => {}}
      />

      <TutorialModal
        open={missionGuideStep === "overview"}
        badge="MISSION"
        title="ビギナーミッション一覧"
        paragraphs={[
          "ここでは、ビギナーミッションを一覧で確認できます。",
          "順番にこなしていくと、Koelogsの機能をひと通り体感できます。",
        ]}
        primaryLabel="次へ"
        onPrimary={() => setMissionGuideStep("log_link")}
        onClose={() => {}}
      />

      <TutorialModal
        open={missionGuideStep === "log_link"}
        badge="MISSION"
        title="ログページからも確認できます"
        paragraphs={["ビギナーミッションは「ログ」ページからも確認できます。困ったらいつでも見直せます。"]}
        primaryLabel="次へ"
        onPrimary={() => setMissionGuideStep("measurement_start")}
        onClose={() => {}}
      />

      <TutorialModal
        open={missionGuideStep === "measurement_start"}
        badge="MISSION"
        title="最初のミッションを進めましょう"
        paragraphs={["「測定を1回やってみよう」をクリックして、トレーニング画面で測定を1つ実行してみましょう。"]}
        primaryLabel="わかった"
        onPrimary={() => {
          if (!me) return;
          saveTutorialStage(me.id, "mypage_force_click_measurement");
          setTutorialStage("mypage_force_click_measurement");
          setMissionGuideStep(null);
        }}
        onClose={() => {}}
      />

      <TutorialModal
        open={beginnerCompletionModalStep === "congrats"}
        badge="MISSION CLEAR"
        title="おめでとうございます！"
        paragraphs={["ビギナーミッションをすべてクリアしました。"]}
        primaryLabel="次へ"
        onPrimary={() => setBeginnerCompletionModalStep("unlocked")}
        onClose={() => {}}
      />

      <TutorialModal
        open={beginnerCompletionModalStep === "unlocked"}
        badge="UNLOCKED"
        title="AIチャット機能が解放されました"
        paragraphs={[
          "ここでは、自由な会話の作成やAIおすすめに対しての質問が可能になります。",
        ]}
        primaryLabel="さっそく使ってみる"
        secondaryLabel="あとで"
        onPrimary={() => {
          setBeginnerCompletionModalStep(null);
          navigate("/chat");
        }}
        onSecondary={() => setBeginnerCompletionModalStep(null)}
        onClose={() => setBeginnerCompletionModalStep(null)}
      />
    </div>
  );
}
