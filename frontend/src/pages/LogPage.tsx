import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchTrainingLogByDate } from "../api/trainingLogs";
import { createAiRecommendation, fetchAiRecommendationByDate } from "../api/aiRecommendations";
import type { TrainingLog } from "../types/trainingLog";
import type { AiRecommendation } from "../types/aiRecommendation";
import { useSettings } from "../features/settings/useSettings";

// ✅ 今月一覧モーダル
import MonthlyLogsModal from "../features/monthlyLogs/MonthlyLogsModal";

import "./LogPage.css";

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function LogPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const date = useMemo(() => params.get("date") || todayISO(), [params]);

  const isToday = date === todayISO();
  const monthKey = useMemo(() => date.slice(0, 7), [date]); // YYYY-MM（選択日の月）

  const { settings } = useSettings();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<TrainingLog | null>(null);

  // AI recommendation state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRec, setAiRec] = useState<AiRecommendation | null>(null);

  // ✅ 今月一覧モーダル state
  const [monthModalOpen, setMonthModalOpen] = useState(false);

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
      setAiRec(null);

      const res = await fetchAiRecommendationByDate(date);
      if (cancelled) return;

      if (res.error) {
        setAiError(res.error);
        setAiRec(null);
      } else {
        setAiRec(res.data ?? null);
      }
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
    setAiLoading(true);
    setAiError(null);

    const res = await createAiRecommendation({ range_days: settings.aiRangeDays });

    if (res.ok) {
      setAiRec(res.data);
      setAiLoading(false);
      return;
    }

    setAiError(res.errors.join("\n"));
    setAiLoading(false);
  };

  const showAiButton = isToday && !aiRec && !aiLoading;
  const showAiArea = !!aiRec || aiLoading || !!aiError;

  return (
    <div className="page logPage">
      <h1 className="h1">ログ</h1>

      {/* 日付選択 + 月一覧ボタン（横並び） */}
      <div className="logPage__dateArea logPage__dateRow">
        <div className="logPage__dateLeft">
          <div className="logPage__label">日付</div>
          <input
            type="date"
            value={date}
            onChange={(e) => onChangeDate(e.target.value)}
            className="logPage__dateInput"
          />
        </div>

        <div className="logPage__dateRight">
          <button className="btn" onClick={() => setMonthModalOpen(true)}>
            月のログ一覧を開く
          </button>
        </div>

        <MonthlyLogsModal
          open={monthModalOpen}
          month={monthKey}
          onClose={() => setMonthModalOpen(false)}
          onSelectDate={(d) => {
            setParams({ date: d });
          }}
        />
      </div>

      {/* サマリー */}
      <div className="card logPage__card">
        <div className="logPage__cardTitle">選択日のサマリー</div>

        {loading && <div>読み込み中…</div>}

        {!loading && error && (
          <div className="logPage__error">取得に失敗しました: {error}</div>
        )}

        {!loading && !error && !log && (
          <div>この日のログはまだありません。下のボタンから記録してください。</div>
        )}

        {!loading && !error && log && (
          <div className="logPage__summaryGrid">
            <div>練習時間: {log.duration_min ?? 0} 分</div>
            <div>メニュー: {log.menus?.length ? log.menus.join(", ") : "なし"}</div>
            <div>裏声最高音: {log.falsetto_top_note ?? "—"}</div>
            <div>地声最高音: {log.chest_top_note ?? "—"}</div>

            {log.notes && (
              <div className="logPage__notes">
                メモ: {log.notes.length > 120 ? log.notes.slice(0, 120) + "…" : log.notes}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AIおすすめ表示 */}
      {showAiArea && (
        <div className="card logPage__card">
          <div className="logPage__cardTitle">
            AIおすすめ{" "}
            <span className="logPage__subtle">
              （参照 {settings.aiRangeDays} 日）
            </span>
          </div>

          {aiLoading && <div>生成中…</div>}

          {!aiLoading && aiError && (
            <div className="logPage__error">取得/生成に失敗しました: {aiError}</div>
          )}

          {!aiLoading && aiRec && (
            <div className="logPage__aiText">{aiRec.recommendation_text}</div>
          )}
        </div>
      )}

      {/* 下部アクション */}
      <div className="logPage__actions">
        <button onClick={goNew} className="btn">
          今日のトレーニングを記録
        </button>

        {showAiButton && (
          <button onClick={onAskAi} className="btn">
            AIに今日のおすすめを聞く
          </button>
        )}
      </div>
    </div>
  );
}
