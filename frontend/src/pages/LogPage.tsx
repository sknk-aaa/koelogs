import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchTrainingLogByDate } from "../api/trainingLogs";
import { createAiRecommendation, fetchAiRecommendationByDate } from "../api/aiRecommendations";
import type { TrainingLog } from "../types/trainingLog";
import type { AiRecommendation } from "../types/aiRecommendation";
import { useSettings } from "../features/settings/useSettings";

import MonthlyLogsModal from "../features/monthlyLogs/MonthlyLogsModal";

import "./LogPage.css";

import LogHeader from "../features/log/components/LogHeader";
import SummaryCard from "../features/log/components/SummaryCard";
import AiRecommendationCard from "../features/log/components/AiRecommendationCard";

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

function shouldCollapseText(text: string, previewChars: number) {
  return text.trim().length > previewChars;
}

function previewText(text: string, previewChars: number) {
  const t = text.trim();
  if (t.length <= previewChars) return t;
  return t.slice(0, previewChars) + "…";
}

export default function LogPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const today = useMemo(() => todayISO(), []);
  const date = useMemo(() => params.get("date") || todayISO(), [params]);

  const isToday = date === today;
  const monthKey = useMemo(() => date.slice(0, 7), [date]); // YYYY-MM
  const { settings } = useSettings();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<TrainingLog | null>(null);

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
  }, [date]);

  // ai recommendation fetch (read-only)
  useEffect(() => {
    let cancelled = false;
    (async () => {
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
  }, [date]);

  const onChangeDate = (next: string) => {
    setParams({ date: next });
  };

  const goNew = () => {
    navigate(`/log/new?date=${encodeURIComponent(date)}`);
  };

  const onAskAi = async () => {
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

  const showAiArea = !!aiRec || aiLoading || !!aiError;
  const showAiButton = isToday && !aiLoading && !aiRec && !aiError;

  const menuItems = log?.menus ?? [];

  const aiTextRaw = aiRec?.recommendation_text ?? "";
  const aiCollapsible = aiTextRaw ? shouldCollapseText(aiTextRaw, AI_PREVIEW_CHARS) : false;
  const aiShownText =
    aiTextRaw && !aiExpanded && aiCollapsible ? previewText(aiTextRaw, AI_PREVIEW_CHARS) : aiTextRaw;

  const emptyHint = isToday
    ? "まだ今日のログはありません。まずは記録して、必要ならAIおすすめも生成しましょう。"
    : "この日のログはまだありません。必要ならこの日付で記録できます。";

  const goalText = me?.goal_text ?? null;

  return (
    <div className="page logPage">
      <LogHeader date={date} onChangeDate={onChangeDate} onOpenMonthly={() => setMonthModalOpen(true)} />

      {/* ✅ 目標：LogHeader直下／日付移動しても固定 */}
      <div className="goalBar">
        {!goalEditing ? (
          goalText ? (
            <div className="goalBar__view">
              <div className="goalBar__row">
                <div className="goalBar__label">🎯 今月の目標</div>
                <button className="goalBar__btn" type="button" onClick={openGoalEdit}>
                  編集
                </button>
              </div>
              <div className="goalBar__text">「{goalText}」</div>
            </div>
          ) : (
            <div className="goalBar__view">
              <div className="goalBar__row">
                <div className="goalBar__label">🎯 目標を設定する（最大50文字）</div>
                <button className="goalBar__btn" type="button" onClick={openGoalEdit}>
                  設定する
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="goalBar__edit">
            <div className="goalBar__row">
              <div className="goalBar__label">🎯 目標を編集（最大50文字）</div>
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
          loading={loading}
          error={error}
          log={log}
          menuItems={menuItems}
          emptyHint={emptyHint}
          recordLabel={isToday ? "今日のトレーニングを記録" : "この日のトレーニングを記録"}
          onClickRecord={goNew}
        />

        {showAiArea && (
          <AiRecommendationCard
            rangeDays={settings.aiRangeDays}
            aiLoading={aiLoading}
            aiError={aiError}
            aiRec={aiRec}
            shownText={aiShownText}
            collapsible={aiCollapsible}
            expanded={aiExpanded}
            onToggleExpanded={() => setAiExpanded((v) => !v)}
          />
        )}
      </div>

      <div className="logPage__actions">
        {showAiButton && (
          <button onClick={onAskAi} className="btn">
            AIに今日のおすすめを聞く
          </button>
        )}
      </div>
    </div>
  );
}
