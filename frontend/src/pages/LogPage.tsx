import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchTrainingLogByDate } from "../api/trainingLogs";
import type { TrainingLog } from "../types/trainingLog";

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<TrainingLog | null>(null);

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

  const onChangeDate = (next: string) => {
    setParams({ date: next });
  };

  const goNew = () => {
    // 選択日を持って /log/new へ
    navigate(`/log/new?date=${encodeURIComponent(date)}`);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", backgroundColor:"grey"}}>
      <h1 style={{ marginBottom: 12 }}>ログ</h1>

      {/* 日付選択 */}
      <section style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, marginBottom: 6 }}>日付</div>
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
      </section>

      {/* サマリー */}
      <section
        style={{
          borderRadius: 16,
          border: "1px solid rgba(0,0,0,0.08)",
          background: "rgba(0,0,0,0.02)",
          padding: 14,
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>選択日のサマリー</div>

        {loading && <div>読み込み中…</div>}

        {!loading && error && (
          <div style={{ color: "crimson" }}>取得に失敗しました: {error}</div>
        )}

        {!loading && !error && !log && (
          <div style={{ opacity: 0.75 }}>
            この日のログはまだありません。下のボタンから記録してください。
          </div>
        )}

        {!loading && !error && log && (
          <div style={{ display: "grid", gap: 8 }}>
            <div>練習時間: {log.duration_min ?? 0} 分</div>
            <div>メニュー: {log.menus?.length ? log.menus.join(", ") : "なし"}</div>
            <div>裏声最高音: {log.falsetto_top_note ?? "—"}</div>
            <div>地声最高音: {log.chest_top_note ?? "—"}</div>
            {log.notes && (
              <div style={{ whiteSpace: "pre-wrap" }}>
                メモ: {log.notes.length > 120 ? log.notes.slice(0, 120) + "…" : log.notes}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ここが「動線」 */}
      <section style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={goNew}
          style={{
            height: 44,
            padding: "0 16px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "black",
            color: "white",
            cursor: "pointer",
          }}
        >
          今日のトレーニングを記録
        </button>

        <button
          type="button"
          disabled
          style={{
            height: 44,
            padding: "0 16px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "black",
            cursor: "not-allowed",
            opacity: 0.7,
          }}
          title="AIおすすめは後続Step"
        >
          AIに今日のおすすめを聞く
        </button>
      </section>
    </div>
  );
}
