import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchTrainingLogByDate } from "../api/trainingLogs";
import { createAiRecommendation, fetchAiRecommendationByDate } from "../api/aiRecommendations";
import type { TrainingLog } from "../types/trainingLog";
import type { AiRecommendation } from "../types/aiRecommendation";

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<TrainingLog | null>(null);

  // AI recommendation state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRec, setAiRec] = useState<AiRecommendation | null>(null);

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
        // 401などもここに来る（表示は要件通り画面表示）
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
    const res = await createAiRecommendation({ range_days: 7 });

    if (res.ok) {
      setAiRec(res.data);
      setAiLoading(false);
      return;
    }

    // 422/500 を画面表示（要件）
    setAiError(res.errors.join("\n"));
    setAiLoading(false);
  };

  const showAiButton = isToday && !aiRec && !aiLoading; // 今日だけ + まだ無いならボタン
  const showAiArea = !!aiRec || aiLoading || !!aiError;

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto", color: "green" }}>
      <h1 style={{ margin: "8px 0 12px" }}>ログ</h1>

      {/* 日付選択 */}
      <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <div style={{ fontSize: 13, opacity: 0.75 }}>日付</div>
        <input
          type="date"
          value={date}
          onChange={(e) => onChangeDate(e.target.value)}
          style={{
            height: 40,
            padding: "0 12px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            width: "100%",
            maxWidth: 260,
          }}
        />
      </div>

      {/* サマリー */}
      <div
        style={{
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 16,
          padding: 16,
          background: "#fff",
          boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 10 }}>選択日のサマリー</div>

        {loading && <div>読み込み中…</div>}

        {!loading && error && (
          <div style={{ color: "#b00020", whiteSpace: "pre-wrap" }}>
            取得に失敗しました: {error}
          </div>
        )}

        {!loading && !error && !log && (
          <div>この日のログはまだありません。下のボタンから記録してください。</div>
        )}

        {!loading && !error && log && (
          <div style={{ display: "grid", gap: 6 }}>
            <div>練習時間: {log.duration_min ?? 0} 分</div>
            <div>メニュー: {log.menus?.length ? log.menus.join(", ") : "なし"}</div>
            <div>裏声最高音: {log.falsetto_top_note ?? "—"}</div>
            <div>地声最高音: {log.chest_top_note ?? "—"}</div>

            {log.notes && (
              <div style={{ marginTop: 8, opacity: 0.85 }}>
                メモ: {log.notes.length > 120 ? log.notes.slice(0, 120) + "…" : log.notes}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AIおすすめ表示 */}
      {showAiArea && (
        <div
          style={{
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 16,
            padding: 16,
            background: "#fff",
            boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 10 }}>AIおすすめ</div>

          {aiLoading && <div>生成中…</div>}

          {!aiLoading && aiError && (
            <div style={{ color: "#b00020", whiteSpace: "pre-wrap" }}>
              取得/生成に失敗しました: {aiError}
            </div>
          )}

          {!aiLoading && aiRec && (
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {aiRec.recommendation_text}
            </div>
          )}
        </div>
      )}

      {/* 下部アクション */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={goNew}
          style={{
            height: 44,
            padding: "0 16px",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          今日のトレーニングを記録
        </button>

        {showAiButton && (
          <button
            onClick={onAskAi}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            AIに今日のおすすめを聞く
          </button>
        )}
      </div>
    </div>
  );
}
