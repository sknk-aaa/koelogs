import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchTrainingLogByDate } from "../api/trainingLogs";
import { fetchWeeklyLogByWeekStart, upsertWeeklyLog } from "../api/weeklyLogs";
import { createAiRecommendation, fetchAiRecommendationByDate } from "../api/aiRecommendations";
import { fetchTrainingMenus } from "../api/trainingMenus";
import { fetchInsights } from "../api/insights";
import type { TrainingLog } from "../types/trainingLog";
import type { AiRecommendation } from "../types/aiRecommendation";
import type { WeeklyLog, WeeklyLogSummary } from "../types/weeklyLog";
import type { TrainingMenu } from "../types/trainingMenu";
import { useSettings } from "../features/settings/useSettings";
import { useAuth } from "../features/auth/useAuth";

import MonthlyLogsModal from "../features/monthlyLogs/MonthlyLogsModal";

import "./LogPage.css";

import LogHeader from "../features/log/components/LogHeader";
import SummaryCard from "../features/log/components/SummaryCard";
import WeeklySummaryCard from "../features/log/components/WeeklySummaryCard";
import AiRecommendationCard from "../features/log/components/AiRecommendationCard";
import WelcomeGuideModal from "../features/log/components/WelcomeGuideModal";
import { setLastLogPath } from "../features/log/logNavigation";

import { fetchMe, updateMeGoalText, type Me } from "../api/auth";

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

function weekStartISO(value: string): string {
  const d = parseISODate(value) ?? new Date();
  const dayMon0 = (d.getDay() + 6) % 7;
  const start = new Date(d);
  start.setDate(start.getDate() - dayMon0);
  return toISODate(start);
}

function addDaysISO(value: string, diffDays: number): string {
  const d = parseISODate(value) ?? new Date();
  d.setDate(d.getDate() + diffDays);
  return toISODate(d);
}

function weekLabel(startISO: string): string {
  const start = parseISODate(startISO) ?? new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
}

const AI_PREVIEW_CHARS = 100;
const GOAL_MAX = 50;
const FIRST_LOGIN_GUIDE_KEY_PREFIX = "voice_app_log_first_guide_seen_user_";

type LogMode = "day" | "week";

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
  const [params, setParams] = useSearchParams();
  const today = useMemo(() => todayISO(), []);
  const rawMode = params.get("mode");
  const selectedDate = useMemo(() => params.get("date") || today, [params, today]);
  const selectedWeekStart = useMemo(
    () => weekStartISO(params.get("week_start") || selectedDate),
    [params, selectedDate]
  );

  const monthKey = useMemo(() => selectedDate.slice(0, 7), [selectedDate]);
  const { settings } = useSettings();
  const { me: authMe, isLoading: authLoading } = useAuth();
  const guestMode = !authLoading && !authMe;

  const mode: LogMode = guestMode ? "day" : rawMode === "week" ? "week" : "day";
  const isDayMode = mode === "day";
  const isWeekMode = mode === "week";
  const currentLogPath = isWeekMode
    ? `/log?mode=week&week_start=${encodeURIComponent(selectedWeekStart)}`
    : `/log?mode=day&date=${encodeURIComponent(selectedDate)}`;

  const isToday = selectedDate === today;
  const currentWeekStart = useMemo(() => weekStartISO(today), [today]);
  const isCurrentWeek = selectedWeekStart === currentWeekStart;
  const canGoNextWeek = selectedWeekStart < currentWeekStart;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<TrainingLog | null>(null);
  const [currentStreakDays, setCurrentStreakDays] = useState<number | null>(null);
  const [totalPracticeDaysCount, setTotalPracticeDaysCount] = useState<number | null>(null);
  const [firstGuideOpen, setFirstGuideOpen] = useState(false);
  const [showGuideHintBanner, setShowGuideHintBanner] = useState(false);

  const [weekLoading, setWeekLoading] = useState(false);
  const [weekError, setWeekError] = useState<string | null>(null);
  const [weekLog, setWeekLog] = useState<WeeklyLog | null>(null);
  const [weekSummary, setWeekSummary] = useState<WeeklyLogSummary | null>(null);
  const [weekMenuOptions, setWeekMenuOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [weekSaveLoading, setWeekSaveLoading] = useState(false);
  const [weekSaveError, setWeekSaveError] = useState<string | null>(null);
  const [weekHasUnsavedChanges, setWeekHasUnsavedChanges] = useState(false);

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
  const aiKey = isDayMode ? `day:${selectedDate}` : `week:${selectedWeekStart}`;
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

  // Weekly log fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authMe || !isWeekMode) {
        setWeekLoading(false);
        setWeekError(null);
        setWeekLog(null);
        setWeekSummary(null);
        return;
      }

      setWeekLoading(true);
      setWeekError(null);
      setWeekSaveError(null);

      const res = await fetchWeeklyLogByWeekStart(selectedWeekStart);
      if (cancelled) return;

      if ("error" in res && res.error) {
        setWeekLog(null);
        setWeekSummary(null);
        setWeekError(res.error);
      } else {
        setWeekLog(res.data ?? null);
        setWeekSummary(res.summary);
      }
      setWeekLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedWeekStart, authMe, isWeekMode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authMe || !isWeekMode) {
        setWeekMenuOptions([]);
        return;
      }

      try {
        const menus = await fetchTrainingMenus(false);
        if (cancelled) return;
        setWeekMenuOptions(
          menus
            .filter((m: TrainingMenu) => !m.archived)
            .map((m: TrainingMenu) => ({ id: m.id, name: m.name }))
            .sort((a, b) => a.name.localeCompare(b.name, "ja"))
        );
      } catch {
        if (cancelled) return;
        setWeekMenuOptions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authMe, isWeekMode]);

  // streak fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authMe) {
        setCurrentStreakDays(null);
        setTotalPracticeDaysCount(null);
        return;
      }
      const res = await fetchInsights(30);
      if (cancelled) return;
      if ("error" in res && res.error) {
        setCurrentStreakDays(null);
        setTotalPracticeDaysCount(null);
        return;
      }
      setCurrentStreakDays(res.data?.streaks.current_days ?? null);
      setTotalPracticeDaysCount(res.data?.total_practice_days_count ?? 0);
    })();

    return () => {
      cancelled = true;
    };
  }, [authMe]);

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
      : `/log?mode=week&week_start=${encodeURIComponent(selectedWeekStart)}`;
    navigate(`/login`, { state: { fromPath } });
  };

  const confirmDiscardWeeklyChanges = () => {
    if (!isWeekMode || !weekHasUnsavedChanges) return true;
    return window.confirm("週メモに未保存の変更があります。破棄して移動しますか？");
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

  const onSaveWeeklyLog = async (payload: {
    notes: string | null;
    effect_feedbacks: Array<{ menu_id: number; improvement_tags: string[] }>;
  }) => {
    if (!authMe) {
      goLogin();
      return;
    }
    if (weekSaveLoading) return;

    setWeekSaveLoading(true);
    setWeekSaveError(null);

    const result = await upsertWeeklyLog({
      week_start: selectedWeekStart,
      notes: payload.notes,
      effect_feedbacks: payload.effect_feedbacks,
    });

    if (!result.ok) {
      setWeekSaveError(result.errors.join("\n"));
      setWeekSaveLoading(false);
      return;
    }

    setWeekLog(result.data);
    setWeekSummary(result.summary);
    setWeekHasUnsavedChanges(false);
    setWeekSaveLoading(false);
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
    falsetto_top_note: "A4",
    chest_top_note: "E4",
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
  const weeklyEmptyHint = "この週のメモと効果的だったメニューを記録できます。";

  const goalText = me?.goal_text ?? null;
  const isWithinInitial7Days = isWithinFirst7Days(me?.created_at);
  const aiCreateButtonText =
    !guestMode && isWithinInitial7Days
      ? "目標やトレーニングデータから今日のおすすめを作成"
      : "AI提案を作成";

  useEffect(() => {
    setLastLogPath(currentLogPath);
  }, [currentLogPath]);

  useEffect(() => {
    if (!isWeekMode || !weekHasUnsavedChanges) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [isWeekMode, weekHasUnsavedChanges]);

  return (
    <div className="page logPage">
      {!!authMe && (
        <div className="logPage__modeSwitch">
          <button
            type="button"
            className={`logPage__modeBtn ${isDayMode ? "is-active" : ""}`}
            onClick={() => {
              if (!confirmDiscardWeeklyChanges()) return;
              setParams({ mode: "day", date: isWeekMode ? selectedWeekStart : selectedDate });
            }}
          >
            日ログ
          </button>
          <button
            type="button"
            className={`logPage__modeBtn ${isWeekMode ? "is-active" : ""}`}
            onClick={() => setParams({ mode: "week", week_start: selectedWeekStart })}
          >
            週ログ
          </button>
        </div>
      )}

      {isDayMode ? (
        <LogHeader
          date={selectedDate}
          onChangeDate={onChangeDate}
          onOpenMonthly={() => {
            if (!authMe) {
              navigate(`/login`, { state: { fromPath: `/log?mode=day&date=${encodeURIComponent(selectedDate)}` } });
              return;
            }
            setMonthModalOpen(true);
          }}
        />
      ) : (
        <div className="logPage__weekHeader">
          <div className="logPage__weekHeaderLeft">
            <div className="logPage__title">ログ</div>
            <div className="logPage__muted">週の振り返りを記録</div>
          </div>

          <div className="logPage__weekNav">
            <button
              type="button"
              className="logPage__btn logPage__weekNavBtn"
              onClick={() => {
                if (!confirmDiscardWeeklyChanges()) return;
                setParams({ mode: "week", week_start: addDaysISO(selectedWeekStart, -7) });
              }}
            >
              前の週
            </button>
            <div className="logPage__weekLabel">{weekLabel(selectedWeekStart)}</div>
            <button
              type="button"
              className="logPage__btn logPage__weekNavBtn"
              onClick={() => {
                if (!confirmDiscardWeeklyChanges()) return;
                setParams({ mode: "week", week_start: addDaysISO(selectedWeekStart, 7) });
              }}
              disabled={!canGoNextWeek}
            >
              次の週
            </button>
            {!isCurrentWeek && (
              <button
                type="button"
                className="logPage__btn logPage__weekNowBtn"
                onClick={() => {
                  if (!confirmDiscardWeeklyChanges()) return;
                  setParams({ mode: "week", week_start: currentWeekStart });
                }}
              >
                今週へ
              </button>
            )}
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

      {isDayMode && (
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
                <div className="logPage__guestPreviewCardTitle">最高音の変化が見える</div>
                <div className="logPage__guestPreviewCardValue">裏声 A4 / 地声 E4</div>
                <div className="logPage__guestPreviewCardText">裏声・地声の推移を日次で確認</div>
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
          <WeeklySummaryCard
            key={`weekly-card-${selectedWeekStart}-${weekLog?.id ?? "none"}-${weekLog?.updated_at ?? "none"}`}
            loading={weekLoading}
            error={weekError}
            log={weekLog}
            summary={weekSummary}
            emptyHint={weeklyEmptyHint}
            menuOptions={weekMenuOptions}
            saving={weekSaveLoading}
            saveError={weekSaveError}
            onSave={onSaveWeeklyLog}
            onDirtyChange={setWeekHasUnsavedChanges}
          />
        )}

        {showAiArea && (
          <AiRecommendationCard
            title={isDayMode ? "今日のおすすめメニュー" : "今週のおすすめメニュー"}
            meta={
              isDayMode
                ? `今日を含めて直近 ${settings.aiRangeDays} 日を参考`
                : "先週と先々週の記録を参考"
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
          <>
            <button onClick={onAskAi} className="logPage__btn">
              {guestMode && isDayMode
                ? "ログインしてAI提案を作成"
                : aiCreateButtonText}
            </button>
            {guestMode && isDayMode && (
              <div className="logPage__muted">ログイン後は、あなたの目標と記録を使って提案します。</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
