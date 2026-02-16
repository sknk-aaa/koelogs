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
import ColoredTag from "../components/ColoredTag";

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const AI_PREVIEW_CHARS = 260;

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

  // ✅ AIおすすめ：折りたたみ state（日付が変わったら閉じる）
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

  // ✅ ai recommendation fetch (read-only)
  // - フェッチ開始時に aiRec を null にしない（チラつき/ボタン復活防止）
  // - data:null は「その日付の保存が無い」なので aiRec を null にする（ボタン制御に使う）
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

  // ✅ 日付が変わったら、折りたたみ状態はリセット（常に閉じて開始）
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

    // POSTの返却をそのまま採用（保存済み）
    setAiRec(res.data);
    setAiLoading(false);

    // 生成した直後は “開いた状態” にして満足感を出す
    setAiExpanded(true);
  };

  const showAiArea = !!aiRec || aiLoading || !!aiError;

  // ✅ ボタンは「今日」かつ「未生成」かつ「生成中でない」かつ「エラー表示中でない」時だけ
  const showAiButton = isToday && !aiLoading && !aiRec && !aiError;

  // ✅ menu_id設計：ログレスポンスの menus をそのまま表示（name→colorMapは不要）
  const menuItems = log?.menus ?? [];

  // ✅ AI text（折りたたみ）
  const aiTextRaw = aiRec?.recommendation_text ?? "";
  const aiCollapsible = aiTextRaw ? shouldCollapseText(aiTextRaw, AI_PREVIEW_CHARS) : false;
  const aiShownText =
    aiTextRaw && !aiExpanded && aiCollapsible ? previewText(aiTextRaw, AI_PREVIEW_CHARS) : aiTextRaw;

  return (
    <div className="page logPage">
      {/* h1 はヘッダー中央運用に統一するので削除 */}

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

        {!loading && error && <div className="logPage__error">取得に失敗しました: {error}</div>}

        {!loading && !error && !log && (
          <div>この日のログはまだありません。下のボタンから記録してください。</div>
        )}

        {!loading && !error && log && (
          <div className="logPage__summaryGrid">
            <div>練習時間: {log.duration_min ?? 0} 分</div>

            <div>
              メニュー:{" "}
              {menuItems.length ? (
                <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 8, marginLeft: 6 }}>
                  {menuItems.map((m) => (
                    <ColoredTag
                      key={m.id}
                      text={m.name}
                      color={m.color ?? "#E5E7EB"}
                      title={m.archived ? "このメニューは現在アーカイブされています" : undefined}
                      className={m.archived ? "is-archived" : undefined}
                    />
                  ))}
                </span>
              ) : (
                "なし"
              )}
            </div>

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

      {/* AIおすすめ表示（過去日付でも保存されていれば表示される） */}
      {showAiArea && (
        <div className="card logPage__card">
          <div className="logPage__cardTitle">
            AIおすすめ <span className="logPage__subtle">（参照 {settings.aiRangeDays} 日）</span>
          </div>

          {aiLoading && <div>生成中…</div>}

          {!aiLoading && aiError && <div className="logPage__error">取得/生成に失敗しました: {aiError}</div>}

          {!aiLoading && aiRec && (
            <>
              <div className="logPage__aiText">{aiShownText}</div>

              {aiCollapsible && (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="logPage__moreBtn logPage__moreBtn--link"
                    onClick={() => setAiExpanded((v) => !v)}
                    aria-expanded={aiExpanded}
                  >
                    {aiExpanded ? "折りたたむ" : "続きを読む"}
                    <span className="logPage__moreIcon" aria-hidden="true">
                      {aiExpanded ? "▲" : "▼"}
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 下部アクション */}
      <div className="logPage__actions">
        <button onClick={goNew} className="btn">
          {isToday ? "今日のトレーニングを記録" : "この日のトレーニングを記録"}
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
