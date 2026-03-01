import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { fetchTrainingLogByDate } from "../api/trainingLogs";
import { fetchMonthlyLog, fetchMonthlyLogComparison, upsertMonthlyLog } from "../api/monthlyLogs";
import { createAiRecommendation, fetchAiRecommendationByDate } from "../api/aiRecommendations";
import { fetchInsights } from "../api/insights";
import { fetchMissions } from "../api/missions";
import type { TrainingLog } from "../types/trainingLog";
import type { AiRecommendation } from "../types/aiRecommendation";
import type { MonthlyLogComparisonData, MonthlyLogData } from "../types/monthlyLog";
import type { SaveRewards } from "../types/gamification";
import type { MissionItem } from "../types/missions";
import { useSettings } from "../features/settings/useSettings";
import { useAuth } from "../features/auth/useAuth";
import { emitGamificationRewards } from "../features/gamification/rewardBus";
import { improvementTagToneClass } from "../features/improvementTags/improvementTags";

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
import PremiumUpsellModal from "../components/PremiumUpsellModal";

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

function formatPctText(pct: number | null | undefined): string {
  if (typeof pct !== "number" || Number.isNaN(pct) || !Number.isFinite(pct)) return "—";
  const prefix = pct > 0 ? "+" : "";
  return `${prefix}${pct.toFixed(1)}%`;
}

function formatGrowthText(current: number | null, previous: number | null, pct: number | null | undefined): string {
  if (current == null || previous == null) return "—";
  if (previous === 0) return current > 0 ? "新規" : "—";
  return formatPctText(pct);
}

function diffToneClass(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return "is-neutral";
  if (value > 0) return "is-positive";
  if (value < 0) return "is-negative";
  return "is-neutral";
}

function growthToneClass(current: number | null, previous: number | null, pct: number | null | undefined): string {
  if (current == null || previous == null) return "is-neutral";
  if (previous === 0) return current > 0 ? "is-new" : "is-neutral";
  if (typeof pct !== "number" || Number.isNaN(pct) || !Number.isFinite(pct)) return "is-neutral";
  if (pct > 0) return "is-positive";
  if (pct < 0) return "is-negative";
  return "is-neutral";
}

function formatMinutesPerDay(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}分/日`;
}

function formatDiffMinutesPerDay(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return "—";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}分`;
}

function movementArrow(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return "→";
  if (value > 0) return "↑";
  if (value < 0) return "↓";
  return "→";
}

function renderActionIcon(index: number): React.ReactNode {
  const icons = [
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M20 7 10 17l-5-5" />
    </svg>,
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M14 6h4v4" />
      <path d="M10 18H6v-4" />
      <path d="m18 6-6 6" />
      <path d="m6 18 6-6" />
    </svg>,
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M12 3v18" />
      <path d="M5 10h14" />
      <path d="M6 16c2.2-1.5 4-2.2 6-2.2s3.8.7 6 2.2" />
    </svg>,
  ];
  return icons[index % icons.length];
}

type PracticeStatus = "improved" | "declined" | "stable" | "new";
type PerformanceStatus = "improved" | "declined" | "insufficient";
type DiagnosticBucketKey = "improved" | "declined";
type MeasurementChangeItem = MonthlyLogComparisonData["measurement_changes"][number];

type ComparisonDiagnosis = {
  header: string;
  summary: string;
  advice: string;
  reference: boolean;
  practiceStatus: PracticeStatus;
  performanceStatus: PerformanceStatus;
  buckets: Record<DiagnosticBucketKey, MeasurementChangeItem[]>;
  reasons: string[];
  actions: string[];
};

function practiceStatusLabel(status: PracticeStatus): string {
  if (status === "improved") return "改善";
  if (status === "declined") return "低下";
  if (status === "stable") return "横ばい";
  return "判定中";
}

function performanceStatusLabel(status: PerformanceStatus): string {
  if (status === "improved") return "改善傾向";
  if (status === "declined") return "注意";
  return "判定中";
}

function summarizeMeasurementNames(items: MeasurementChangeItem[]): string {
  if (items.length === 0) return "なし";
  const labels = items.slice(0, 3).map((item) => shortMeasurementLabel(item)).join(" / ");
  const remain = items.length - 3;
  return remain > 0 ? `${labels} +${remain}件` : labels;
}

function topLabel(items: MeasurementChangeItem[]): string | null {
  return items[0] ? shortMeasurementLabel(items[0]) : null;
}

function shortMeasurementLabel(item: MeasurementChangeItem): string {
  if (item.key === "long_tone_sustain_sec") return "ロングトーン";
  if (item.key === "pitch_error_semitones") return "音程正確性";
  if (item.key === "volume_stability_pct") return "音量安定性";
  if (item.key === "chest_top_note") return "地声最高音";
  if (item.key === "falsetto_top_note") return "裏声最高音";
  return item.label;
}

function measurementTagKey(item: MeasurementChangeItem): string {
  if (item.key === "long_tone_sustain_sec") return "long_tone_sustain";
  if (item.key === "pitch_error_semitones") return "pitch_accuracy";
  if (item.key === "volume_stability_pct") return "volume_stability";
  if (item.key === "chest_top_note") return "high_note_ease";
  if (item.key === "falsetto_top_note") return "passaggio_smoothness";
  return "resonance_clarity";
}

function classifyMeasurementDirection(item: MeasurementChangeItem): DiagnosticBucketKey | null {
  const diff = item.diff;
  if (typeof diff !== "number" || !Number.isFinite(diff) || diff === 0) return null;
  if (item.better === "lower") {
    return diff < 0 ? "improved" : "declined";
  }
  return diff > 0 ? "improved" : "declined";
}

function measurementDiffToneClass(item: MeasurementChangeItem): "is-positive" | "is-negative" | "is-neutral" {
  const diff = item.diff;
  if (typeof diff !== "number" || !Number.isFinite(diff) || diff === 0) return "is-neutral";
  if (item.better === "lower") {
    return diff < 0 ? "is-positive" : "is-negative";
  }
  return diff > 0 ? "is-positive" : "is-negative";
}

function buildComparisonDiagnosis(data: MonthlyLogComparisonData): ComparisonDiagnosis {
  const practice = data.practice_time;
  const currentDays = practice.current_days ?? 0;
  const previousValue = practice.previous;
  const pct = practice.pct;
  const practiceStatus: PracticeStatus =
    previousValue == null || previousValue === 0
      ? "new"
      : typeof pct === "number" && pct >= 10
        ? "improved"
        : typeof pct === "number" && pct <= -10
          ? "declined"
          : "stable";

  const buckets: Record<DiagnosticBucketKey, MeasurementChangeItem[]> = {
    improved: [],
    declined: [],
  };
  data.measurement_changes.forEach((item) => {
    const direction = classifyMeasurementDirection(item);
    if (direction) buckets[direction].push(item);
  });

  const improvedCount = buckets.improved.length;
  const declinedCount = buckets.declined.length;
  const performanceStatus: PerformanceStatus =
    improvedCount + declinedCount === 0
      ? "insufficient"
      : declinedCount > improvedCount
        ? "declined"
        : "improved";

  const currentMeasurementCount = data.measurement_changes.reduce((sum, item) => sum + item.current.count, 0);
  const reference = currentDays < 3 || currentMeasurementCount < 2;

  const summary =
    reference
      ? "今月の記録をもとに傾向を表示しています。"
      : performanceStatus === "declined"
        ? "実力は少し下がり気味です。"
        : performanceStatus === "improved"
          ? "実力は改善傾向です。"
          : "測定データをもとに傾向を確認中です。";

  const advice =
    reference
      ? ""
      : performanceStatus === "declined"
          ? "測定の「悪化」項目を優先的に見直しましょう。"
          : performanceStatus === "improved"
            ? "今月の良い流れを維持しましょう。"
            : "重点項目を1つに絞って継続しましょう。";

  const header = reference ? "練習：確認中 / 実力：確認中" : `練習：${practiceStatusLabel(practiceStatus)} / 実力：${performanceStatusLabel(performanceStatus)}`;

  const reasons: string[] = [];
  if (buckets.improved.length > 0) reasons.push(`${summarizeMeasurementNames(buckets.improved)} は改善傾向です。`);
  if (buckets.declined.length > 0) reasons.push(`${summarizeMeasurementNames(buckets.declined)} は少し下がり気味です。`);
  if (reasons.length === 0) reasons.push("今月の記録は全体的に安定しています。");

  const actions: string[] = [];
  const declinedTarget = topLabel(buckets.declined);
  if (declinedTarget) actions.push(`${declinedTarget} を立て直すメニューを週2回だけ追加してみましょう。`);
  const improvedTarget = topLabel(buckets.improved);
  if (improvedTarget) actions.push(`${improvedTarget} は良い流れなので、今のメニューを維持しましょう。`);
  if (actions.length === 0) actions.push("今月のペースを維持しながら、1項目だけ重点的に続けましょう。");

  return {
    header,
    summary,
    advice,
    reference,
    practiceStatus,
    performanceStatus,
    buckets,
    reasons: reasons.slice(0, 3),
    actions: actions.slice(0, 3),
  };
}

const AI_PREVIEW_CHARS = 100;
const GOAL_MAX = 50;
const FIRST_LOGIN_GUIDE_KEY_PREFIX = "voice_app_log_first_guide_seen_user_";
const BEGINNER_MISSIONS_OPEN_KEY = "koelogs:beginner_missions_open";

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

function monthlyTrendNote(rangeDays: 14 | 30 | 90): string {
  if (rangeDays === 30) return "傾向=直近1か月の月ログ";
  if (rangeDays === 90) return "傾向=直近3か月の月ログ";
  return "傾向=月ログ参照なし";
}

function aiReferenceMeta(rangeDays: 14 | 30 | 90): string {
  return `詳細=直近14日 / ${monthlyTrendNote(rangeDays)}`;
}

function normalizeAiRangeDays(value: number | null | undefined): 14 | 30 | 90 {
  if (value === 30) return 30;
  if (value === 90) return 90;
  return 14;
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
  const [firstGuideOpen, setFirstGuideOpen] = useState(false);
  const [showGuideHintBanner, setShowGuideHintBanner] = useState(false);

  const [monthLoading, setMonthLoading] = useState(false);
  const [monthError, setMonthError] = useState<string | null>(null);
  const [monthData, setMonthData] = useState<MonthlyLogData | null>(null);
  const [monthNotesDraft, setMonthNotesDraft] = useState("");
  const [monthComparisonLoading, setMonthComparisonLoading] = useState(false);
  const [monthComparisonError, setMonthComparisonError] = useState<string | null>(null);
  const [monthComparisonData, setMonthComparisonData] = useState<MonthlyLogComparisonData | null>(null);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [monthSaveLoading, setMonthSaveLoading] = useState(false);
  const [monthSaveError, setMonthSaveError] = useState<string | null>(null);
  const [beginnerMissions, setBeginnerMissions] = useState<MissionItem[]>([]);
  const [beginnerMissionsOpen, setBeginnerMissionsOpen] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(BEGINNER_MISSIONS_OPEN_KEY) === "true";
    } catch {
      return false;
    }
  });

  // ===== Me / Goal =====
  const [me, setMe] = useState<Me | null>(null);
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  const [goalError, setGoalError] = useState<string | null>(null);
  const [goalSaving, setGoalSaving] = useState(false);

  const openComparisonModal = () => {
    if (authMe?.plan_tier !== "premium") {
      setPremiumModalOpen(true);
      return;
    }
    setIsComparisonModalOpen(true);
  };
  const isComparisonPremiumUnlocked = authMe?.plan_tier === "premium";

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

  // Monthly comparison fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authMe || !isMonthMode) {
        setMonthComparisonLoading(false);
        setMonthComparisonError(null);
        setMonthComparisonData(null);
        return;
      }

      setMonthComparisonLoading(true);
      setMonthComparisonError(null);

      const res = await fetchMonthlyLogComparison(selectedMonth);
      if (cancelled) return;

      if ("error" in res && res.error) {
        setMonthComparisonData(null);
        setMonthComparisonError(res.error);
      } else {
        setMonthComparisonData(res.data);
      }
      setMonthComparisonLoading(false);
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

  // beginner missions (for log top guidance)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authMe) {
        setBeginnerMissions([]);
        return;
      }

      const res = await fetchMissions();
      if (cancelled) return;
      if (res.error || !res.data) {
        setBeginnerMissions([]);
        return;
      }
      setBeginnerMissions(res.data.beginner ?? []);
    })();

    return () => {
      cancelled = true;
    };
  }, [authMe]);

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

      const res = await fetchAiRecommendationByDate(selectedDate, settings.aiRangeDays);
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
  }, [selectedDate, authMe, isDayMode, settings.aiRangeDays]);

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

  const openAiChat = (initialMessage?: string) => {
    if (!authMe || !effectiveAiRec || guestMode) return;
    const seed = initialMessage?.trim() ?? "";
    navigate("/chat", {
      state: {
        source: "ai_recommendation",
        seedMessage: seed,
        recommendationDate: selectedDate,
        recommendationText: effectiveAiRec.recommendation_text,
      },
    });
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
    range_days: 14,
    recommendation_text:
      "今日はウォームアップを10分入れてから、ミックス練習を中心に。後半はテンポを落として音程の安定を優先しましょう。",
    collective_summary: {
      used: true,
      window_days: 90,
      min_count: 3,
      items: [
        {
          tag_key: "pitch_accuracy",
          tag_label: "音程精度",
          menus: [
            {
              menu_label: "ハミング",
              count: 4,
              scale_distribution: [
                { label: "5トーン", count: 3 },
                { label: "トライアド", count: 1 },
              ],
              detail_comments: [
                "喉を開く意識で力みが減った",
                "音量一定で当たりが安定した",
              ],
              detail_keywords: [ "声帯閉鎖維持", "鼻腔への響き" ],
              detail_patterns: {
                improved: [ "ミドルが楽" ],
                range: [ "換声点付近" ],
                focus: [ "声帯閉鎖を維持する" ],
              },
            },
          ],
        },
      ],
    },
    created_at: new Date().toISOString(),
  };

  const effectiveLog = guestMode ? previewLog : log;
  const effectiveAiRec = guestMode ? previewAiRec : aiRec;
  const aiMeta = aiReferenceMeta(normalizeAiRangeDays(effectiveAiRec?.range_days ?? settings.aiRangeDays));
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
  const comparisonDiagnosis = useMemo(
    () => (monthComparisonData ? buildComparisonDiagnosis(monthComparisonData) : null),
    [monthComparisonData]
  );

  const goalText = me?.goal_text ?? null;
  const isWithinInitial7Days = isWithinFirst7Days(me?.created_at);
  const pendingBeginnerMissions = useMemo(
    () => beginnerMissions.filter((mission) => !mission.done),
    [beginnerMissions]
  );
  const beginnerPendingCount = pendingBeginnerMissions.length;

  useEffect(() => {
    try {
      window.localStorage.setItem(BEGINNER_MISSIONS_OPEN_KEY, beginnerMissionsOpen ? "true" : "false");
    } catch {
      // localStorage未使用環境では永続化しない
    }
  }, [beginnerMissionsOpen]);

  useEffect(() => {
    const shouldHideFooterTabs = isMonthMode && isComparisonModalOpen;
    document.body.classList.toggle("logPage--comparisonModalOpen", shouldHideFooterTabs);
    return () => {
      document.body.classList.remove("logPage--comparisonModalOpen");
    };
  }, [isMonthMode, isComparisonModalOpen]);

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
            <div className="logPage__title">月ログ</div>
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

      {!!authMe && isMonthMode && (
        <button
          type="button"
          className="logPage__comparisonTrigger"
          onClick={openComparisonModal}
        >
          <div className="logPage__comparisonTriggerMain">
            <div className="logPage__comparisonTriggerTitle">今月のAI診断</div>
            <div className="logPage__comparisonTriggerSub">今月の成長を確認してみましょう！</div>
          </div>
          <div
            className={`logPage__comparisonTriggerRight ${
              isComparisonPremiumUnlocked ? "is-premium" : "is-free"
            }`}
          >
            {!isComparisonPremiumUnlocked && (
              <span className="logPage__comparisonTriggerPremiumHint">
                <span>プレミアムプランで</span>
                <span>閲覧可能になります。</span>
              </span>
            )}
            <div className="logPage__comparisonTriggerSummaryRow">
              {isComparisonPremiumUnlocked && (
                <div className="logPage__comparisonTriggerSummary">
                  {monthComparisonLoading || monthComparisonError
                    ? "—"
                    : comparisonDiagnosis?.header ?? "—"}
                </div>
              )}
            </div>
          </div>
        </button>
      )}

      {!!authMe && isDayMode && beginnerPendingCount > 0 && (
        <section className="logPage__beginnerBar" aria-label="初心者ミッション">
          <button
            type="button"
            className="logPage__beginnerBarToggle"
            onClick={() => setBeginnerMissionsOpen((prev) => !prev)}
            aria-expanded={beginnerMissionsOpen}
          >
            <span className="logPage__beginnerBarTitle">初心者ミッション</span>
            <span className="logPage__beginnerBarCount">残り{beginnerPendingCount}件</span>
            <span className="logPage__beginnerBarCaret" aria-hidden="true">
              {beginnerMissionsOpen ? "▾" : "▸"}
            </span>
          </button>
          {beginnerMissionsOpen && (
            <div className="logPage__beginnerBarList">
              {pendingBeginnerMissions.map((mission) => (
                <article key={mission.key} className="logPage__beginnerBarItem">
                  <div className="logPage__beginnerBarItemMain">
                    <span className="logPage__beginnerBarItemIcon" aria-hidden="true">
                      {mission.done ? "✓" : "○"}
                    </span>
                    <div className="logPage__beginnerBarItemText">
                      <div className="logPage__beginnerBarItemTitle">{mission.title}</div>
                      <div className="logPage__beginnerBarItemDesc">{mission.description}</div>
                    </div>
                  </div>
                  <Link to={mission.to} className="logPage__beginnerBarItemAction">
                    開く
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
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

      {!!me && isDayMode && (
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
                      : "目標を設定する（最大50文字・AIおすすめに反映）"}
                  </div>
                  <button className="goalBar__btn" type="button" onClick={openGoalEdit}>
                    設定する
                  </button>
                </div>
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

      {isMonthMode && isComparisonModalOpen && (
        <div className="logPage__compareModalOverlay" role="presentation" onClick={() => setIsComparisonModalOpen(false)}>
          <section
            className="logPage__compareModal"
            role="dialog"
            aria-modal="true"
            aria-label="先月との比較"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="logPage__compareModalHead">
              <div className="logPage__compareModalTitle">先月との比較</div>
              <button type="button" className="logPage__compareModalClose" onClick={() => setIsComparisonModalOpen(false)}>
                閉じる
              </button>
            </div>

            {monthComparisonLoading && <div className="logPage__muted">比較データを読み込み中…</div>}
            {!monthComparisonLoading && monthComparisonError && (
              <div className="logPage__error">比較データの取得に失敗しました: {monthComparisonError}</div>
            )}
            {!monthComparisonLoading && !monthComparisonError && monthComparisonData && (
              <div className="logPage__compareModalBody">
                <section className="logPage__comparisonIntensity">
                  <div className="logPage__comparisonBlockTitle">📈 練習強度（一日あたりの練習時間）</div>
                  <div className="logPage__comparisonIntensityCurrent">今月 {formatMinutesPerDay(monthComparisonData.practice_time.current)}</div>
                  <div className="logPage__comparisonCardMeta">
                    <span className={`logPage__comparisonDiff ${diffToneClass(monthComparisonData.practice_time.diff)}`}>
                      {movementArrow(monthComparisonData.practice_time.diff)} {formatDiffMinutesPerDay(monthComparisonData.practice_time.diff)}
                      <span className={`logPage__comparisonGrowth ${growthToneClass(
                        monthComparisonData.practice_time.current,
                        monthComparisonData.practice_time.previous,
                        monthComparisonData.practice_time.pct
                      )}`}>
                        （{formatGrowthText(
                          monthComparisonData.practice_time.current,
                          monthComparisonData.practice_time.previous,
                          monthComparisonData.practice_time.pct
                        )}）
                      </span>
                    </span>
                  </div>
                  <div className="logPage__comparisonDaysMeta">
                    （今月 {monthComparisonData.practice_time.current_days ?? 0}日 / 先月 {monthComparisonData.practice_time.previous_days ?? 0}日）
                  </div>
                </section>

                <section className="logPage__measurementCompare">
                  <div className="logPage__measurementCompareHead">
                    <div className="logPage__measurementCompareTitle">🎤 実力の変化（測定平均）</div>
                  </div>
                  {monthComparisonData.measurement_changes.length === 0 ? (
                    <div className="logPage__muted">対象期間の測定データがありません。</div>
                  ) : (
                    <div className="logPage__comparisonBuckets">
                      {(
                        [
                          { key: "improved", label: "改善" },
                          { key: "declined", label: "悪化" },
                        ] as const
                      ).map((bucket) => {
                        const items = comparisonDiagnosis?.buckets[bucket.key] ?? [];
                        return (
                          <section key={`bucket-${bucket.key}`} className={`logPage__comparisonBucket is-${bucket.key}`}>
                            <div className="logPage__comparisonBucketHead static">
                              <span className="logPage__comparisonBucketTitle">{bucket.label}（{items.length}）</span>
                              <div className="logPage__comparisonBucketSummary">
                                {items.length === 0 ? (
                                  <span className="logPage__comparisonBucketMore">なし</span>
                                ) : (
                                  <>
                                    {items.slice(0, 3).map((summaryItem) => (
                                      <span
                                        key={`summary-${bucket.key}-${summaryItem.key}`}
                                        className={`logPage__measurementTag ${improvementTagToneClass(measurementTagKey(summaryItem))}`}
                                      >
                                        {shortMeasurementLabel(summaryItem)}
                                      </span>
                                    ))}
                                    {items.length > 3 && (
                                      <span className="logPage__comparisonBucketMore">+{items.length - 3}件</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="logPage__comparisonBucketBody">
                              {items.length === 0 ? (
                                <div className="logPage__comparisonDetailMuted">該当なし</div>
                              ) : (
                                items.map((item) => (
                                  <div key={`detail-${bucket.key}-${item.key}`} className="logPage__comparisonDetailRow">
                                    <div className="logPage__comparisonDetailMeta">
                                      <span className="logPage__comparisonDetailCount">
                                        今月{item.current.count}回 / 先月{item.previous.count}回
                                      </span>
                                    </div>
                                    <div className="logPage__comparisonDetailMain">
                                      <span className="logPage__comparisonDetailName">{shortMeasurementLabel(item)}</span>
                                      <span className="logPage__comparisonDetailValues">
                                        <span>{item.previous.display} → {item.current.display}</span>
                                        <span className={`logPage__comparisonDetailDelta ${measurementDiffToneClass(item)}`}>
                                          {movementArrow(item.diff)} {item.diff_display}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="logPage__comparisonActionCard">
                  <div className="logPage__comparisonActionHead">
                    <span className="logPage__comparisonActionBadge">AI COACH</span>
                    <div className="logPage__comparisonActionTitleRow">
                      <span className="logPage__comparisonActionTitleIcon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false">
                          <path d="m12 3 2.4 4.8L19 10l-4.6 2.2L12 17l-2.4-4.8L5 10l4.6-2.2Z" />
                        </svg>
                      </span>
                      <span className="logPage__comparisonActionTitle">今月のAI診断</span>
                    </div>
                  </div>
                  <div className="logPage__comparisonDiagnosisSummary">{comparisonDiagnosis?.summary ?? "比較データを確認中です。"}</div>
                  {!!comparisonDiagnosis?.advice && (
                    <div className="logPage__comparisonDiagnosisAdvice">{comparisonDiagnosis.advice}</div>
                  )}
                  {!!comparisonDiagnosis?.reasons?.length && (
                    <div className="logPage__comparisonDiagnosisMeta">
                      {comparisonDiagnosis.reasons.slice(0, 2).join(" / ")}
                    </div>
                  )}
                  <ul className="logPage__comparisonActionList">
                    {(comparisonDiagnosis?.actions ?? ["今月の記録を続けながら、1つの項目に集中してみましょう。"]).map((action, index) => (
                      <li key={`action-${action}`} className="logPage__comparisonActionItem">
                        <span className="logPage__comparisonActionIcon" aria-hidden="true">
                          {renderActionIcon(index)}
                        </span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </section>
        </div>
      )}

      <PremiumUpsellModal
        open={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        previewMode="screenshot"
        variant="lp"
        kicker="PREMIUM"
        title="今月、ちゃんと伸びていますか？"
        description="やった気の1ヶ月で終わらせない。"
        growthTitle="今月の成長（実例）"
        growthItems={[
          { label: "音程精度", before: "88.2%", after: "91.4%", delta: "↑ +3.2%", tone: "up" },
          { label: "裏声最高音", before: "B4", after: "C#5", delta: "↑ +2半音", tone: "up" },
          { label: "ロングトーン", before: "24.1s", after: "14.7s", delta: "↓ -9.4s", tone: "down" },
        ]}
        flowTitle="成長の仕組み"
        flowSteps={[
          { title: "停滞を検出", sub: "裏声最高音の推移を解析", pill: "停滞あり" },
          { title: "要因を特定", sub: "ログと測定データを横断分析", pill: "要因解析" },
          { title: "最適なトレーニングを提示", sub: "今月の優先項目を決定", pill: "メニュー提案" },
        ]}
        note="比較だけで終わらせず、理由に基づいた改善アクションまでサポートします。"
        noteVariant="default"
        ctaLabel="プレミアムプランの詳細を見る"
        onCta={() => {
          setPremiumModalOpen(false);
          navigate("/premium");
        }}
      />

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
            meta={aiMeta}
            aiLoading={aiLoading}
            aiError={guestMode && isDayMode ? null : aiError}
            recommendationText={currentAiText}
            isSaved={!!effectiveAiRec}
            sampleMode={guestMode && isDayMode}
            shownText={aiShownText}
            collapsible={aiCollapsible}
            expanded={aiExpanded}
            onToggleExpanded={() => setAiExpanded((v) => !v)}
            collectiveSummary={effectiveAiRec?.collective_summary}
            showFollowupButton={!guestMode && !!effectiveAiRec}
            onOpenFollowup={(message) => void openAiChat(message)}
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
                {(guestMode && isDayMode) && <div className="logAi__pill logAi__pill--sample">ゲスト</div>}
                {!guestMode && (
                  <Link to="/settings/ai" className="logPage__aiSettingsLink">
                    AIカスタム指示
                  </Link>
                )}
                <InfoModal
                  title="おすすめは何をもとに作られますか？"
                  bodyClassName="logPage__aiInfoBody"
                  triggerClassName="logPage__aiInfoBtn"
                >
                  <div className="logPage__aiInfoLead">目標・直近の記録・AI設定をもとに、今日の練習プランを生成します。</div>
                  <div className="logPage__aiInfoBlocks">
                    <section className="logPage__aiInfoBlock logPage__aiInfoBlock--primary">
                      <div className="logPage__aiInfoBlockTitle">
                        <span className="logPage__aiInfoIcon" aria-hidden="true">🎯</span>
                        <span>主に使う</span>
                      </div>
                      <div className="logPage__aiInfoBlockText">
                        詳細ログは直近14日を参照します。参照期間（14/30/90）はAIカスタム指示ページで設定でき、30/90では月ログ傾向も補助で参照します。
                      </div>
                    </section>
                    <section className="logPage__aiInfoBlock">
                      <div className="logPage__aiInfoBlockTitle">
                        <span className="logPage__aiInfoIcon" aria-hidden="true">💡</span>
                        <span>補助</span>
                      </div>
                      <div className="logPage__aiInfoBlockText">
                        AIカスタム指示（回答スタイル）・改善したい項目・長期プロフィール・コミュニティ集合知を補助根拠として使います。
                      </div>
                    </section>
                    <section className="logPage__aiInfoBlock logPage__aiInfoBlock--save">
                      <div className="logPage__aiInfoBlockTitle">
                        <span className="logPage__aiInfoIcon" aria-hidden="true">🧠</span>
                        <span>保存</span>
                      </div>
                      <div className="logPage__aiInfoBlockText">
                        生成結果は日付ごとに保存され、AIチャットから質問・調整できます。
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
