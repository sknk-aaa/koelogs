import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { fetchTrainingLogByDate, upsertTrainingLog } from "../api/trainingLogs";
import { fetchMonthlyLog, fetchMonthlyLogComparison, upsertMonthlyLog } from "../api/monthlyLogs";
import { createAiRecommendation, fetchAiRecommendationByDate } from "../api/aiRecommendations";
import { fetchInsights } from "../api/insights";
import { fetchMissions } from "../api/missions";
import type { TrainingLog } from "../types/trainingLog";
import type { AiRecommendation } from "../types/aiRecommendation";
import type { MonthlyLogComparisonData, MonthlyLogData } from "../types/monthlyLog";
import type { SaveRewards } from "../types/gamification";
import type { MissionItem } from "../types/missions";
import { fetchLatestMeasurements, type MeasurementRun } from "../api/measurements";
import { useSettings } from "../features/settings/useSettings";
import { useAuth } from "../features/auth/useAuth";
import { emitGamificationRewards } from "../features/gamification/rewardBus";
import { improvementTagToneClass } from "../features/improvementTags/improvementTags";

import MonthCalendarSheet from "../features/log/components/MonthCalendarSheet";
import TodayMenuModal from "../features/log/components/TodayMenuModal";
import MonthlyLogsModal from "../features/monthlyLogs/MonthlyLogsModal";
import ProcessingOverlay from "../components/ProcessingOverlay";

import "./LogPage.css";

import { setLastLogPath } from "../features/log/logNavigation";
import TutorialModal from "../components/TutorialModal";
import { loadTutorialStage, saveTutorialStage } from "../features/tutorial/tutorialFlow";
import handPointerImage from "../assets/tutorial/pointer.png";

import ColoredTag from "../components/ColoredTag";
import PremiumUpsellModal from "../components/PremiumUpsellModal";

function pad(v: number): string {
  return String(v).padStart(2, "0");
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function weekStartISO(value: string): string {
  const date = parseISODate(value);
  const base = date ?? new Date();
  const out = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const day = out.getDay();
  const diff = (day + 6) % 7; // Monday start
  out.setDate(out.getDate() - diff);
  return toISODate(out);
}

function monthDatesISO(value: string): string[] {
  const date = parseISODate(value);
  const base = date ?? new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => toISODate(new Date(year, month, index + 1)));
}

function addDaysISO(value: string, diff: number): string {
  const date = parseISODate(value) ?? new Date();
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
  return toISODate(next);
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

function monthLabel(month: string): string {
  const m = month.match(/^(\d{4})-(\d{2})$/);
  if (!m) return month;
  return `${m[1]}年${m[2]}月`;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest("button, a, input, textarea, select, label");
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

function asRangeResult(result: MeasurementRun["result"] | undefined) {
  if (!result || typeof result !== "object") return null;
  if (!("range_semitones" in result)) return null;
  return result;
}

function asLongToneResult(result: MeasurementRun["result"] | undefined) {
  if (!result || typeof result !== "object") return null;
  if (!("sustain_sec" in result)) return null;
  return result;
}

function asPitchAccuracyResult(result: MeasurementRun["result"] | undefined) {
  if (!result || typeof result !== "object") return null;
  if (!("accuracy_score" in result)) return null;
  return result;
}

function formatRecordedAtLabel(recordedAt: string | null | undefined): string {
  if (!recordedAt) return "未測定";
  const d = new Date(recordedAt);
  if (Number.isNaN(d.getTime())) return "未測定";
  return `${d.getMonth() + 1}/${d.getDate()} 更新`;
}

function weekdayShortJa(isoDate: string): string {
  const date = parseISODate(isoDate) ?? new Date();
  return ["日", "月", "火", "水", "木", "金", "土"][date.getDay()] ?? "";
}

function renderMetricTitleIcon(kind: "range" | "long_tone" | "volume_stability" | "pitch_accuracy"): React.ReactNode {
  if (kind === "range") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M12 4.2v15.6" />
        <path d="M12 4.2 8.4 7.8" />
        <path d="M12 4.2 15.6 7.8" />
        <path d="M12 19.8 8.4 16.2" />
        <path d="M12 19.8 15.6 16.2" />
        <path d="M6.2 12h11.6" />
      </svg>
    );
  }
  if (kind === "long_tone") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="9" cy="12" r="5.5" />
        <path d="M9 9v3.6l2.4 1.6" />
        <path d="M16 12h4.5" />
        <path d="M18.4 9.8v4.4" />
      </svg>
    );
  }
  if (kind === "volume_stability") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M4 14.5V9.5h3.6l3.2-2.7v10.4l-3.2-2.7Z" />
        <path d="M15 9.3a4.6 4.6 0 0 1 0 5.4" />
        <path d="M17.8 7.2a7.2 7.2 0 0 1 0 9.6" />
        <rect x="4.2" y="18.2" width="2.2" height="1.8" rx="0.9" fill="currentColor" stroke="none" />
        <rect x="7.6" y="17.2" width="2.2" height="2.8" rx="0.9" fill="currentColor" stroke="none" />
        <rect x="11" y="16.1" width="2.2" height="3.9" rx="0.9" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <rect x="8.2" y="4.3" width="5.6" height="9.3" rx="2.8" />
      <path d="M5.8 10.8v.6a5.7 5.7 0 0 0 11.4 0v-.6" />
      <path d="M12 17.1v3.2" />
      <path d="M8.8 20.3h6.4" />
      <path d="M17.9 8.2h2" />
      <path d="M17.9 11.1h2.9" />
      <path d="M17.9 14h2" />
    </svg>
  );
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function asVolumeResult(result: MeasurementRun["result"] | undefined) {
  if (!result || typeof result !== "object") return null;
  if (!("loudness_range_pct" in result)) return null;
  return result;
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

function renderSectionIcon(kind: "goal" | "measure" | "practice" | "today_menus" | "note"): React.ReactNode {
  if (kind === "goal") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="12" cy="12" r="7.5" />
        <circle cx="12" cy="12" r="4.5" />
        <circle className="accent-fill" cx="12" cy="12" r="1.7" />
        <path className="accent" d="m14.7 9.3 4-4" />
        <path className="accent" d="M18.7 5.3H16" />
        <path className="accent" d="M18.7 5.3V8" />
      </svg>
    );
  }
  if (kind === "measure") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M4 5v14h11" />
        <path d="m7 14 3-3 2.5 2.5 4-5" />
        <circle className="accent" cx="18" cy="16" r="3.2" />
        <path className="accent" d="m20.3 18.3 2 2" />
      </svg>
    );
  }
  if (kind === "practice") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="11.5" cy="12.2" r="7.2" />
        <path d="M11.5 8.4v4.2l2.8 1.8" />
        <path className="accent" d="M18.3 4.8v3.1" />
        <path className="accent" d="M16.8 6.35h3" />
      </svg>
    );
  }
  if (kind === "today_menus") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="8" cy="16.2" r="2.2" />
        <circle className="accent" cx="15" cy="13.2" r="2.2" />
        <path d="M10.2 16.2V7.4" />
        <path d="M17.2 13.2V5.4" />
        <path d="M10.2 7.4 17.2 5.4" />
        <path d="M10.2 10.2 17.2 8.2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M7 4h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M14 4v6h6" />
      <path className="accent" d="M9 14h6" />
      <path className="accent" d="M9 18h5" />
    </svg>
  );
}

function renderEditPencilIcon(): React.ReactNode {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4 20h4.2l9.9-9.9-4.2-4.2L4 15.8Z" />
      <path d="m12.8 6.1 4.2 4.2" />
      <path d="M4 20h16" />
    </svg>
  );
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
  if (item.key === "chest_top_note") return "chest_voice_strength";
  if (item.key === "falsetto_top_note") return "falsetto_strength";
  return "mixed_voice_stability";
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

const BEGINNER_COMPLETE_MODAL_SEEN_KEY_PREFIX = "koelogs:beginner_complete_modal_seen:user_";
const BEGINNER_LAST_PENDING_KEY_PREFIX = "koelogs:beginner_last_pending:user_";
const BEGINNER_COMPLETED_ONCE_KEY_PREFIX = "koelogs:beginner_completed_once:user_";

type LogPageNavState = { gamificationToast?: SaveRewards | null } | null;

export default function LogPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const today = useMemo(() => todayISO(), []);
  const selectedDate = useMemo(
    () => params.get("date") || monthStartISO(params.get("month") || "") || today,
    [params, today]
  );
  const selectedMonth = useMemo(
    () => params.get("month") || selectedDate.slice(0, 7),
    [params, selectedDate]
  );
  const { settings } = useSettings();
  const { me: authMe, isLoading: authLoading } = useAuth();
  const guestMode = !authLoading && !authMe;

  const isDayMode = true;
  const isMonthMode = false;
  const currentLogPath = `/log?date=${encodeURIComponent(selectedDate)}`;
  const weekDates = useMemo(() => monthDatesISO(selectedDate), [selectedDate]);
  const isToday = selectedDate === today;
  const missionGuide = params.get("missionGuide");
  const forceGuideDailyLog = missionGuide === "beginner_daily_log" && isDayMode && isToday && !guestMode;
  const aiCustomDoneParam = params.get("aiCustomDone");
  const shouldRunAiMissionGuide = missionGuide === "beginner_ai" && isDayMode && !guestMode;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<TrainingLog | null>(null);
  const [dayNotesDraft, setDayNotesDraft] = useState("");
  const [dayNotesSaving, setDayNotesSaving] = useState(false);
  const [dayNotesError, setDayNotesError] = useState<string | null>(null);
  const [dayNotesEditing, setDayNotesEditing] = useState(false);
  const [durationDraft, setDurationDraft] = useState("");
  const [durationSaving, setDurationSaving] = useState(false);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [durationModalOpen, setDurationModalOpen] = useState(false);
  const [currentStreakDays, setCurrentStreakDays] = useState<number | null>(null);
  const [longestStreakDays, setLongestStreakDays] = useState<number | null>(null);
  const [latestMeasurements, setLatestMeasurements] = useState<{
    range: MeasurementRun | null;
    long_tone: MeasurementRun | null;
    volume_stability: MeasurementRun | null;
    pitch_accuracy: MeasurementRun | null;
  }>({
    range: null,
    long_tone: null,
    volume_stability: null,
    pitch_accuracy: null,
  });
  const [saveToast, setSaveToast] = useState<SaveRewards | null>(null);
  const [tutorialWelcomeOpen, setTutorialWelcomeOpen] = useState(false);
  const [beginnerCompletionModalStep, setBeginnerCompletionModalStep] = useState<"congrats" | "unlocked" | null>(null);
  const [aiMissionGuideStep, setAiMissionGuideStep] = useState<
    "intro" | "references" | "customization" | "theme_toggle" | "theme_input" | "pointer" | null
  >(null);
  const aiCtaCardRef = useRef<HTMLElement | null>(null);
  const aiGenerateBtnRef = useRef<HTMLButtonElement | null>(null);
  const aiThemeToggleBtnRef = useRef<HTMLButtonElement | null>(null);
  const aiThemeInputRef = useRef<HTMLInputElement | null>(null);
  const [aiGenerateGuidePos, setAiGenerateGuidePos] = useState<{ left: number; top: number } | null>(null);
  const forceGuideAiThemeToggle = aiMissionGuideStep === "theme_toggle";
  const forceGuideAiThemeInput = aiMissionGuideStep === "theme_input";
  const forceGuideAiGenerate = aiMissionGuideStep === "pointer";
  const forceGuideAiFlow = forceGuideAiThemeToggle || forceGuideAiThemeInput || forceGuideAiGenerate;
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const weekStripRef = useRef<HTMLDivElement | null>(null);

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
  const [beginnerMissionModalOpen, setBeginnerMissionModalOpen] = useState(false);
  const [beginnerCompletedOnce, setBeginnerCompletedOnce] = useState(false);

  const openComparisonModal = () => {
    if (authMe?.plan_tier !== "premium") {
      setPremiumModalOpen(true);
      return;
    }
    setIsComparisonModalOpen(true);
  };
  const isComparisonPremiumUnlocked = authMe?.plan_tier === "premium";

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRec, setAiRec] = useState<AiRecommendation | null>(null);
  const [aiThemeOpen, setAiThemeOpen] = useState(false);
  const [aiThemeDraft, setAiThemeDraft] = useState("");

  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [todayMenuModalOpen, setTodayMenuModalOpen] = useState(false);
  const [monthlyLogsModalOpen, setMonthlyLogsModalOpen] = useState(false);

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
      if (!authMe) {
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
  }, [selectedMonth, authMe]);

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
        return;
      }
      const res = await fetchInsights(30);
      if (cancelled) return;
      if ("error" in res && res.error) {
        setCurrentStreakDays(null);
        setLongestStreakDays(null);
        return;
      }
      setCurrentStreakDays(res.data?.streaks.current_days ?? null);
      setLongestStreakDays(res.data?.streaks.longest_days ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [authMe]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authMe) {
        setLatestMeasurements({
          range: null,
          long_tone: null,
          volume_stability: null,
          pitch_accuracy: null,
        });
        return;
      }
      try {
        const data = await fetchLatestMeasurements();
        if (cancelled) return;
        setLatestMeasurements(data);
      } catch {
        if (cancelled) return;
        setLatestMeasurements({
          range: null,
          long_tone: null,
          volume_stability: null,
          pitch_accuracy: null,
        });
      }
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
      setTutorialWelcomeOpen(false);
      return;
    }
    const stage = loadTutorialStage(authMe.id);
    setTutorialWelcomeOpen(stage === "log_welcome");
  }, [authLoading, authMe]);

  useEffect(() => {
    if (!shouldRunAiMissionGuide) {
      setAiMissionGuideStep(null);
      setAiGenerateGuidePos(null);
      return;
    }
    setAiMissionGuideStep("intro");
    const id = window.setTimeout(() => {
      aiCtaCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(id);
  }, [shouldRunAiMissionGuide]);

  useEffect(() => {
    if (!forceGuideAiFlow) {
      setAiGenerateGuidePos(null);
      return;
    }
    aiCtaCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const target =
      aiMissionGuideStep === "theme_toggle"
        ? aiThemeToggleBtnRef.current
        : aiMissionGuideStep === "theme_input"
          ? aiThemeInputRef.current
          : aiGenerateBtnRef.current;
    if (!target) return;
    const update = () => {
      const rect = target.getBoundingClientRect();
      setAiGenerateGuidePos({
        left: rect.left + rect.width * 0.5 + 22,
        top: rect.top + rect.height + 130,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [aiMissionGuideStep, forceGuideAiFlow, aiThemeOpen]);

  useEffect(() => {
    if (aiMissionGuideStep !== "theme_input") return;
    if (aiThemeOpen) return;
    setAiMissionGuideStep("theme_toggle");
  }, [aiMissionGuideStep, aiThemeOpen]);

  useEffect(() => {
    if (!forceGuideDailyLog && !forceGuideAiFlow) {
      delete document.body.dataset.logMissionGuideLockFooter;
      return;
    }
    document.body.dataset.logMissionGuideLockFooter = "true";
    return () => {
      delete document.body.dataset.logMissionGuideLockFooter;
    };
  }, [forceGuideAiFlow, forceGuideDailyLog]);

  useEffect(() => {
    const strip = weekStripRef.current;
    if (!strip) return;
    const todayButton = strip.querySelector<HTMLButtonElement>(`button[aria-label="${today}"]`);
    if (!todayButton) return;

    window.requestAnimationFrame(() => {
      const targetLeft = Math.max(
        0,
        todayButton.offsetLeft - (strip.clientWidth - todayButton.clientWidth) / 2
      );
      strip.scrollTo({ left: targetLeft, behavior: "auto" });
    });
  }, [today, selectedMonth]);

  const clearMissionGuideQuery = () => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("missionGuide");
      next.delete("aiCustomDone");
      next.delete("mode");
      next.delete("month");
      return next;
    });
  };

  const onChangeDate = (next: string) => {
    setParams((prev) => {
      const search = new URLSearchParams(prev);
      search.set("date", next);
      search.delete("mode");
      search.delete("month");
      return search;
    });
  };

  const goLogin = () => {
    navigate("/login", { state: { fromPath: currentLogPath } });
  };

  const goPrevDate = () => onChangeDate(addDaysISO(selectedDate, -1));
  const goNextDate = () => onChangeDate(addDaysISO(selectedDate, 1));

  const onPageTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (monthModalOpen || isInteractiveTarget(event.target)) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const onPageTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || monthModalOpen || isInteractiveTarget(event.target)) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const diffX = touch.clientX - start.x;
    const diffY = touch.clientY - start.y;
    if (Math.abs(diffY) > 44 || Math.abs(diffX) < 56) return;
    if (diffX < 0) goNextDate();
    if (diffX > 0) goPrevDate();
  };

  const clearWeekLongPress = () => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const onWeekTouchStart = () => {
    longPressTriggeredRef.current = false;
    clearWeekLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setMonthModalOpen(true);
    }, 420);
  };

  const onWeekTouchMove = () => {
    clearWeekLongPress();
  };

  const onWeekTouchEnd = () => {
    window.setTimeout(() => {
      longPressTriggeredRef.current = false;
    }, 0);
    clearWeekLongPress();
  };

  const scrollToGuestPreview = () => {
    const el = document.getElementById("guest-preview");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openTodayMenuModal = () => {
    if (!authMe) {
      goLogin();
      return;
    }
    setTodayMenuModalOpen(true);
  };

  const openDurationModal = () => {
    if (!authMe) {
      goLogin();
      return;
    }
    setDurationDraft(log?.duration_min != null ? String(log.duration_min) : "");
    setDurationError(null);
    setDurationModalOpen(true);
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
    if (forceGuideAiFlow) {
      setAiMissionGuideStep(null);
      clearMissionGuideQuery();
    }

    setAiLoading(true);
    setAiError(null);

    const res = await createAiRecommendation({
      range_days: settings.aiRangeDays,
      date: selectedDate,
      today_theme: aiThemeDraft.trim() || undefined,
    });

    if (!res.ok) {
      setAiError(res.errors.join("\n"));
      setAiLoading(false);
      return;
    }

    setAiRec(res.data);
    emitGamificationRewards(res.rewards);
    setAiLoading(false);
    const missionsRes = await fetchMissions();
    if (!missionsRes.error && missionsRes.data) {
      setBeginnerMissions(missionsRes.data.beginner ?? []);
    }
    navigate("/chat", {
      state: {
        source: "ai_recommendation",
        seedMessage: "",
        recommendationDate: res.data.week_start_date || selectedDate,
        recommendationText: res.data.recommendation_text,
      },
    });
  };

  const openAiChat = (initialMessage?: string) => {
    if (!authMe || !effectiveAiRec || guestMode) return;
    const seed = initialMessage?.trim() ?? "";
    const recommendationDate = effectiveAiRec.week_start_date || selectedDate;
    navigate("/chat", {
      state: {
        source: "ai_recommendation",
        seedMessage: seed,
        recommendationDate,
        recommendationText: effectiveAiRec.recommendation_text,
      },
    });
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
    week_start_date: weekStartISO(selectedDate),
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
  const previewMeasurements = {
    range: {
      id: -1,
      measurement_type: "range" as const,
      include_in_insights: true,
      recorded_at: "2026-03-01T08:00:00+09:00",
      created_at: "2026-03-01T08:00:00+09:00",
      result: { lowest_note: "A#2", highest_note: "F5", chest_top_note: "C5", falsetto_top_note: "F5", range_semitones: 30, range_octaves: 2.5 },
    },
    long_tone: {
      id: -2,
      measurement_type: "long_tone" as const,
      include_in_insights: true,
      recorded_at: "2026-03-01T08:00:00+09:00",
      created_at: "2026-03-01T08:00:00+09:00",
      result: { sustain_sec: 12.8, sustain_note: "B3" },
    },
    volume_stability: null,
    pitch_accuracy: {
      id: -3,
      measurement_type: "pitch_accuracy" as const,
      include_in_insights: true,
      recorded_at: "2026-03-01T08:00:00+09:00",
      created_at: "2026-03-01T08:00:00+09:00",
      result: { avg_cents_error: 22.4, accuracy_score: 77.6, note_count: 96 },
    },
  };

  const effectiveLog = guestMode ? previewLog : log;
  const effectiveLatestMeasurements = guestMode ? previewMeasurements : latestMeasurements;
  const effectiveAiRec = guestMode ? previewAiRec : aiRec;
  const showAiLauncher = isDayMode;

  const menuItems = effectiveLog?.menus ?? [];

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

  const pendingBeginnerMissions = useMemo(
    () => beginnerMissions.filter((mission) => !mission.done),
    [beginnerMissions]
  );
  const beginnerTotalCount = beginnerMissions.length;
  const beginnerPendingCount = pendingBeginnerMissions.length;
  const beginnerDoneCount = Math.max(0, beginnerTotalCount - beginnerPendingCount);
  const beginnerProgressPercent =
    beginnerTotalCount > 0 ? Math.round((beginnerDoneCount / beginnerTotalCount) * 100) : 0;
  const hasPendingBeginnerMissions = !beginnerCompletedOnce && beginnerPendingCount > 0;
  const beginnerAiCustomizationDone = useMemo(() => {
    if (aiCustomDoneParam === "1") return true;
    if (aiCustomDoneParam === "0") return false;
    return beginnerMissions.find((mission) => mission.key === "beginner_ai_customization")?.done === true;
  }, [aiCustomDoneParam, beginnerMissions]);

  useEffect(() => {
    setDayNotesDraft(effectiveLog?.notes ?? "");
    setDayNotesEditing(false);
    setDayNotesError(null);
  }, [effectiveLog?.id, effectiveLog?.notes, selectedDate]);

  useEffect(() => {
    setDurationDraft(effectiveLog?.duration_min != null ? String(effectiveLog.duration_min) : "");
    setDurationError(null);
  }, [effectiveLog?.id, effectiveLog?.duration_min, selectedDate]);

  useEffect(() => {
    if (!authMe) {
      setBeginnerCompletedOnce(false);
      return;
    }
    const completedOnceKey = `${BEGINNER_COMPLETED_ONCE_KEY_PREFIX}${authMe.id}`;
    try {
      setBeginnerCompletedOnce(window.localStorage.getItem(completedOnceKey) === "1");
    } catch {
      setBeginnerCompletedOnce(false);
    }
  }, [authMe]);

  useEffect(() => {
    const current = beginnerPendingCount;
    if (!authMe || beginnerTotalCount === 0) return;

    const seenKey = `${BEGINNER_COMPLETE_MODAL_SEEN_KEY_PREFIX}${authMe.id}`;
    const lastPendingKey = `${BEGINNER_LAST_PENDING_KEY_PREFIX}${authMe.id}`;
    const completedOnceKey = `${BEGINNER_COMPLETED_ONCE_KEY_PREFIX}${authMe.id}`;
    let lastPending: number | null = null;
    let alreadyShown = false;
    let alreadyCompletedOnce = false;

    try {
      const raw = window.localStorage.getItem(lastPendingKey);
      lastPending = raw == null ? null : Number.parseInt(raw, 10);
      alreadyShown = window.localStorage.getItem(seenKey) === "1";
      alreadyCompletedOnce = window.localStorage.getItem(completedOnceKey) === "1";
    } catch {
      lastPending = null;
      alreadyShown = false;
      alreadyCompletedOnce = false;
    }

    if (alreadyCompletedOnce) {
      if (!beginnerCompletedOnce) setBeginnerCompletedOnce(true);
      return;
    }

    if (current === 0 && !alreadyShown && lastPending != null && lastPending > 0) {
      setBeginnerCompletionModalStep("congrats");
      try {
        window.localStorage.setItem(seenKey, "1");
        window.localStorage.setItem(completedOnceKey, "1");
        setBeginnerCompletedOnce(true);
      } catch {
        // no-op
      }
    }

    try {
      window.localStorage.setItem(lastPendingKey, String(current));
    } catch {
      // no-op
    }
  }, [authMe, beginnerCompletedOnce, beginnerPendingCount, beginnerTotalCount]);

  useEffect(() => {
    if (!beginnerMissionModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [beginnerMissionModalOpen]);

  useEffect(() => {
    if (!beginnerCompletedOnce) return;
    setBeginnerMissionModalOpen(false);
  }, [beginnerCompletedOnce]);

  useEffect(() => {
    const shouldHideFooterTabs = isMonthMode && isComparisonModalOpen;
    document.body.classList.toggle("logPage--comparisonModalOpen", shouldHideFooterTabs);
    return () => {
      document.body.classList.remove("logPage--comparisonModalOpen");
    };
  }, [isMonthMode, isComparisonModalOpen]);

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

  const rangeResult = asRangeResult(effectiveLatestMeasurements.range?.result);
  const longToneResult = asLongToneResult(effectiveLatestMeasurements.long_tone?.result);
  const volumeResult = asVolumeResult(effectiveLatestMeasurements.volume_stability?.result);
  const pitchAccuracyResult = asPitchAccuracyResult(effectiveLatestMeasurements.pitch_accuracy?.result);
  const longToneProgress = clamp01((longToneResult?.sustain_sec ?? 0) / 30);
  const volumeProgress = clamp01((volumeResult?.loudness_range_pct ?? 0) / 100);
  const pitchErrorSemitones =
    pitchAccuracyResult?.avg_cents_error != null ? Math.abs(pitchAccuracyResult.avg_cents_error) / 100 : null;
  const pitchProgress = clamp01(pitchErrorSemitones ?? 0);
  const displayDuration = effectiveLog?.duration_min ?? null;
  const practiceLapColors = ["#14c6d8", "#3b82f6", "#8b5cf6"] as const;
  const practiceRingLayers = practiceLapColors.map((_, index) => {
    const progress = clamp01(((displayDuration ?? 0) - index * 60) / 60);
    return {
      progress,
      color: practiceLapColors[index],
    };
  }).filter((ring, index) => ring.progress > 0 || index === 0);
  const practiceMetaItems = [
    { key: "streak", label: "連続日数", value: `${currentStreakDays ?? 0}日` },
    { key: "menus", label: "今日のメニュー", value: `${menuItems.length}件` },
  ] as const;
  const dayCards = [
    {
      key: "range",
      title: "音域",
      value:
        rangeResult?.lowest_note && rangeResult?.highest_note
          ? `${rangeResult.lowest_note} - ${rangeResult.highest_note}`
          : "未測定",
      meta:
        rangeResult?.range_octaves != null
          ? `${rangeResult.range_octaves.toFixed(1)}オクターブ`
          : formatRecordedAtLabel(effectiveLatestMeasurements.range?.recorded_at),
      tone: "default",
      onClick: () => navigate("/training?measurement=range&measureStep=select"),
    },
    {
      key: "long_tone",
      title: "ロングトーン",
      value: longToneResult?.sustain_sec != null ? `${longToneResult.sustain_sec.toFixed(1)}秒` : "未測定",
      meta:
        longToneResult?.sustain_note
          ? `音程 ${longToneResult.sustain_note}`
          : formatRecordedAtLabel(effectiveLatestMeasurements.long_tone?.recorded_at),
      tone: "default",
      onClick: () => navigate("/training?measurement=long_tone&measureStep=select"),
    },
    {
      key: "volume_stability",
      title: "音量安定性",
      value: volumeResult?.loudness_range_pct != null ? `${volumeResult.loudness_range_pct.toFixed(1)}%` : "未測定",
      meta:
        volumeResult?.avg_loudness_db != null
          ? `平均 ${volumeResult.avg_loudness_db.toFixed(1)} dB`
          : formatRecordedAtLabel(effectiveLatestMeasurements.volume_stability?.recorded_at),
      tone: "default",
      onClick: () => navigate("/training?measurement=volume_stability&measureStep=select"),
    },
    {
      key: "pitch_accuracy",
      title: "音程精度",
      value: pitchErrorSemitones != null ? `${pitchErrorSemitones.toFixed(2)}半音` : "未測定",
      meta: null,
      tone: "default",
      onClick: () => navigate("/training?measurement=pitch_accuracy&measureStep=select"),
    },
  ] as const;
  const measurementCardOrder = ["range", "pitch_accuracy", "long_tone", "volume_stability"] as const;
  const measurementCards = measurementCardOrder
    .map((key) => dayCards.find((card) => card.key === key))
    .filter((card): card is (typeof dayCards)[number] => card != null);

  const onSaveDayNotes = async () => {
    if (!authMe) {
      goLogin();
      return;
    }
    if (dayNotesSaving) return;
    setDayNotesSaving(true);
    setDayNotesError(null);
    const result = await upsertTrainingLog({
      practiced_on: selectedDate,
      duration_min: log?.duration_min ?? null,
      menu_ids: log?.menu_ids ?? log?.menus?.map((item) => item.id) ?? [],
      notes: dayNotesDraft.trim() || null,
    });
    if (!result.ok) {
      setDayNotesError(result.errors.join("\n"));
      setDayNotesSaving(false);
      return;
    }
    setLog(result.data);
    emitGamificationRewards(result.rewards);
    setDayNotesSaving(false);
    setDayNotesEditing(false);
  };

  const onSaveDuration = async () => {
    if (!authMe) {
      goLogin();
      return;
    }
    if (durationSaving) return;

    const raw = durationDraft.trim();
    const parsed = raw === "" ? null : Number.parseInt(raw, 10);
    if (raw !== "" && (parsed == null || !Number.isFinite(parsed) || parsed < 0)) {
      setDurationError("0以上の分数で入力してください");
      return;
    }

    setDurationSaving(true);
    setDurationError(null);

    const result = await upsertTrainingLog({
      practiced_on: selectedDate,
      duration_min: parsed,
      menu_ids: log?.menu_ids ?? log?.menus?.map((item) => item.id) ?? [],
      notes: dayNotesDraft.trim() || null,
    });

    if (!result.ok) {
      setDurationError(result.errors.join("\n"));
      setDurationSaving(false);
      return;
    }

    setLog(result.data);
    emitGamificationRewards(result.rewards);
    setDurationSaving(false);
    setDurationModalOpen(false);
  };

  useEffect(() => {
    setLastLogPath(currentLogPath);
  }, [currentLogPath]);

  useEffect(() => {
    const onOpenMonthlyLogs = () => {
      if (guestMode) return;
      setMonthlyLogsModalOpen(true);
    };
    window.addEventListener("koelog:open-monthly-logs", onOpenMonthlyLogs);
    return () => window.removeEventListener("koelog:open-monthly-logs", onOpenMonthlyLogs);
  }, [guestMode]);

  return (
    <div className="page logPage" onTouchStart={onPageTouchStart} onTouchEnd={onPageTouchEnd}>
      <ProcessingOverlay
        open={aiLoading}
        title="生成中..."
        description="今週のおすすめを作成しています"
      />
      <section
        className="logPage__dateRail"
        onTouchStart={onWeekTouchStart}
        onTouchMove={onWeekTouchMove}
        onTouchEnd={onWeekTouchEnd}
      >
        <div className="logPage__weekRail">
          <div ref={weekStripRef} className="logPage__weekStrip" role="group" aria-label="週カレンダー">
            {weekDates.map((date) => {
              const isSelected = date === selectedDate;
              const isTodayDate = date === today;
              return (
                <button
                  key={date}
                  type="button"
                  className={`logPage__weekDay ${isSelected ? "is-selected" : ""} ${isTodayDate ? "is-today" : ""}`}
                  onClick={() => {
                    if (longPressTriggeredRef.current) return;
                    onChangeDate(date);
                  }}
                  aria-pressed={isSelected}
                  aria-label={date}
                >
                  <span className="logPage__weekDayNumber">{Number(date.slice(8, 10))}</span>
                  <span className="logPage__weekDayLabel">{isTodayDate ? "今日" : weekdayShortJa(date)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <MonthCalendarSheet
        open={monthModalOpen}
        month={selectedDate.slice(0, 7)}
        selectedDate={selectedDate}
        onClose={() => setMonthModalOpen(false)}
        onSelectDate={(date) => {
          setMonthModalOpen(false);
          onChangeDate(date);
        }}
      />

      {!guestMode && (
        <TodayMenuModal
          open={todayMenuModalOpen}
          initialSelectedIds={log?.menu_ids ?? log?.menus?.map((item) => item.id) ?? []}
          onClose={() => setTodayMenuModalOpen(false)}
          onSave={async (menuIds) => {
            const result = await upsertTrainingLog({
              practiced_on: selectedDate,
              duration_min: log?.duration_min ?? null,
              menu_ids: menuIds,
              notes: dayNotesDraft.trim() || null,
            });
            if (!result.ok) {
              throw new Error(result.errors.join("\n"));
            }
            setLog(result.data);
            emitGamificationRewards(result.rewards);
          }}
        />
      )}

      {durationModalOpen ? (
        <div className="logPage__durationModal" role="dialog" aria-modal="true" aria-labelledby="duration-modal-title">
          <button
            type="button"
            className="logPage__durationModalBackdrop"
            aria-label="練習時間入力を閉じる"
            onClick={() => {
              setDurationModalOpen(false);
              setDurationError(null);
            }}
          />
          <div className="logPage__durationModalPanel">
            <div className="logPage__durationModalHeader">
              <div>
                <div className="logPage__durationModalEyebrow">PRACTICE</div>
                <h2 id="duration-modal-title" className="logPage__durationModalTitle">練習時間を記録</h2>
              </div>
              <button
                type="button"
                className="logPage__durationModalClose"
                onClick={() => {
                  setDurationModalOpen(false);
                  setDurationError(null);
                }}
              >
                キャンセル
              </button>
            </div>
            <div className="logPage__durationModalBody">
              <label className="logPage__durationModalInputWrap">
                <span className="logPage__srOnly">練習時間を分で入力</span>
                <input
                  className="logPage__durationModalInput"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={durationDraft}
                  onChange={(event) => setDurationDraft(event.target.value)}
                  placeholder="0"
                />
                <span className="logPage__durationModalUnit">分</span>
              </label>
              <button
                type="button"
                className="logPage__durationModalSave"
                onClick={() => void onSaveDuration()}
                disabled={durationSaving}
              >
                {durationSaving ? "保存中…" : "保存"}
              </button>
            </div>
            {durationError ? <div className="logPage__durationModalError">{durationError}</div> : null}
          </div>
        </div>
      ) : null}

      {!guestMode && (
        <MonthlyLogsModal
          open={monthlyLogsModalOpen}
          month={selectedDate.slice(0, 7)}
          onClose={() => setMonthlyLogsModalOpen(false)}
          onSelectDate={(date) => {
            setMonthlyLogsModalOpen(false);
            onChangeDate(date);
          }}
        />
      )}

      {showAiLauncher && (
        <section ref={aiCtaCardRef} className="logPage__aiWeekAction">
          <div className="logPage__aiWeekActionTop">
            <div className="logPage__aiWeekActionMain">
              <div className="logPage__aiWeekActionTitle">
                <span className="logPage__aiWeekActionIcon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M12 3.8 13.1 7l3.2 1.1-3.2 1.1L12 12.4l-1.1-3.2L7.7 8.1 10.9 7 12 3.8Z" />
                    <path className="accent" d="M18 11.5 18.7 13.4 20.6 14.1 18.7 14.8 18 16.7 17.3 14.8 15.4 14.1 17.3 13.4 18 11.5Z" />
                    <path d="M7.1 13.6 7.7 15.1 9.2 15.7 7.7 16.3 7.1 17.8 6.5 16.3 5 15.7 6.5 15.1 7.1 13.6Z" />
                  </svg>
                </span>
                <span>今週のAIおすすめ</span>
              </div>
              <div className="logPage__aiWeekActionSubtext">
                {!effectiveAiRec || guestMode
                  ? "記録・目標・測定結果をもとに、今週の練習メニューを提案します"
                  : "今週の提案を確認できます"}
              </div>
            </div>
            <div className="logPage__aiWeekActionRow">
              {effectiveAiRec && !guestMode ? (
                <button type="button" className="logPage__aiWeekActionLink" onClick={() => openAiChat()}>
                  <span>提案を見る</span>
                  <span aria-hidden="true">→</span>
                </button>
              ) : (
                <>
                  <button
                    ref={aiThemeToggleBtnRef}
                    type="button"
                    className={`logPage__btn logPage__aiThemeToggle ${forceGuideAiThemeToggle ? "is-guided" : ""}`.trim()}
                    onClick={() => setAiThemeOpen((current) => !current)}
                    aria-expanded={aiThemeOpen}
                  >
                    {aiThemeOpen ? "テーマ入力を閉じる" : "テーマを指定"}
                  </button>
                  <button
                    ref={aiGenerateBtnRef}
                    type="button"
                    className={`logPage__btn logPage__aiWeekActionBtn ${forceGuideAiGenerate ? "is-guided" : ""}`.trim()}
                    onClick={onAskAi}
                    disabled={aiLoading}
                  >
                    {guestMode ? "ログインして生成" : aiLoading ? "生成中…" : "AIおすすめを生成"}
                  </button>
                </>
              )}
            </div>
          </div>
          {(!effectiveAiRec || guestMode) && aiThemeOpen ? (
            <div className={`logPage__aiThemeInputWrap ${forceGuideAiThemeInput ? "is-guided" : ""}`.trim()}>
              <label className="logPage__aiThemeInputLabel" htmlFor="log-ai-theme-input">
                今週のテーマ
              </label>
              <input
                ref={aiThemeInputRef}
                id="log-ai-theme-input"
                className="logPage__aiThemeInput"
                type="text"
                value={aiThemeDraft}
                onChange={(event) => setAiThemeDraft(event.target.value)}
                placeholder="例：高音で喉を締めない"
                maxLength={40}
              />
            </div>
          ) : null}
          {aiError && !guestMode && <div className="logPage__error">生成に失敗しました: {aiError}</div>}
        </section>
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

      {!!authMe && isDayMode && hasPendingBeginnerMissions && (
        <section className="logPage__beginnerGuide" aria-label="ビギナーミッション">
          <button
            type="button"
            className="logPage__missionGuideCard"
            onClick={() => setBeginnerMissionModalOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={beginnerMissionModalOpen}
          >
            <div className="logPage__missionGuideTitle">ミッションをクリアしよう</div>
            <div className="logPage__missionGuideMetaRow">
              <span className="logPage__missionGuideLabel">ビギナーミッション</span>
              <span className="logPage__missionGuideCount">
                {beginnerDoneCount} / {beginnerTotalCount}
              </span>
              <span className="logPage__missionGuideArrow" aria-hidden="true">
                ›
              </span>
            </div>
            <span className="logPage__missionGuideProgressTrack" aria-hidden="true">
              <span
                className="logPage__missionGuideProgressFill"
                style={{ width: `${beginnerProgressPercent}%` }}
              />
            </span>
          </button>
        </section>
      )}

      {beginnerMissionModalOpen && (
        <div
          className="logPage__missionModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="ビギナーミッション"
          onClick={() => setBeginnerMissionModalOpen(false)}
        >
          <section className="card logPage__missionModalCard" onClick={(event) => event.stopPropagation()}>
            <div className="logPage__missionModalHead">
              <div className="logPage__missionModalTitle">ビギナーミッション</div>
              <button
                type="button"
                className="logPage__missionModalClose"
                onClick={() => setBeginnerMissionModalOpen(false)}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
            <div className="logPage__missionModalStatus">残り {pendingBeginnerMissions.length} 件</div>
            <div className="logPage__beginnerGuideList">
              {pendingBeginnerMissions.map((mission) => (
                <article key={mission.key} className="logPage__beginnerGuideItem">
                  <div className="logPage__beginnerGuideItemMain">
                    <span className="logPage__beginnerGuideItemIcon" aria-hidden="true">
                      ○
                    </span>
                    <div className="logPage__beginnerGuideItemText">
                      <div className="logPage__beginnerGuideItemTitle">{mission.title}</div>
                      <div className="logPage__beginnerGuideItemDesc">{mission.description}</div>
                    </div>
                  </div>
                  <Link
                    to={
                      mission.key === "beginner_ai"
                        ? `${mission.to}${mission.to.includes("?") ? "&" : "?"}aiCustomDone=${beginnerAiCustomizationDone ? "1" : "0"}`
                        : mission.to
                    }
                    className="logPage__beginnerGuideItemAction"
                    onClick={() => setBeginnerMissionModalOpen(false)}
                  >
                    開く
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      <TutorialModal
        open={tutorialWelcomeOpen}
        badge="WELCOME"
        title="はじめまして、Koelogsへようこそ！"
        paragraphs={[
          "このアプリは、あなたの「練習記録」と「測定データ」をもとに、AIが次の練習メニューを提案するボイストレーニング支援アプリです。",
          "まずは基本の流れを体験してみましょう。",
        ]}
        primaryLabel="ビギナーミッションをはじめる"
        onPrimary={() => {
          if (!authMe) return;
          saveTutorialStage(authMe.id, "mypage_intro");
          setTutorialWelcomeOpen(false);
          navigate("/mypage");
        }}
        onClose={() => {}}
      />

      <TutorialModal
        open={aiMissionGuideStep === "intro"}
        badge="MISSION"
        title="AIおすすめについて"
        paragraphs={[
          "このアプリでは、今週のおすすめトレーニング内容をAIが提案してくれます。",
          "流れはシンプルです。必要ならテーマを入力して、そのままAIおすすめを生成します。",
        ]}
        primaryLabel="次へ"
        onPrimary={() => setAiMissionGuideStep("references")}
        onClose={() => {}}
      />

      <TutorialModal
        open={aiMissionGuideStep === "references"}
        badge="MISSION"
        title="AIおすすめの参照データ"
        paragraphs={[
          "AIのお勧め生成では、主に次のデータを参照します：",
          "・ユーザーのAIカスタム指示",
          "・ログで記録したデータ",
          "・測定データ",
          "・（任意）今週のテーマ",
        ]}
        primaryLabel={beginnerAiCustomizationDone ? "AIおすすめを生成する" : "次へ"}
        onPrimary={() => {
          if (beginnerAiCustomizationDone) {
            setAiMissionGuideStep("theme_toggle");
            return;
          }
          setAiMissionGuideStep("customization");
        }}
        onClose={() => {}}
      />

      <TutorialModal
        open={aiMissionGuideStep === "customization"}
        badge="MISSION"
        title="まずはAIカスタム指示を設定しましょう"
        paragraphs={["まずはAIカスタム指示を作成し、あなたの現在の状況や回答のスタイルを設定しましょう。"]}
        primaryLabel="AIカスタム指示を作成"
        onPrimary={() => {
          setAiMissionGuideStep(null);
          clearMissionGuideQuery();
          navigate("/settings/ai");
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

      {toastLines.length > 0 && (
        <section className="logPage__rewardToast" role="status" aria-live="polite">
          {toastLines.map((line, idx) => (
            <div key={`${line}-${idx}`} className="logPage__rewardToastLine">{line}</div>
          ))}
        </section>
      )}

      {(forceGuideDailyLog || forceGuideAiFlow) && (
        <>
          <div className="logPage__guideOverlay" aria-hidden="true" />
          {forceGuideAiFlow && aiGenerateGuidePos && (
            <div
              className="logPage__guideHand"
              style={{ left: `${aiGenerateGuidePos.left}px`, top: `${aiGenerateGuidePos.top}px` }}
              role="status"
              aria-live="polite"
              aria-label="ここをタップ"
            >
              <img src={handPointerImage} alt="" className="logPage__guideHandImage" aria-hidden="true" />
            </div>
          )}
        </>
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
        ctaLabel="プレミアムを見る"
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
                <div className="logPage__guestPreviewCardValue">今週のおすすめ</div>
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
          <>
            <section className="logPage__dayBoard">
              {!guestMode && loading && <div className="logPage__muted">読み込み中…</div>}
              {!guestMode && error && <div className="logPage__error">取得に失敗しました: {error}</div>}
              <div className="logPage__sectionBlock">
                <div className="logPage__sectionLabelRow">
                  <span className="logPage__sectionLabelIcon is-practice" aria-hidden="true">
                    {renderSectionIcon("practice")}
                  </span>
                  <div className="logPage__sectionLabel">PRACTICE</div>
                </div>
                <div className="logPage__daySummaryGrid">
                  <section className="logPage__summaryCard logPage__summaryCard--time logPage__summaryCard--combined">
                    <div className="logPage__summaryCardArtwork" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <circle cx="12" cy="12" r="8.2" />
                        <path d="M12 7.9v4.7l3.1 2" />
                      </svg>
                    </div>
                    <div className="logPage__summaryCardTop">
                      <div className="logPage__summaryCardLabel">今日の練習時間</div>
                      <button type="button" className="logPage__summaryCardAction" onClick={openDurationModal}>
                        <span className="logPage__actionIconOnly" aria-hidden="true">
                          {renderEditPencilIcon()}
                        </span>
                        <span className="logPage__srOnly">記録</span>
                      </button>
                    </div>
                    <div className="logPage__summaryCardMainRow">
                      <div className="logPage__summaryCardValueBlock">
                        <div className="logPage__summaryCardRing" aria-hidden="true">
                          <svg viewBox="0 0 120 120" focusable="false" aria-hidden="true">
                            <circle className="logPage__summaryCardRingTrack" cx="60" cy="60" r="44" />
                            {practiceRingLayers.map((ring, index) => (
                              <circle
                                key={`practice-ring-${index}`}
                                className="logPage__summaryCardRingProgress"
                                cx="60"
                                cy="60"
                                r="44"
                                pathLength="100"
                                strokeDasharray={`${ring.progress * 100} 100`}
                                style={{ stroke: ring.color }}
                              />
                            ))}
                          </svg>
                          <div className="logPage__summaryCardRingValue">
                            <span>{displayDuration ?? "--"}</span>
                            <small>分</small>
                          </div>
                        </div>
                      </div>
                      <div className="logPage__summaryCardMetaColumn">
                        {practiceMetaItems.map((item) => (
                          <div key={item.key} className="logPage__summaryCardSubMeta">
                            <span className="logPage__summaryCardSubMetaLabel">{item.label}</span>
                            <span className="logPage__summaryCardSubMetaValue">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
              <div className="logPage__contentSection">
                <div className="logPage__contentWave" aria-hidden="true">
                  <svg viewBox="0 0 100 16" preserveAspectRatio="none">
                    <path d="M0 16V8C18 8 22 2 38 2C56 2 64 10 82 10C91 10 96 8 100 6V16Z" fill="currentColor" />
                  </svg>
                </div>
                <div className="logPage__contentInner">
                  <div className="logPage__sectionBlock">
                    <div className="logPage__sectionLabelRow">
                      <span className="logPage__sectionLabelIcon is-measure" aria-hidden="true">
                        {renderSectionIcon("measure")}
                      </span>
                      <div className="logPage__sectionLabel">MEASURE</div>
                    </div>
                    <div className="logPage__measurementGrid">
                      {measurementCards.map((card) => (
                        <button
                          key={card.key}
                          type="button"
                          className={`logPage__metricCard logPage__metricCard--${card.key}`}
                          onClick={card.onClick}
                        >
                          {(() => {
                            const metaText = "meta" in card ? card.meta : null;
                            return (
                              <>
                                <div className="logPage__metricBody">
                                  <div className="logPage__metricTitleRow">
                                    <span className={`logPage__metricTitleIcon logPage__metricTitleIcon--${card.key}`} aria-hidden="true">
                                      {renderMetricTitleIcon(card.key)}
                                    </span>
                                    <div className="logPage__metricTitle">{card.title}</div>
                                  </div>
                                  {card.key === "range" ? (
                                    <div className="logPage__rangeSummary">
                                      <div className="logPage__rangePrimary">
                                        {rangeResult?.range_octaves != null ? `${rangeResult.range_octaves.toFixed(1)} oct` : "未測定"}
                                      </div>
                                      <div className="logPage__rangeNotes">
                                        <span className="logPage__rangeNote">{rangeResult?.lowest_note ?? "--"}</span>
                                        <span className="logPage__rangeDivider" aria-hidden="true" />
                                        <span className="logPage__rangeNote">{rangeResult?.highest_note ?? "--"}</span>
                                      </div>
                                    </div>
                                  ) : card.key === "long_tone" || card.key === "volume_stability" ? null : (
                                    <>
                                      <div className="logPage__metricValue">{card.value}</div>
                                      {metaText ? <div className="logPage__metricMeta">{metaText}</div> : null}
                                    </>
                                  )}
                                  {card.key === "long_tone" && (
                                    <>
                                      <div className="logPage__metricViz logPage__metricViz--ring" aria-hidden="true">
                                        <div
                                          className="logPage__miniRing"
                                          style={{ ["--ring-progress" as string]: String(longToneProgress) }}
                                        >
                                          <span>{longToneResult?.sustain_sec != null ? `${longToneResult.sustain_sec.toFixed(1)}s` : "--"}</span>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                  {card.key === "volume_stability" && (
                                    <>
                                      <div className="logPage__metricViz logPage__metricViz--ring" aria-hidden="true">
                                        <div
                                          className="logPage__miniRing logPage__miniRing--volume"
                                          style={{ ["--ring-progress" as string]: String(volumeProgress) }}
                                        >
                                          <span>{volumeResult?.loudness_range_pct != null ? `${Math.round(volumeResult.loudness_range_pct)}%` : "--"}</span>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                  {card.key === "pitch_accuracy" && (
                                    <>
                                      <div className="logPage__metricViz logPage__metricViz--pitch" aria-hidden="true">
                                        <div className="logPage__pitchBar">
                                          <span className="is-good" />
                                          <span className="is-mid" />
                                          <span className="is-bad" />
                                          <i style={{ left: `${pitchProgress * 100}%` }} />
                                        </div>
                                      </div>
                                      <div className="logPage__pitchCaption">0 - 1半音</div>
                                    </>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="logPage__contentSection logPage__contentSection--white">
                    <div className="logPage__contentWave logPage__contentWave--white" aria-hidden="true">
                      <svg viewBox="0 0 100 16" preserveAspectRatio="none">
                        <path d="M0 16V8C18 8 22 2 38 2C56 2 64 10 82 10C91 10 96 8 100 6V16Z" fill="currentColor" />
                      </svg>
                    </div>
                    <div className="logPage__contentInner logPage__contentInner--white">
                      <div className="logPage__sectionBlock">
                        <div className="logPage__sectionLabelRow">
                          <span className="logPage__sectionLabelIcon is-menus" aria-hidden="true">
                            {renderSectionIcon("today_menus")}
                          </span>
                          <div className="logPage__sectionLabel">TODAY MENUS</div>
                        </div>
                        <section className="logPage__todayMenusCard">
                          <div className="logPage__daySectionHead">
                            <div className="logPage__noteSubtext">今日実施したトレーニングメニューを記録します</div>
                            <button type="button" className="logPage__btn logPage__todayMenusEditBtn" onClick={openTodayMenuModal}>
                              <span className="logPage__actionIconOnly" aria-hidden="true">
                                {renderEditPencilIcon()}
                              </span>
                              <span className="logPage__srOnly">{guestMode ? "記録" : "編集"}</span>
                            </button>
                          </div>
                          {menuItems.length ? (
                            <div className="logPage__todayMenuList" role="list">
                              {menuItems.map((m) => (
                                <div
                                  key={m.id}
                                  className="logPage__todayMenuItem"
                                  style={{ ["--menu-chip-color" as string]: m.color ?? "#9BDDE5" }}
                                  title={m.archived ? "このメニューは現在アーカイブされています" : undefined}
                                  role="listitem"
                                >
                                  <span className="logPage__todayMenuItemDot" aria-hidden="true" />
                                  <span className="logPage__todayMenuItemName">{m.name}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="logPage__metricEmpty">{emptyHint}</div>
                          )}
                        </section>
                      </div>
                      <div className="logPage__sectionBlock">
                        <div className="logPage__sectionLabelRow">
                          <span className="logPage__sectionLabelIcon is-note" aria-hidden="true">
                            {renderSectionIcon("note")}
                          </span>
                          <div className="logPage__sectionLabel">NOTE</div>
                        </div>
                      <section className="logPage__memoCard">
                        <div className="logPage__daySectionHead">
                          <div className="logPage__noteSubtext">その日の気づきや、うまくいった感覚を残します</div>
                          {dayNotesEditing ? (
                            <div className="logPage__noteActions">
                              <button
                                type="button"
                                className="logPage__btn"
                                onClick={() => {
                                  setDayNotesDraft(effectiveLog?.notes ?? "");
                                  setDayNotesEditing(false);
                                  setDayNotesError(null);
                                }}
                                disabled={dayNotesSaving}
                              >
                                キャンセル
                              </button>
                              <button
                                type="button"
                                className="logPage__btn logPage__btn--softAccent"
                                onClick={() => void onSaveDayNotes()}
                                disabled={dayNotesSaving}
                              >
                                {guestMode ? "ログインして保存" : dayNotesSaving ? "保存中…" : "保存"}
                              </button>
                            </div>
                          ) : (
                            <button type="button" className="logPage__btn" onClick={() => setDayNotesEditing(true)}>
                              <span className="logPage__actionIconOnly" aria-hidden="true">
                                {renderEditPencilIcon()}
                              </span>
                              <span className="logPage__srOnly">{dayNotesDraft.trim() ? "編集" : "記入"}</span>
                            </button>
                          )}
                        </div>
                        {dayNotesEditing ? (
                          <textarea
                            className="logPage__dayMemoInput"
                            value={dayNotesDraft}
                            onChange={(e) => setDayNotesDraft(e.target.value)}
                            placeholder="その日の気づきや、うまくいった感覚を書いておく"
                            rows={5}
                          />
                        ) : (
                          <button
                            type="button"
                            className={`logPage__notePreview ${dayNotesDraft.trim() ? "" : "is-placeholder"}`.trim()}
                            onClick={() => setDayNotesEditing(true)}
                          >
                            {dayNotesDraft.trim() || "その日の気づきや、うまくいった感覚を書いておく"}
                          </button>
                        )}
                        {dayNotesError && <div className="logPage__error">{dayNotesError}</div>}
                      </section>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
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
                          <div className="logPage__monthRatioBar" aria-hidden="true">
                            <span
                              className="logPage__monthRatioBarFill"
                              style={{
                                width: `${Math.max(
                                  4,
                                  monthTotalMenuCount > 0 ? (entry.count / monthTotalMenuCount) * 100 : 0
                                )}%`,
                              }}
                            />
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

      </div>
    </div>
  );
}
