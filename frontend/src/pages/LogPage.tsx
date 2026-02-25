import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { fetchTrainingLogByDate } from "../api/trainingLogs";
import { fetchMonthlyLog, upsertMonthlyLog } from "../api/monthlyLogs";
import { createAiRecommendation, fetchAiRecommendationByDate } from "../api/aiRecommendations";
import { fetchInsights } from "../api/insights";
import { fetchMissions } from "../api/missions";
import type { TrainingLog } from "../types/trainingLog";
import type { AiRecommendation } from "../types/aiRecommendation";
import type { MonthlyLogData } from "../types/monthlyLog";
import type { BadgeProgress } from "../types/gamification";
import type { SaveRewards } from "../types/gamification";
import type { MissionItem, MissionsResponseData } from "../types/missions";
import { useSettings } from "../features/settings/useSettings";
import { useAuth } from "../features/auth/useAuth";
import { emitGamificationRewards } from "../features/gamification/rewardBus";
import { loadThemeMode } from "../features/theme/themeStorage";

import MonthlyLogsModal from "../features/monthlyLogs/MonthlyLogsModal";
import ProcessingOverlay from "../components/ProcessingOverlay";

import "./LogPage.css";

import LogHeader from "../features/log/components/LogHeader";
import SummaryCard from "../features/log/components/SummaryCard";
import AiRecommendationCard from "../features/log/components/AiRecommendationCard";
import WelcomeGuideModal from "../features/log/components/WelcomeGuideModal";
import { setLastLogPath } from "../features/log/logNavigation";

import { fetchMe, updateMeGoalText, type Me } from "../api/auth";
import ColoredTag from "../components/ColoredTag";
import InfoModal from "../components/InfoModal";

function pad(v: number): string {
  return String(v).padStart(2, "0");
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayISO(): string {
  return toISODate(new Date());
}

function parseISODate(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const y = Number.parseInt(m[1], 10);
  const mo = Number.parseInt(m[2], 10);
  const d = Number.parseInt(m[3], 10);
  const out = new Date(y, mo - 1, d);

  if (out.getFullYear() !== y || out.getMonth() + 1 !== mo || out.getDate() !== d) return null;
  return out;
}

function monthStartISO(month: string): string {
  const m = month.match(/^(\d{4})-(\d{2})$/);
  if (!m) return `${todayISO().slice(0, 7)}-01`;
  return `${m[1]}-${m[2]}-01`;
}

function addMonths(month: string, diff: number): string {
  const base = monthStartISO(month);
  const d = parseISODate(base) ?? new Date();
  d.setMonth(d.getMonth() + diff);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function monthLabel(month: string): string {
  const m = month.match(/^(\d{4})-(\d{2})$/);
  if (!m) return month;
  return `${m[1]}年${m[2]}月`;
}

function minutesToHoursText(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

function toPercentText(count: number, total: number): string {
  if (total <= 0) return "0.0%";
  return `${((count / total) * 100).toFixed(1)}%`;
}

const AI_PREVIEW_CHARS = 100;
const GOAL_MAX = 50;
const FIRST_LOGIN_GUIDE_KEY_PREFIX = "voice_app_log_first_guide_seen_user_";
const DARK_MODE_MISSION_FLAG = "mission_dark_mode_tried";

type LogMode = "day" | "month";
type LogPageNavState = { gamificationToast?: SaveRewards | null } | null;

function shouldCollapseText(text: string, previewChars: number) {
  return text.trim().length > previewChars;
}

function previewText(text: string, previewChars: number) {
  const t = text.trim();
  if (t.length <= previewChars) return t;
  return t.slice(0, previewChars) + "…";
}

function isWithinFirst7Days(createdAt?: string | null): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;
  const elapsedMs = Date.now() - created.getTime();
  if (elapsedMs < 0) return false;
  return elapsedMs < 7 * 24 * 60 * 60 * 1000;
}

export default function LogPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const today = useMemo(() => todayISO(), []);
  const rawMode = params.get("mode");
  const selectedDate = useMemo(() => params.get("date") || today, [params, today]);
  const selectedMonth = useMemo(
    () => params.get("month") || selectedDate.slice(0, 7),
    [params, selectedDate]
  );
  const monthKey = useMemo(() => selectedMonth, [selectedMonth]);
  const { settings } = useSettings();
  const { me: authMe, isLoading: authLoading } = useAuth();
  const guestMode = !authLoading && !authMe;

  const mode: LogMode = guestMode ? "day" : rawMode === "month" ? "month" : "day";
  const isDayMode = mode === "day";
  const isMonthMode = mode === "month";
  const currentLogPath = isMonthMode
    ? `/log?mode=month&month=${encodeURIComponent(selectedMonth)}`
    : `/log?mode=day&date=${encodeURIComponent(selectedDate)}`;

  const isToday = selectedDate === today;
  const currentMonth = useMemo(() => today.slice(0, 7), [today]);
  const canGoNextMonth = selectedMonth < currentMonth;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<TrainingLog | null>(null);
  const [currentStreakDays, setCurrentStreakDays] = useState<number | null>(null);
  const [longestStreakDays, setLongestStreakDays] = useState<number | null>(null);
  const [totalPracticeDaysCount, setTotalPracticeDaysCount] = useState<number | null>(null);
  const [saveToast, setSaveToast] = useState<SaveRewards | null>(null);
  const [missionsData, setMissionsData] = useState<MissionsResponseData | null>(null);
  const [missionDetailsOpen, setMissionDetailsOpen] = useState(false);
  const [firstGuideOpen, setFirstGuideOpen] = useState(false);
  const [showGuideHintBanner, setShowGuideHintBanner] = useState(false);

  const [monthLoading, setMonthLoading] = useState(false);
  const [monthError, setMonthError] = useState<string | null>(null);
  const [monthData, setMonthData] = useState<MonthlyLogData | null>(null);
  const [monthNotesDraft, setMonthNotesDraft] = useState("");
  const [monthSaveLoading, setMonthSaveLoading] = useState(false);
  const [monthSaveError, setMonthSaveError] = useState<string | null>(null);

  // ===== Me / Goal =====
  const [me, setMe] = useState<Me | null>(null);
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  const [goalError, setGoalError] = useState<string | null>(null);
  const [goalSaving, setGoalSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await fetchMe();
        if (cancelled) return;
        setMe(m);
        setGoalDraft(m?.goal_text ?? "");
      } catch {
        if (cancelled) return;
        setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openGoalEdit = () => {
    setGoalError(null);
    setGoalDraft(me?.goal_text ?? "");
    setGoalEditing(true);
  };

  const cancelGoalEdit = () => {
    setGoalError(null);
    setGoalDraft(me?.goal_text ?? "");
    setGoalEditing(false);
  };

  const saveGoal = async () => {
    if (!me) return;
    if (goalSaving) return;

    const v = goalDraft.trim();
    if (v.length > GOAL_MAX) {
      setGoalError(`50文字以内で入力してください（現在 ${v.length} 文字）`);
      return;
    }

    setGoalSaving(true);
    setGoalError(null);

    try {
      const updated = await updateMeGoalText(v);
      setMe(updated);
      setGoalEditing(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "保存できませんでした";
      setGoalError(msg);
    } finally {
      setGoalSaving(false);
    }
  };

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRec, setAiRec] = useState<AiRecommendation | null>(null);

  const [monthModalOpen, setMonthModalOpen] = useState(false);

  const [aiExpandedByKey, setAiExpandedByKey] = useState<Record<string, boolean>>({});
  const aiKey = isDayMode ? `day:${selectedDate}` : `month:${selectedMonth}`;
  const aiExpanded = !!aiExpandedByKey[aiKey];
  const setAiExpanded = (v: boolean | ((prev: boolean) => boolean)) => {
    setAiExpandedByKey((prev) => {
      const cur = !!prev[aiKey];
      const nextVal = typeof v === "function" ? (v as (p: boolean) => boolean)(cur) : v;
      return { ...prev, [aiKey]: nextVal };
    });
  };

  // Daily log fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authMe || !isDayMode) {
        setLoading(false);
        setError(null);
        setLog(null);
        return;
      }

      setLoading(true);
      setError(null);

      const res = await fetchTrainingLogByDate(selectedDate);
      if (cancelled) return;

      if ("error" in res && res.error) {
        setLog(null);
        setError(res.error);
      } else {
        setLog(res.data ?? null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, authMe, isDayMode]);

  // Monthly log fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authMe || !isMonthMode) {
        setMonthLoading(false);
        setMonthError(null);
        setMonthData(null);
        return;
      }

      setMonthLoading(true);
      setMonthError(null);
      setMonthSaveError(null);

      const res = await fetchMonthlyLog(selectedMonth);
      if (cancelled) return;

      if ("error" in res && res.error) {
        setMonthData(null);
        setMonthError(res.error);
      } else {
        setMonthData(res.data);
        setMonthNotesDraft(res.data?.notes ?? "");
      }
      setMonthLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedMonth, authMe, isMonthMode]);

  // streak fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authMe) {
        setCurrentStreakDays(null);
        setLongestStreakDays(null);
        setTotalPracticeDaysCount(null);
        return;
      }
      const res = await fetchInsights(30);
      if (cancelled) return;
      if ("error" in res && res.error) {
        setCurrentStreakDays(null);
        setLongestStreakDays(null);
        setTotalPracticeDaysCount(null);
        return;
      }
      setCurrentStreakDays(res.data?.streaks.current_days ?? null);
      setLongestStreakDays(res.data?.streaks.longest_days ?? null);
      setTotalPracticeDaysCount(res.data?.total_practice_days_count ?? 0);
    })();

    return () => {
      cancelled = true;
    };
  }, [authMe]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authMe || !isDayMode) {
        setMissionsData(null);
        setMissionDetailsOpen(false);
        return;
      }
      const res = await fetchMissions();
      if (cancelled) return;
      if (res.error || !res.data) {
        setMissionsData(null);
        return;
      }
      setMissionsData(res.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [authMe, isDayMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const modeFromStorage = loadThemeMode();
    const modeFromRoot = document.documentElement.dataset.themeMode;
    if (modeFromStorage === "dark" || modeFromRoot === "dark") {
      window.localStorage.setItem(DARK_MODE_MISSION_FLAG, "1");
    }
  }, []);

  // /log/new 保存後のトースト受け取り
  useEffect(() => {
    const navState = location.state as LogPageNavState;
    const incomingToast = navState?.gamificationToast ?? null;
    if (!incomingToast) return;

    setSaveToast(incomingToast);
    emitGamificationRewards(incomingToast);
    const timer = window.setTimeout(() => setSaveToast(null), 2800);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });

    return () => {
      window.clearTimeout(timer);
    };
  }, [location.pathname, location.search, location.state, navigate]);

  // daily ai recommendation fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authMe || !isDayMode) {
        setAiError(null);
        setAiRec(null);
        return;
      }

      setAiError(null);

      const res = await fetchAiRecommendationByDate(selectedDate);
      if (cancelled) return;

      if (res.error) {
        setAiError(res.error);
        return;
      }

      setAiRec(res.data ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, authMe, isDayMode]);

  useEffect(() => {
    if (authLoading || !authMe) {
      setFirstGuideOpen(false);
      return;
    }
    if (totalPracticeDaysCount === null) {
      setFirstGuideOpen(false);
      return;
    }

    const key = `${FIRST_LOGIN_GUIDE_KEY_PREFIX}${authMe.id}`;
    let seen = false;
    try {
      seen = window.localStorage.getItem(key) === "1";
    } catch {
      seen = false;
    }
    setFirstGuideOpen(!seen && totalPracticeDaysCount === 0);
  }, [authLoading, authMe, totalPracticeDaysCount]);

  const onChangeDate = (next: string) => {
    setParams({ mode: "day", date: next });
  };

  const goLogin = () => {
    const fromPath = isDayMode
      ? `/log?mode=day&date=${encodeURIComponent(selectedDate)}`
      : `/log?mode=month&month=${encodeURIComponent(selectedMonth)}`;
    navigate(`/login`, { state: { fromPath } });
  };

  const scrollToGuestPreview = () => {
    const el = document.getElementById("guest-preview");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goNew = () => {
    if (!authMe) {
      goLogin();
      return;
    }
    navigate(`/log/new?date=${encodeURIComponent(selectedDate)}`);
  };

  const onSaveMonthlyLog = async (payload: { notes: string | null }) => {
    if (!authMe) {
      goLogin();
      return;
    }
    if (monthSaveLoading) return;

    setMonthSaveLoading(true);
    setMonthSaveError(null);

    const result = await upsertMonthlyLog({
      month: selectedMonth,
      notes: payload.notes,
    });

    if (!result.ok) {
      setMonthSaveError(result.errors.join("\n"));
      setMonthSaveLoading(false);
      return;
    }

    setMonthData((prev) => (prev ? { ...prev, notes: result.data.notes ?? null } : prev));
    emitGamificationRewards(result.rewards);
    setMonthSaveLoading(false);
  };

  const onAskAi = async () => {
    if (!authMe) {
      goLogin();
      return;
    }
    if (aiLoading) return;

    setAiLoading(true);
    setAiError(null);

    const res = await createAiRecommendation({
      range_days: settings.aiRangeDays,
      date: selectedDate,
    });

    if (!res.ok) {
      setAiError(res.errors.join("\n"));
      setAiLoading(false);
      return;
    }

    setAiRec(res.data);
    emitGamificationRewards(res.rewards);
    setAiLoading(false);
    setAiExpanded(true);
  };

  const closeFirstGuide = (showHintBanner: boolean) => {
    if (authMe) {
      const key = `${FIRST_LOGIN_GUIDE_KEY_PREFIX}${authMe.id}`;
      try {
        window.localStorage.setItem(key, "1");
      } catch {
        // localStorage未使用環境では保存しない
      }
    }
    setFirstGuideOpen(false);
    setShowGuideHintBanner(showHintBanner);
  };

  const previewLog: TrainingLog = {
    id: -1,
    practiced_on: selectedDate,
    duration_min: 28,
    menus: [
      { id: -11, name: "リップロール", color: "#F59E0B", archived: false },
      { id: -12, name: "ハミング", color: "#34D399", archived: false },
      { id: -13, name: "ミックス練習", color: "#60A5FA", archived: false },
    ],
    notes: "高音で喉が締まりやすい。息の量を少し減らすと当たりが安定した。",
  };
  const previewAiRec: AiRecommendation = {
    id: -1,
    generated_for_date: selectedDate,
    range_days: settings.aiRangeDays,
    recommendation_text:
      "今日はウォームアップを10分入れてから、ミックス練習を中心に。後半はテンポを落として音程の安定を優先しましょう。",
    created_at: new Date().toISOString(),
  };

  const effectiveLog = guestMode ? previewLog : log;
  const effectiveAiRec = guestMode ? previewAiRec : aiRec;
  const currentAiText = effectiveAiRec?.recommendation_text ?? null;
  const showAiArea = isDayMode && (guestMode || !!effectiveAiRec || aiLoading || !!aiError);
  const showAiButton = isDayMode && isToday && !aiLoading && !effectiveAiRec && !aiError;

  const menuItems = effectiveLog?.menus ?? [];

  const aiTextRaw = currentAiText ?? "";
  const aiCollapsible = aiTextRaw ? shouldCollapseText(aiTextRaw, AI_PREVIEW_CHARS) : false;
  const aiShownText =
    aiTextRaw && !aiExpanded && aiCollapsible ? previewText(aiTextRaw, AI_PREVIEW_CHARS) : aiTextRaw;

  const emptyHint = isToday
    ? "最初は1項目だけでもOKです。入力した分だけ反映されます。"
    : "この日付で入力すると、今日の結果と同じ形式で表示されます。";
  const monthTotalDuration = monthData?.summary.total_duration_min ?? 0;
  const monthTotalDurationHourText = minutesToHoursText(monthTotalDuration);
  const monthTotalMenuCount = monthData?.summary.total_menu_count ?? 0;
  const monthMenuCounts = monthData?.summary.menu_counts ?? [];
  const monthPracticeDays = monthData?.daily_logs?.length ?? 0;

  const goalText = me?.goal_text ?? null;
  const isWithinInitial7Days = isWithinFirst7Days(me?.created_at);
  const aiCreateButtonText =
    !guestMode && isWithinInitial7Days
      ? "今日のおすすめをAIに作成してもらう"
      : "AI提案を作成";
  const toastLines = useMemo(() => {
    if (!saveToast) return [] as string[];
    const lines: string[] = [];
    if (saveToast.xp_earned > 0) lines.push(`+${saveToast.xp_earned} XP`);
    if ((saveToast.streak_message_days ?? 0) > 0) lines.push(`連続 ${saveToast.streak_message_days} 日達成`);
    if (saveToast.unlocked_badges.length > 0) {
      lines.push(`バッジ獲得: ${saveToast.unlocked_badges.map((b) => b.name).join(" / ")}`);
    }
    return lines;
  }, [saveToast]);

  const dailyMissionMap = useMemo(() => {
    const out = new Map<string, MissionItem>();
    for (const mission of missionsData?.daily ?? []) out.set(mission.key, mission);
    return out;
  }, [missionsData?.daily]);
  const dailyMissions = useMemo(
    () => [
      {
        key: "daily_training_log",
        shortLabel: "日ログを記録",
        to: dailyMissionMap.get("daily_training_log")?.to ?? `/log/new?date=${encodeURIComponent(today)}`,
        done: dailyMissionMap.get("daily_training_log")?.done ?? false,
      },
      {
        key: "daily_measurement",
        shortLabel: "何かしらの測定",
        to: dailyMissionMap.get("daily_measurement")?.to ?? "/training",
        done: dailyMissionMap.get("daily_measurement")?.done ?? false,
      },
      {
        key: "daily_ai_recommendation",
        shortLabel: "AI生成",
        to: dailyMissionMap.get("daily_ai_recommendation")?.to ?? `/log?mode=day&date=${encodeURIComponent(today)}`,
        done: dailyMissionMap.get("daily_ai_recommendation")?.done ?? false,
      },
    ],
    [dailyMissionMap, today]
  );
  const dailyDoneCount = dailyMissions.filter((mission) => mission.done).length;
  const darkModeMissionDone =
    typeof window !== "undefined" && window.localStorage.getItem(DARK_MODE_MISSION_FLAG) === "1";
  const beginnerMissions = useMemo(() => {
    const base = missionsData?.beginner ?? [];
    const darkModeMission: MissionItem = {
      key: "beginner_dark_mode",
      title: "ダークモードを試してみよう",
      description: "設定画面から表示テーマをダークに切り替えてみましょう。",
      to: "/settings",
      done: darkModeMissionDone,
    };
    return [...base, darkModeMission];
  }, [missionsData?.beginner, darkModeMissionDone]);
  const continuousMissions: BadgeProgress[] = missionsData?.continuous ?? [];

  useEffect(() => {
    setLastLogPath(currentLogPath);
  }, [currentLogPath]);

  return (
    <div className="page logPage">
      <ProcessingOverlay
        open={aiLoading}
        title="生成中..."
        description="今日のおすすめを作成しています"
      />
      {!!authMe && (
        <div className="logPage__modeSwitch">
          <button
            type="button"
            className={`logPage__modeBtn ${isDayMode ? "is-active" : ""}`}
            onClick={() => setParams({ mode: "day", date: selectedDate })}
          >
            日ログ
          </button>
          <button
            type="button"
            className={`logPage__modeBtn ${isMonthMode ? "is-active" : ""}`}
            onClick={() => setParams({ mode: "month", month: selectedMonth })}
          >
            月ログ
          </button>
        </div>
      )}

      {isDayMode ? (
        <LogHeader
          date={selectedDate}
          onChangeDate={onChangeDate}
        />
      ) : (
        <div className="logPage__weekHeader">
          <div className="logPage__weekHeaderLeft">
            <div className="logPage__title">ログ</div>
            <div className="logPage__muted">月の振り返りを記録</div>
          </div>

          <div className="logPage__weekNav">
            <button
              type="button"
              className="logPage__btn logPage__weekNavBtn"
              onClick={() => setParams({ mode: "month", month: addMonths(selectedMonth, -1) })}
            >
              前の月
            </button>
            <div className="logPage__weekLabel">{monthLabel(selectedMonth)}</div>
            <button
              type="button"
              className="logPage__btn logPage__weekNavBtn"
              onClick={() => setParams({ mode: "month", month: addMonths(selectedMonth, 1) })}
              disabled={!canGoNextMonth}
            >
              次の月
            </button>
            {selectedMonth !== currentMonth && (
              <button
                type="button"
                className="logPage__btn logPage__weekNowBtn"
                onClick={() => setParams({ mode: "month", month: currentMonth })}
              >
                今月へ
              </button>
            )}
            <button
              type="button"
              className="logPage__btn logPage__monthBtn"
              onClick={() => setMonthModalOpen(true)}
            >
              月のログ一覧
            </button>
          </div>
        </div>
      )}

      <WelcomeGuideModal
        open={firstGuideOpen}
        onClose={() => closeFirstGuide(true)}
        onOpenGuide={() => {
          closeFirstGuide(false);
          navigate("/help/guide");
        }}
        onStartRecord={() => {
          closeFirstGuide(false);
          navigate(`/log/new?date=${encodeURIComponent(selectedDate)}`, {
            state: { quickFromWelcome: true },
          });
        }}
      />

      {showGuideHintBanner && (
        <section className="card logPage__guideHint" role="status">
          <div className="logPage__guideHintText">迷ったら使い方を見る</div>
          <div className="logPage__guideHintActions">
            <button
              type="button"
              className="logPage__btn logPage__btn--subtle"
              onClick={() => {
                setShowGuideHintBanner(false);
                navigate("/help/guide");
              }}
            >
              使い方を見る
            </button>
            <button
              type="button"
              className="logPage__btn logPage__btn--subtle"
              onClick={() => setShowGuideHintBanner(false)}
            >
              閉じる
            </button>
          </div>
        </section>
      )}

      {toastLines.length > 0 && (
        <section className="logPage__rewardToast" role="status" aria-live="polite">
          {toastLines.map((line, idx) => (
            <div key={`${line}-${idx}`} className="logPage__rewardToastLine">{line}</div>
          ))}
        </section>
      )}

      {!!me && (
        <div className="goalBar">
          {!goalEditing ? (
            goalText ? (
              <div className="goalBar__view">
                <div className="goalBar__row">
                  <div className="goalBar__label">今月の目標</div>
                  <button className="goalBar__btn" type="button" onClick={openGoalEdit}>
                    編集
                  </button>
                </div>
                <div className="goalBar__text">「{goalText}」</div>
              </div>
            ) : (
              <div className="goalBar__view">
                <div className="goalBar__row">
                  <div className="goalBar__label">
                    {isWithinInitial7Days
                      ? "目標を設定する（最大50文字・AIおすすめに反映）"
                      : "目標を設定する（最大50文字）"}
                  </div>
                  <button className="goalBar__btn" type="button" onClick={openGoalEdit}>
                    設定する
                  </button>
                </div>
                <div className="goalBar__hint">目標を設定すると「今日のおすすめメニュー」に反映されます。</div>
              </div>
            )
          ) : (
            <div className="goalBar__edit">
              <div className="goalBar__row">
                <div className="goalBar__label">目標を編集（最大50文字）</div>
                <div className="goalBar__count">
                  {goalDraft.trim().length}/{GOAL_MAX}
                </div>
              </div>

              <input
                className="goalBar__input"
                value={goalDraft}
                type="text"
                placeholder="例：ミックスボイスを安定させる"
                onChange={(e) => {
                  const next = e.target.value;
                  setGoalDraft(next);
                  const len = next.trim().length;
                  if (len > GOAL_MAX) setGoalError(`50文字以内で入力してください（現在 ${len} 文字）`);
                  else setGoalError(null);
                }}
              />

              {goalError && <div className="goalBar__error">{goalError}</div>}

              <div className="goalBar__actions">
                <button
                  className="goalBar__btn goalBar__btn--primary"
                  type="button"
                  onClick={saveGoal}
                  disabled={goalSaving}
                >
                  保存
                </button>
                <button className="goalBar__btn" type="button" onClick={cancelGoalEdit} disabled={goalSaving}>
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!!authMe && isDayMode && (
        <section className="card logPage__missionCard">
          <div className="logPage__missionHead">
            <div className="logPage__missionTitle">🎯 今日のミッション</div>
            <div className="logPage__missionMeta">{dailyDoneCount}/3 達成</div>
          </div>

          <div className="logPage__missionDailyList">
            {dailyMissions.map((mission) =>
              mission.done ? (
                <div key={mission.key} className="logPage__missionDailyItem is-done" aria-disabled="true">
                  <span className="logPage__missionCheck" aria-hidden="true">☑</span>
                  <span>{mission.shortLabel}</span>
                </div>
              ) : (
                <button
                  key={mission.key}
                  type="button"
                  className="logPage__missionDailyItem"
                  onClick={() => navigate(mission.to)}
                >
                  <span className="logPage__missionCheck" aria-hidden="true">☐</span>
                  <span>{mission.shortLabel}</span>
                </button>
              )
            )}
          </div>

          <button
            type="button"
            className="logPage__missionMoreBtn"
            onClick={() => setMissionDetailsOpen((prev) => !prev)}
            aria-expanded={missionDetailsOpen}
          >
            {missionDetailsOpen ? "たたむ" : "もっと見る"}
          </button>

          {missionDetailsOpen && (
            <div className="logPage__missionMoreBody">
              <div className="logPage__missionSubTitle">初心者ミッション</div>
              <div className="logPage__missionBeginnerList">
                {beginnerMissions.map((mission) => (
                  <article key={mission.key} className={`logPage__missionBeginnerItem ${mission.done ? "is-done" : ""}`}>
                    <div className="logPage__missionBeginnerTop">
                      <div className="logPage__missionBeginnerName">{mission.title}</div>
                      <span className={`logPage__missionPill ${mission.done ? "is-done" : "is-pending"}`}>
                        {mission.done ? "完了" : "挑戦中"}
                      </span>
                    </div>
                    <div className="logPage__missionBeginnerDesc">{mission.description}</div>
                    {!mission.done && (
                      <button
                        type="button"
                        className="logPage__missionJumpBtn"
                        onClick={() => navigate(mission.to)}
                      >
                        挑戦する
                      </button>
                    )}
                  </article>
                ))}
              </div>

              <div className="logPage__missionSubTitle">継続ミッション</div>
              <div className="logPage__missionContinuousList">
                {continuousMissions.length === 0 ? (
                  <div className="logPage__missionContinuousEmpty">継続ミッションはまだありません。</div>
                ) : (
                  continuousMissions.map((badge) => (
                    <article key={badge.key} className={`logPage__missionContinuousItem ${badge.unlocked ? "is-done" : ""}`}>
                      <img src={badge.icon_path} alt={badge.name} className="logPage__missionContinuousIcon" />
                      <div className="logPage__missionContinuousMain">
                        <div className="logPage__missionContinuousName">{badge.name}</div>
                        <div className="logPage__missionContinuousMeta">
                          {badge.unlocked ? "獲得済み" : `${badge.progress_current}/${badge.progress_required}`}
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {isMonthMode && (
        <MonthlyLogsModal
          open={monthModalOpen}
          month={monthKey}
          onClose={() => setMonthModalOpen(false)}
          onSelectDate={(d) => {
            setParams({ mode: "day", date: d });
          }}
        />
      )}

      {guestMode && isDayMode && (
        <>
          <section className="card logPage__guestHero">
            <div className="logPage__guestHeroTitle">声の状態を記録すると、今日の練習がすぐ決まる</div>
            <div className="logPage__guestHeroText">まずはサンプルで使い方を30秒で確認できます</div>
            <div className="logPage__guestHeroActions">
              <button className="logPage__btn logPage__btn--subtle" onClick={scrollToGuestPreview}>
                サンプルを見る
              </button>
              <button className="logPage__btn logPage__btn--softAccent" onClick={goLogin}>
                ログインして始める
              </button>
            </div>
          </section>

          <section id="guest-preview" className="card logPage__guestPreview">
            <div className="logPage__guestPreviewTitle">サンプルデータ表示中（保存されません）</div>
            <div className="logPage__guestPreviewGrid">
              <article className="logPage__guestPreviewCard">
                <div className="logPage__guestPreviewCardTitle">月ごとの積み上げが見える</div>
                <div className="logPage__guestPreviewCardValue">合計 420 分 / 37 回</div>
                <div className="logPage__guestPreviewCardText">今月の日ログ・実施数・合計時間を確認</div>
              </article>

              <article className="logPage__guestPreviewCard">
                <div className="logPage__guestPreviewCardTitle">継続状況が一目で分かる</div>
                <div className="logPage__guestPreviewCardValue">現在 3 日 / 最長 11 日</div>
                <div className="logPage__guestPreviewCardText">現在連続日数 / 最長記録</div>
              </article>

              <article className="logPage__guestPreviewCard">
                <div className="logPage__guestPreviewCardTitle">次にやることが決まる</div>
                <div className="logPage__guestPreviewCardValue">今日のおすすめ</div>
                <div className="logPage__guestPreviewCardText">目標と記録からAIが提案</div>
              </article>
            </div>

            <div className="logPage__guestReCtaText">ここまでの流れをあなたのデータで始める</div>
            <button className="logPage__btn logPage__btn--softAccent" onClick={goLogin}>
              ログインして始める
            </button>
          </section>
        </>
      )}

      <div className="logPage__stack">
        {isDayMode ? (
          <SummaryCard
            loading={guestMode ? false : loading}
            error={guestMode ? null : error}
            log={effectiveLog}
            menuItems={menuItems}
            emptyHint={emptyHint}
            sampleMode={guestMode}
            recordLabel={
              guestMode
                ? "ログインして記録する"
                : isToday
                  ? "今日のトレーニングを記録"
                  : "この日のトレーニングを記録"
            }
            onClickRecord={goNew}
            currentStreakDays={guestMode ? 3 : currentStreakDays}
          />
        ) : (
          <section className="card logPage__card">
            <div className="logPage__cardHead">
              <div className="logPage__cardTitle">{monthLabel(selectedMonth)}の月ログ</div>
            </div>
            {monthLoading && <div className="logPage__muted">読み込み中…</div>}
            {!monthLoading && monthError && <div className="logPage__error">取得に失敗しました: {monthError}</div>}
            {!monthLoading && !monthError && (
              <>
                <div className="logPage__kpiRow">
                  <div className="logPage__kpi logPage__kpi--days">
                    <div className="logPage__kpiLabel">練習した日</div>
                    <div className="logPage__kpiValue">
                      <span className="logPage__kpiNumber">{monthPracticeDays}</span>
                      <span className="logPage__kpiUnit">日</span>
                    </div>
                  </div>
                  <div className="logPage__kpi logPage__kpi--time">
                    <div className="logPage__kpiLabel">累計練習時間</div>
                    <div className="logPage__kpiValue">
                      <span className="logPage__kpiNumber">{monthTotalDurationHourText}</span>
                      <span className="logPage__kpiUnit">時間</span>
                    </div>
                  </div>
                  <div className="logPage__kpi logPage__kpi--menus">
                    <div className="logPage__kpiLabel">合計実施メニュー</div>
                    <div className="logPage__kpiValue">
                      <span className="logPage__kpiNumber">{monthTotalMenuCount}</span>
                      <span className="logPage__kpiUnit">回</span>
                    </div>
                  </div>
                  <div className="logPage__kpi logPage__kpi--streak">
                    <div className="logPage__kpiLabel">最長継続日数</div>
                    <div className="logPage__kpiValue">
                      <span className="logPage__kpiNumber">{longestStreakDays ?? 0}</span>
                      <span className="logPage__kpiUnit">日</span>
                    </div>
                  </div>
                </div>

                <div className="logPage__section">
                  <div className="logPage__sectionTitle">メニュー実施数（今月）</div>
                  {monthMenuCounts.length === 0 ? (
                    <div className="logPage__muted">この月のメニュー記録はまだありません。</div>
                  ) : (
                    <div className="logPage__monthList">
                      {monthMenuCounts.map((entry) => (
                        <div key={`month-menu-count-${entry.menu_id}`} className="logPage__monthRow">
                          <div className="logPage__monthRowTop">
                          <ColoredTag
                            text={entry.name}
                            color={entry.color ?? "#E5E7EB"}
                            style={{ color: "var(--log-month-tag-text, inherit)" }}
                          />
                            <span>
                              {entry.count}回（{toPercentText(entry.count, monthTotalMenuCount)}）
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="logPage__section">
                  <div className="logPage__sectionTitle">月の振り返りメモ</div>
                  <textarea
                    className="logPage__monthMemo"
                    rows={4}
                    value={monthNotesDraft}
                    onChange={(e) => setMonthNotesDraft(e.target.value)}
                    placeholder="例: 今月の良かった点 / 来月に改善したい点"
                  />
                  <div className="logPage__actions">
                    <button
                      type="button"
                      className="logPage__btn"
                      onClick={() => void onSaveMonthlyLog({ notes: monthNotesDraft.trim() || null })}
                      disabled={monthSaveLoading}
                    >
                      {monthSaveLoading ? "保存中…" : "月メモを保存"}
                    </button>
                    {monthSaveError && <div className="logPage__error">保存に失敗しました: {monthSaveError}</div>}
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {showAiArea && (
          <AiRecommendationCard
            title="今日のおすすめメニュー"
            meta={
              `今日を含めて直近 ${settings.aiRangeDays} 日を参考`
            }
            aiLoading={aiLoading}
            aiError={guestMode && isDayMode ? null : aiError}
            recommendationText={currentAiText}
            isSaved={!!effectiveAiRec}
            sampleMode={guestMode && isDayMode}
            shownText={aiShownText}
            collapsible={aiCollapsible}
            expanded={aiExpanded}
            onToggleExpanded={() => setAiExpanded((v) => !v)}
          />
        )}
      </div>

      <div className="logPage__actions">
        {(showAiButton || (guestMode && isDayMode)) && (
          <section className="logAi logPage__card logPage__aiCtaCard logAi--empty">
            <div className="logAi__header">
              <div>
                <div className="logAi__title">AIトレーニング提案</div>
                <div className="logAi__meta">目標と直近ログから、今日のおすすめを作成</div>
              </div>
              <div className="logAi__headerRight">
                <div className="logAi__pill logAi__pill--sample">
                  {guestMode && isDayMode ? "ゲスト" : goalText ? "作成準備OK" : "目標未設定"}
                </div>
                <InfoModal
                  title="おすすめは何をもとに作られますか？"
                  bodyClassName="logPage__aiInfoBody"
                  triggerClassName="logPage__aiInfoBtn"
                >
                  <div className="logPage__aiInfoLead">直近の記録と目標から、今日の練習プランをAIが提案します。</div>
                  <div className="logPage__aiInfoBlocks">
                    <section className="logPage__aiInfoBlock logPage__aiInfoBlock--primary">
                      <div className="logPage__aiInfoBlockTitle">
                        <span className="logPage__aiInfoIcon" aria-hidden="true">🎯</span>
                        <span>主に使う</span>
                      </div>
                      <div className="logPage__aiInfoBlockText">
                        直近ログ（時間・メニュー・メモ）と目標を参考にします。
                      </div>
                    </section>
                    <section className="logPage__aiInfoBlock">
                      <div className="logPage__aiInfoBlockTitle">
                        <span className="logPage__aiInfoIcon" aria-hidden="true">💡</span>
                        <span>補助</span>
                      </div>
                      <div className="logPage__aiInfoBlockText">
                        コミュニティで投稿されたトレーニング内容を参考にすることがあります。
                      </div>
                    </section>
                    <section className="logPage__aiInfoBlock logPage__aiInfoBlock--save">
                      <div className="logPage__aiInfoBlockTitle">
                        <span className="logPage__aiInfoIcon" aria-hidden="true">🧠</span>
                        <span>保存</span>
                      </div>
                      <div className="logPage__aiInfoBlockText">
                        生成結果は当日分として保存され、後から見返せます。
                      </div>
                    </section>
                  </div>
                </InfoModal>
              </div>
            </div>

            <div className="logAi__content">
              <div className="logPage__aiCtaActions">
                <button onClick={onAskAi} className="logPage__btn logPage__aiCtaBtn">
                  {guestMode && isDayMode
                    ? "ログインしてAI提案を作成"
                    : aiCreateButtonText}
                </button>
              </div>
              {guestMode && isDayMode && (
                <div className="logAi__text logAi__text--muted logPage__aiCtaHint">
                  ログイン後は、目標と記録を使って提案します。
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
