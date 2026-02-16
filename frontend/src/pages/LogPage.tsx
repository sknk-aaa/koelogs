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

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const AI_PREVIEW_CHARS = 100;

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

  return (
    <div className="page logPage">
      <LogHeader
        date={date}
        onChangeDate={onChangeDate}
        onOpenMonthly={() => setMonthModalOpen(true)}
      />

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
