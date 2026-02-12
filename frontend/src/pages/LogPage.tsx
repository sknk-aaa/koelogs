import { useEffect,useState } from "react";
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
  const [selectedDate, setSelectedDate] = useState<string>(() => todayISO());
  const [log, setLog] = useState<TrainingLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      const res = await fetchTrainingLogByDate(selectedDate);

      if (cancelled) return;

      if (res.error) {
        setLog(null);
        setError(res.error);
      } else {
        setLog(res.data);
      }

      setLoading(false);
    }

    run();
    return () => { cancelled = true; };
  }, [selectedDate]);


  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>ログ</h1>

      {/* カレンダー（最短：date input） */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, marginBottom: 6, opacity: 0.75 }}>
          日付を選択
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
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

      {/* サマリーカード */}
      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(0,0,0,0.08)",
          background: "white",
          padding: 16,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>サマリー</h2>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{selectedDate}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          {loading && <div style={{ opacity: 0.7 }}>読み込み中…</div>}

          {!loading && error && (
            <div style={{ color: "#b00020" }}>
              取得に失敗: {error}
            </div>
          )}

          {!loading && !error && !log && (
            <div style={{ opacity: 0.75 }}>
              未記録です
            </div>
          )}

          {!loading && !error && log && (
            <div style={{ display: "grid", gap: 10 }}>
              <Row label="練習時間" value={log.duration_min != null ? `${log.duration_min} 分` : "—"} />
              <Row label="メニュー" value={log.menus.length ? log.menus.join(" / ") : "—"} />
              <Row label="裏声最高音" value={log.falsetto_top_note ?? "—"} />
              <Row label="地声最高音" value={log.chest_top_note ?? "—"} />
              <Row label="メモ" value={log.notes ? truncate(log.notes, 140) : "—"} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>
      <div style={{ fontSize: 13, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}
