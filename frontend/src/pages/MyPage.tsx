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
import { InfoModalItem, InfoModalItems, InfoModalLead, InfoModalSection } from "../components/InfoModalSections";
import TutorialModal from "../components/TutorialModal";
import {
  BeginnerMissionGuideCard,
  BeginnerMissionModal,
  renderMissionGroupIcon,
} from "../features/missions/components/BeginnerMissionGuide";
import { loadTutorialStage, saveTutorialStage, type TutorialStage } from "../features/tutorial/tutorialFlow";
import handPointerImage from "../assets/tutorial/pointer.png";

import "./MyPage.css";

const HEATMAP_DAYS = 90;
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
const BADGE_SHORT_NAMES: Record<string, string> = {
  first_log: "First",
  streak_3: "3-Day",
  streak_7: "7-Day",
  streak_30: "30-Day",
  xp_500: "XP 500",
  xp_1000: "XP 1K",
  xp_2000: "XP 2K",
  measurement_master: "Measure",
  ai_user_5: "AI 5",
  ai_user_30: "AI 30",
  ai_user_50: "AI 50",
  ai_user_100: "AI 100",
  community_post_1: "Post 1",
  community_post_5: "Post 5",
  community_post_20: "Post 20",
  monthly_memo_streak_1: "Month 1",
  monthly_memo_streak_3: "Month 3",
  monthly_memo_streak_6: "Month 6",
  monthly_memo_streak_12: "Month 12",
  ai_contribution_1: "AI Pick 1",
  ai_contribution_5: "AI Pick 5",
  ai_contribution_20: "AI Pick 20",
  ai_contribution_50: "AI Pick 50",
  ai_contribution_100: "AI Pick 100",
};
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

function renderMyPageSectionIcon(kind: "missions" | "badges" | "progress" | "activity" | "contribution"): React.ReactNode {
  if (kind === "missions") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M7 4h10v16H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        <path d="M9 9h6" />
        <path d="M9 13h4" />
        <path className="accent" d="m9.2 17 1.6 1.6 3.8-3.8" />
      </svg>
    );
  }
  if (kind === "badges") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="12" cy="9" r="4.2" />
        <path d="M9 13.8 7.3 20l4.7-2.4 4.7 2.4-1.7-6.2" />
      </svg>
    );
  }
  if (kind === "progress") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M4 18.5h16" />
        <rect x="5.5" y="12.3" width="2.8" height="6.2" rx="0.9" />
        <rect x="10.6" y="9.2" width="2.8" height="9.3" rx="0.9" />
        <rect className="accent-fill" x="15.7" y="6.1" width="2.8" height="12.4" rx="0.9" />
      </svg>
    );
  }
  if (kind === "contribution") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="8.3" cy="12" r="2.1" />
        <circle cx="15.7" cy="8.5" r="2.1" />
        <circle cx="15.7" cy="15.5" r="2.1" />
        <path d="M10.3 11.1 13.7 9.1" />
        <path className="accent" d="M10.3 12.9 13.7 14.9" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4 18.8h16" />
      <path d="m7 14 3-3 2.5 2.5 4-5" />
      <circle className="accent-fill" cx="18.2" cy="16.2" r="2.2" />
    </svg>
  );
}

function ProgressLevelIcon(): React.ReactNode {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path className="accent" d="M12 4.7 13.5 7.8 17 8.3 14.5 10.7 15.1 14.1 12 12.5 8.9 14.1 9.5 10.7 7 8.3 10.5 7.8Z" />
      <path d="M7.8 13.6v2.5c0 .5.3.9.7 1.2l2.7 1.5c.5.3 1.1.3 1.5 0l2.7-1.5c.4-.2.7-.7.7-1.2v-2.5" />
      <path d="M9.7 15.1h4.6" />
    </svg>
  );
}

function ProgressXpIcon(): React.ReactNode {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <circle cx="12" cy="12" r="6.9" />
      <path className="accent" d="M12 8.4v7.2" />
      <path className="accent" d="M8.4 12h7.2" />
      <path d="M17.4 6.6 18.9 5.1" />
      <path d="M5.1 18.9 6.6 17.4" />
    </svg>
  );
}

function renderMyPageInfoItemIcon(kind: "log" | "measure" | "community"): React.ReactNode {
  if (kind === "log") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <rect x="6" y="4.8" width="12" height="14.8" rx="2.4" />
        <path d="M9 9.2h6" />
        <path d="M9 12.4h6" />
        <path d="M9 15.6h4.2" />
      </svg>
    );
  }
  if (kind === "measure") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M4.8 18.5h14.4" />
        <path d="m7.2 14.6 3-3 2.4 2.3 4.2-5.2" />
        <circle cx="18.2" cy="16" r="1.8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <circle cx="8.1" cy="10" r="2.1" />
      <circle cx="15.9" cy="8.1" r="1.8" />
      <path d="M4.8 17.2c.5-2.3 2.2-3.8 4.4-3.8 1.7 0 3 .7 3.8 2" />
      <path d="M14.2 14.8c.4-1.3 1.5-2.2 2.9-2.2 1.2 0 2.2.6 2.8 1.7" />
    </svg>
  );
}

function getBadgeShortName(badge: BadgeProgress): string {
  return BADGE_SHORT_NAMES[badge.key] ?? badge.name;
}

function renderBadgeIcon(key: string): React.ReactNode {
  if (key === "first_log") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <rect x="6" y="4.5" width="12" height="15" rx="2.5" />
        <path d="M9 9h6" />
        <path d="M9 12.5h6" />
        <path className="accent" d="M9 16h4" />
      </svg>
    );
  }
  if (key.startsWith("streak_")) {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M7 5.5h10" />
        <path d="M8 3.8v3.4" />
        <path d="M16 3.8v3.4" />
        <rect x="5.5" y="6.5" width="13" height="12" rx="3" />
        <path className="accent" d="m9.3 12.3 1.9 1.9 3.6-4" />
      </svg>
    );
  }
  if (key.startsWith("xp_")) {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="12" cy="12" r="6.8" />
        <path className="accent" d="M12 8.5v7" />
        <path className="accent" d="M8.5 12h7" />
      </svg>
    );
  }
  if (key === "measurement_master") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <rect x="9" y="4.5" width="6" height="9.5" rx="3" />
        <path d="M7.2 11.5a4.8 4.8 0 0 0 9.6 0" />
        <path className="accent" d="M12 16.4v2.8" />
        <path d="M9.5 19.2h5" />
      </svg>
    );
  }
  if (key.startsWith("ai_user_")) {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M6.5 7.2a2.2 2.2 0 0 1 2.2-2.2h6.6a2.2 2.2 0 0 1 2.2 2.2v4.8a2.2 2.2 0 0 1-2.2 2.2H12l-3 2.4v-2.4H8.7a2.2 2.2 0 0 1-2.2-2.2Z" />
        <path className="accent" d="M10 9.5h4" />
        <path className="accent" d="M12 7.5v4" />
      </svg>
    );
  }
  if (key.startsWith("community_post_")) {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="9" cy="9" r="2.4" />
        <path d="M5.3 17c.2-2 1.8-3.5 3.7-3.5 2 0 3.5 1.5 3.7 3.5" />
        <circle className="accent" cx="16.4" cy="8.4" r="1.9" />
        <path d="M14.4 16.6c.2-1.6 1.5-2.8 3.1-2.8" />
      </svg>
    );
  }
  if (key.startsWith("monthly_memo_streak_")) {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M7 4.5v3" />
        <path d="M17 4.5v3" />
        <rect x="5.5" y="6.5" width="13" height="12" rx="3" />
        <path d="M5.5 10h13" />
        <path className="accent" d="M9 13.5h6" />
        <path d="M9 16h4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <circle cx="8.4" cy="12" r="2.2" />
      <circle cx="15.8" cy="8.4" r="2.2" />
      <circle cx="15.8" cy="15.8" r="2.2" />
      <path d="M10.4 11.2 13.8 9.2" />
      <path className="accent" d="M10.4 12.8 13.8 14.8" />
    </svg>
  );
}

export default function MyPage() {
  const navigate = useNavigate();
  const { me } = useAuth();
  const summaryDays = 30;
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
  const beginnerOpenMissions = beginnerMissions.filter((mission) => !mission.done);
  const beginnerDoneMissions = beginnerMissions.filter((mission) => mission.done);
  const beginnerProgressPercent = beginnerTotalCount > 0 ? Math.round((beginnerDoneCount / beginnerTotalCount) * 100) : 0;
  const dailyPendingCount = dailyMissions.filter((mission) => !mission.done).length;
  const dailyOpenMissions = dailyMissions.filter((mission) => !mission.done);
  const dailyDoneMissions = dailyMissions.filter((mission) => mission.done);
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
        <section className="myPage__hero">
          <p className="myPage__sub">読み込み中…</p>
        </section>
      </div>
    );
  }

  if (error || !summaryInsights || !heatmapInsights || !progress || !missionsData) {
    return (
      <div className="page myPage">
        <section className="myPage__hero">
          <p className="myPage__sub">データを取得できませんでした。</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page myPage">
      <section className="myPage__section myPage__section--missions">
        <div className="myPage__sectionHead">
          <div className="myPage__sectionHeadMain">
            <span className="myPage__sectionIcon" aria-hidden="true">
              {renderMyPageSectionIcon("missions")}
            </span>
            <div className="myPage__sectionEyebrow">MISSIONS</div>
          </div>
        </div>
        <div className="myPage__missionsFrame">
          <BeginnerMissionGuideCard
            buttonRef={beginnerMissionOpenBtnRef}
            className={`myPage__missionGuideCard ${forceOpenBeginnerMissionModal ? "is-guided" : ""}`}
            onClick={openBeginnerMissionModal}
            doneCount={beginnerDoneCount}
            totalCount={beginnerTotalCount}
            progressPercent={beginnerProgressPercent}
          />
        </div>
      </section>

      <section className="myPage__section">
        <div className="myPage__sectionHead">
          <div className="myPage__sectionHeadMain">
            <span className="myPage__sectionIcon" aria-hidden="true">
              {renderMyPageSectionIcon("badges")}
            </span>
            <div className="myPage__sectionEyebrow">BADGES</div>
          </div>
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
              <span className="myPage__badgeIcon" aria-hidden="true">
                {renderBadgeIcon(badge.key)}
              </span>
              <div className="myPage__badgeName">{getBadgeShortName(badge)}</div>
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

      <div className="myPage__accentGroup">
        <div className="myPage__accentWave" aria-hidden="true">
          <svg viewBox="0 0 100 16" preserveAspectRatio="none">
            <path
              fill="currentColor"
              d="M0 16V8C18 8 22 2 38 2C56 2 64 10 82 10C91 10 96 8 100 6V16Z"
            />
          </svg>
        </div>
        <div className="myPage__accentInner">
          <section className="myPage__section myPage__section--accent myPage__section--progress">
            <div className="myPage__sectionHead">
              <div className="myPage__sectionHeadMain">
                <span className="myPage__sectionIcon" aria-hidden="true">
                  {renderMyPageSectionIcon("progress")}
                </span>
                <div className="myPage__sectionEyebrow">PROGRESS</div>
              </div>
              <InfoModal
                title="XP（進捗）について"
                bodyClassName="myPage__xpInfoBody"
              >
                <InfoModalLead>XPは「継続の証」として、日々の練習記録を評価します。</InfoModalLead>
                <InfoModalSection icon={renderMyPageSectionIcon("progress")} title="PROGRESS">
                  <InfoModalItems>
                    <InfoModalItem
                      icon={renderMyPageInfoItemIcon("log")}
                      title="ログ記録"
                      description="日ログや月振り返りを保存すると、XPが積み上がります。"
                    />
                    <InfoModalItem
                      icon={renderMyPageInfoItemIcon("measure")}
                      title="測定・分析"
                      description="Trainingの測定完了やInsightsの利用でも、XPを獲得できます。"
                    />
                    <InfoModalItem
                      icon={renderMyPageInfoItemIcon("community")}
                      title="コミュニティ + AI"
                      description="コミュニティ投稿の公開やAIおすすめの活用でも、XPが増えます。"
                      meta="XPは上達の約束ではなく、継続を実感するための指標です。"
                      noDivider
                    />
                  </InfoModalItems>
                </InfoModalSection>
              </InfoModal>
            </div>
            <div className="myPage__stats">
              <div className="myPage__stat">
                <div className="myPage__statBody">
                  <div className="myPage__labelRow">
                    <span className="myPage__statIcon" aria-hidden="true">
                      {ProgressLevelIcon()}
                    </span>
                    <div className="myPage__label">Lv</div>
                  </div>
                  <div className="myPage__value">{progress.level}</div>
                </div>
              </div>
              <div className="myPage__stat">
                <div className="myPage__statBody">
                  <div className="myPage__labelRow">
                    <span className="myPage__statIcon" aria-hidden="true">
                      {ProgressXpIcon()}
                    </span>
                    <div className="myPage__label">総XP</div>
                  </div>
                  <div className="myPage__value">{progress.total_xp}</div>
                </div>
              </div>
            </div>
            <div className="myPage__xpRailMeta">
              <div className="myPage__xpRailMetaText">次のLvまで {progress.xp_to_next_level} XP</div>
            </div>
            <div className="myPage__xpRailRow">
              <div className="myPage__xpRailTag">XP</div>
              <div className="myPage__xpRail">
                <span className="myPage__xpFill" style={{ width: `${levelProgressPercent}%` }} />
              </div>
            </div>
          </section>

          <section className="myPage__section myPage__section--accent">
            <div className="myPage__sectionHead">
              <div className="myPage__sectionHeadMain">
                <span className="myPage__sectionIcon" aria-hidden="true">
                  {renderMyPageSectionIcon("activity")}
                </span>
                <div className="myPage__sectionEyebrow">ACTIVITY</div>
              </div>
            </div>
        <div className="myPage__trendHead">
          <div className="myPage__summaryPeriod">直近 {summaryDays} 日</div>
          <Link className="myPage__linkBtn" to="/insights/time" state={{ fromPath: "/mypage" }}>
            詳細 →
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

          <section className="myPage__section myPage__section--accent">
            <div className="myPage__sectionHead">
              <div className="myPage__sectionHeadMain">
                <span className="myPage__sectionIcon" aria-hidden="true">
                  {renderMyPageSectionIcon("contribution")}
                </span>
                <div className="myPage__sectionEyebrow">CONTRIBUTION</div>
              </div>
            </div>
            <div className="myPage__contribution">
              <div className="myPage__contributionValue">
                <span className="myPage__contributionLeadIcon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M8 5h8v3a4 4 0 0 1-8 0V5Z" />
                    <path d="M9.5 17h5" />
                    <path d="M12 12v5" />
                    <path d="M7 6H5.5a1.5 1.5 0 0 0 0 3H7" />
                    <path d="M17 6h1.5a1.5 1.5 0 0 1 0 3H17" />
                    <path className="accent" d="m18.4 4.2.8.8" />
                    <path className="accent" d="m5.6 4.2-.8.8" />
                  </svg>
                </span>
                あなたの投稿は <span className="myPage__contributionCount">{me?.ai_contribution_count ?? 0}回</span> AIおすすめの根拠として使われました
              </div>
              <div className="myPage__contributionHelp">
                コミュニティ投稿がAIおすすめ生成時の根拠として採用された回数です。
              </div>
            </div>
          </section>
        </div>
      </div>

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
              <span className="myPage__badgeDetailIcon" aria-hidden="true">
                {renderBadgeIcon(selectedBadge.key)}
              </span>
              <div className="myPage__badgeDetailName">{getBadgeShortName(selectedBadge)}</div>
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

      <BeginnerMissionModal
        open={beginnerMissionModalOpen}
        onClose={closeBeginnerMissionModal}
        pendingMissions={beginnerOpenMissions}
        doneMissions={beginnerDoneMissions}
        pendingStatusLabel={`残り ${beginnerPendingCount} 件`}
        overlayClassName="myPage__modalOverlay"
        cardClassName={forceSelectMeasurementMission ? "myPage__modalCard is-guide" : "myPage__modalCard"}
        cardBodyClassName="myPage__modalList"
        closeButtonHidden={forceSelectMeasurementMission}
        cardOverlay={forceSelectMeasurementMission ? <div className="myPage__modalClickBlocker" aria-hidden="true" /> : undefined}
        topContent={
          <div className="myPage__missionModalIntro">
            <p className="myPage__missionModalLead">
              ビギナーミッション完了で、AIおすすめとAIチャットが使えるようになります。
            </p>
            <div className="myPage__missionModalProgressRow">
              <span className="myPage__missionModalProgressLabel">ビギナーミッション</span>
              <span className="myPage__missionModalProgressValue">
                {beginnerDoneCount} / {beginnerTotalCount}
              </span>
            </div>
            <div className="myPage__missionModalProgressTrack" aria-hidden="true">
              <span className="myPage__missionModalProgressFill" style={{ width: `${beginnerProgressPercent}%` }} />
            </div>
          </div>
        }
        renderPendingAction={(mission) => {
          const isTarget = mission.key === "beginner_measurement";
          const lockByTutorial = forceSelectMeasurementMission && !isTarget;
          return (
            <>
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
              {isTarget && forceSelectMeasurementMission && (
                <div className="myPage__tapGuide myPage__tapGuide--inline" role="status" aria-live="polite">
                  <img src={handPointerImage} alt="" className="myPage__tapGuideFinger myPage__tapGuideImage" aria-hidden="true" />
                  <span>ここをクリック！</span>
                </div>
              )}
            </>
          );
        }}
        extraSections={
          beginnerPendingCount === 0 ? (
            <section className="myPage__missionGroup">
              <div className="myPage__missionGroupHead">
                <div className="myPage__missionGroupTitleRow">
                  <span className="myPage__missionGroupIcon" aria-hidden="true">
                    {renderMissionGroupIcon("daily")}
                  </span>
                  <div className="myPage__missionGroupTitle">DAILY</div>
                </div>
                <span className={`myPage__missionStatus ${dailyPendingCount === 0 ? "is-done" : "is-pending"}`}>
                  {dailyPendingCount === 0 ? "完了" : `残り ${dailyPendingCount} 件`}
                </span>
              </div>
              {dailyOpenMissions.map((mission) => {
                const lockByTutorial = forceSelectMeasurementMission;
                return (
                  <article
                    key={mission.key}
                    className={`myPage__modalMission ${lockByTutorial ? "is-locked" : ""}`}
                  >
                    <div className="myPage__modalMissionTop">
                      <div className="myPage__missionTitle">{mission.title}</div>
                      <div className="myPage__missionActionWrap">
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
                      </div>
                    </div>
                  </article>
                );
              })}
              {dailyDoneMissions.length > 0 && (
                <div className="myPage__missionSubgroupLabelRow">
                  <span className="myPage__missionGroupIcon" aria-hidden="true">
                    {renderMissionGroupIcon("completed")}
                  </span>
                  <div className="myPage__missionSubgroupLabel">COMPLETED</div>
                </div>
              )}
              {dailyDoneMissions.map((mission) => (
                <article key={mission.key} className="myPage__modalMission is-done">
                  <div className="myPage__modalMissionTop">
                    <div className="myPage__missionTitle">{mission.title}</div>
                    <span className="myPage__missionStatus is-done">達成</span>
                  </div>
                </article>
              ))}
            </section>
          ) : undefined
        }
      />

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
        title="AIおすすめとAIチャットが解放されました"
        paragraphs={[
          "ログページでAIおすすめを生成でき、AIチャットでも自由な相談やおすすめへの質問ができるようになります。",
        ]}
        primaryLabel="さっそく使ってみる"
        secondaryLabel="あとで"
        onPrimary={() => {
          setBeginnerCompletionModalStep(null);
          navigate("/log");
        }}
        onSecondary={() => setBeginnerCompletionModalStep(null)}
        onClose={() => setBeginnerCompletionModalStep(null)}
      />
    </div>
  );
}
