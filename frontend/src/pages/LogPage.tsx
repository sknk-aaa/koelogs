import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchTrainingLogByDate } from "../api/trainingLogs";
import { createAiRecommendation, fetchAiRecommendationByDate } from "../api/aiRecommendations";
import { fetchInsights } from "../api/insights";
import type { TrainingLog } from "../types/trainingLog";
import type { AiRecommendation } from "../types/aiRecommendation";
import { useSettings } from "../features/settings/useSettings";
import { useAuth } from "../features/auth/useAuth";

import MonthlyLogsModal from "../features/monthlyLogs/MonthlyLogsModal";

import "./LogPage.css";

import LogHeader from "../features/log/components/LogHeader";
import SummaryCard from "../features/log/components/SummaryCard";
import AiRecommendationCard from "../features/log/components/AiRecommendationCard";
import WelcomeGuideModal from "../features/log/components/WelcomeGuideModal";

import { fetchMe, updateMeGoalText, type Me } from "../api/auth";

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const AI_PREVIEW_CHARS = 100;
const GOAL_MAX = 50;
const FIRST_LOGIN_GUIDE_KEY_PREFIX = "voice_app_log_first_guide_seen_user_";

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
  const date = useMemo(() => params.get("date") || todayISO(), [params]);

  const isToday = date === today;
  const monthKey = useMemo(() => date.slice(0, 7), [date]); // YYYY-MM
  const { settings } = useSettings();
  const { me: authMe, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<TrainingLog | null>(null);
  const [currentStreakDays, setCurrentStreakDays] = useState<number | null>(null);
  const [totalPracticeDaysCount, setTotalPracticeDaysCount] = useState<number | null>(null);
  const [firstGuideOpen, setFirstGuideOpen] = useState(false);

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
    if (!me) return; // 未ログインなら起こらないはずだが保険
    if (goalSaving) return;

    const v = goalDraft.trim();
    if (v.length > GOAL_MAX) {
      setGoalError(`50文字以内で入力してください（現在 ${v.length} 文字）`);
      return;
    }

    setGoalSaving(true);
    setGoalError(null);

    try {
      const updated = await updateMeGoalText(v); // 空文字はRails側で nil になる
      setMe(updated);
      setGoalEditing(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "保存できませんでした";
      setGoalError(msg);
    } finally {
      setGoalSaving(false);
    }
  };

  // AI recommendation state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRec, setAiRec] = useState<AiRecommendation | null>(null);

  // 今月一覧モーダル state
  const [monthModalOpen, setMonthModalOpen] = useState(false);

  // AIおすすめ：折りたたみ state（日付ごと）
  const [aiExpandedByDate, setAiExpandedByDate] = useState<Record<string, boolean>>({});
  const aiExpanded = !!aiExpandedByDate[date];
  const setAiExpanded = (v: boolean | ((prev: boolean) => boolean)) => {
    setAiExpandedByDate((prev) => {
      const cur = !!prev[date];
      const nextVal = typeof v === "function" ? (v as (p: boolean) => boolean)(cur) : v;
      return { ...prev, [date]: nextVal };
    });
  };

  // training_log fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authMe) {
        setLoading(false);
        setError(null);
        setLog(null);
        return;
      }

      setLoading(true);
      setError(null);

      const res = await fetchTrainingLogByDate(date);
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
  }, [date, authMe]);

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

  // ai recommendation fetch (read-only)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authMe) {
        setAiError(null);
        setAiRec(null);
        return;
      }

      setAiError(null);

      const res = await fetchAiRecommendationByDate(date);
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
  }, [date, authMe]);

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
    setParams({ date: next });
  };

  const goNew = () => {
    if (!authMe) {
      navigate(`/login`, { state: { fromPath: `/log?date=${encodeURIComponent(date)}` } });
      return;
    }
    navigate(`/log/new?date=${encodeURIComponent(date)}`);
  };

  const onAskAi = async () => {
    if (!authMe) {
      navigate(`/login`, { state: { fromPath: `/log?date=${encodeURIComponent(date)}` } });
      return;
    }
    if (aiLoading) return;

    setAiLoading(true);
    setAiError(null);

    const res = await createAiRecommendation({
      range_days: settings.aiRangeDays,
      date,
    });

    if (!res.ok) {
      setAiError(res.errors.join("\n"));
      setAiLoading(false);
      return;
    }

    setAiRec(res.data);
    setAiLoading(false);

    // 生成直後は開く
    setAiExpanded(true);
  };

  const closeFirstGuide = () => {
    if (authMe) {
      const key = `${FIRST_LOGIN_GUIDE_KEY_PREFIX}${authMe.id}`;
      try {
        window.localStorage.setItem(key, "1");
      } catch {
        // localStorage未使用環境では保存しない
      }
    }
    setFirstGuideOpen(false);
  };

  const guestMode = !authLoading && !authMe;
  const previewLog: TrainingLog = {
    id: -1,
    practiced_on: date,
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
    generated_for_date: date,
    range_days: settings.aiRangeDays,
    recommendation_text:
      "今日はウォームアップを10分入れてから、ミックス練習を中心に。後半はテンポを落として音程の安定を優先しましょう。",
    created_at: new Date().toISOString(),
  };

  const effectiveLog = guestMode ? previewLog : log;
  const effectiveAiRec = guestMode ? previewAiRec : aiRec;
  const showAiArea = guestMode || !!effectiveAiRec || aiLoading || !!aiError;
  const showAiButton = isToday && !aiLoading && !effectiveAiRec && !aiError;

  const menuItems = effectiveLog?.menus ?? [];

  const aiTextRaw = effectiveAiRec?.recommendation_text ?? "";
  const aiCollapsible = aiTextRaw ? shouldCollapseText(aiTextRaw, AI_PREVIEW_CHARS) : false;
  const aiShownText =
    aiTextRaw && !aiExpanded && aiCollapsible ? previewText(aiTextRaw, AI_PREVIEW_CHARS) : aiTextRaw;

  const emptyHint = isToday
    ? "最初は1項目だけでもOKです。入力した分だけ反映されます。"
    : "この日付で入力すると、今日の結果と同じ形式で表示されます。";

  const goalText = me?.goal_text ?? null;
  const isWithinInitial7Days = isWithinFirst7Days(me?.created_at);
  const aiCreateButtonText =
    !guestMode && isWithinInitial7Days
      ? "目標やトレーニングデータから今日のおすすめを作成"
      : "AI提案を作成";

  return (
    <div className="page logPage">
      <LogHeader
        date={date}
        onChangeDate={onChangeDate}
        onOpenMonthly={() => {
          if (!authMe) {
            navigate(`/login`, { state: { fromPath: `/log?date=${encodeURIComponent(date)}` } });
            return;
          }
          setMonthModalOpen(true);
        }}
      />

      <WelcomeGuideModal
        open={firstGuideOpen}
        onClose={closeFirstGuide}
        onStartRecord={() => {
          closeFirstGuide();
          navigate(`/log/new?date=${encodeURIComponent(date)}`, {
            state: { quickFromWelcome: true },
          });
        }}
      />

      {/* ✅ 目標：LogHeader直下／日付移動しても固定 */}
      {!!me && <div className="goalBar">
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
      </div>}

      <MonthlyLogsModal
        open={monthModalOpen}
        month={monthKey}
        onClose={() => setMonthModalOpen(false)}
        onSelectDate={(d) => {
          setParams({ date: d });
        }}
      />

      <div className="logPage__stack">
        <SummaryCard
          loading={guestMode ? false : loading}
          error={guestMode ? null : error}
          log={effectiveLog}
          menuItems={menuItems}
          emptyHint={emptyHint}
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

        {showAiArea && (
          <AiRecommendationCard
            rangeDays={settings.aiRangeDays}
            aiLoading={aiLoading}
            aiError={guestMode ? null : aiError}
            aiRec={effectiveAiRec}
            shownText={aiShownText}
            collapsible={aiCollapsible}
            expanded={aiExpanded}
            onToggleExpanded={() => setAiExpanded((v) => !v)}
          />
        )}
      </div>

      <div className="logPage__actions">
        {(showAiButton || guestMode) && (
          <button onClick={onAskAi} className="logPage__btn">
            {guestMode ? "ログインしてAI提案を作成" : aiCreateButtonText}
          </button>
        )}
      </div>

    </div>
  );
}
