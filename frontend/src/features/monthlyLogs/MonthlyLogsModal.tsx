// frontend/src/features/monthlyLogs/MonthlyLogsModal.tsx
import { useEffect, useMemo, useState } from "react";
import type { TrainingLog } from "../../types/trainingLog";
import { fetchTrainingLogsByMonth } from "../../api/trainingLogs";
import ColoredTag from "../../components/ColoredTag";
import "./monthlyLogsModal.css";

type Props = {
  open: boolean;
  month: string; // YYYY-MM
  onClose: () => void;
  onSelectDate?: (dateISO: string) => void;
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; logs: TrainingLog[] };

// 新設計(menu_id) / 旧設計(name配列) 両対応（移行中の保険）
type MenuObj = {
  id: number;
  name: string;
  color: string;
  archived?: boolean;
};
type MenuItem = string | MenuObj;

function fmtDate(dateISO: string) {
  const m = Number(dateISO.slice(5, 7));
  const d = Number(dateISO.slice(8, 10));
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(dateISO).getDay()] ?? "";
  return `${m}/${d}(${w})`;
}

function isEsc(e: KeyboardEvent) {
  return e.key === "Escape";
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function matchesLog(log: TrainingLog, q: string): boolean {
  const nq = normalize(q);
  if (!nq) return true;

  const date = log.practiced_on ?? "";
  const notes = log.notes ?? "";

  const menus = (log.menus ?? []) as unknown as MenuItem[];
  const menuText = menus.map((m) => (typeof m === "string" ? m : m.name)).join(" ");

  return (
    normalize(date).includes(nq) ||
    normalize(notes).includes(nq) ||
    normalize(menuText).includes(nq)
  );
}

function renderMenuTags(menuItems: MenuItem[]) {
  if (menuItems.length === 0) {
    return <ColoredTag text="メニューなし" color="#E5E7EB" style={{ color: "#000000" }} />;
  }

  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 8 }}>
      {menuItems.map((m) => {
        if (typeof m === "string") {
          // 旧形式（移行中の保険）
          return <ColoredTag key={m} text={m} color="#E5E7EB" title="旧形式のメニュー" />;
        }
        return (
          <ColoredTag
            key={m.id}
            text={m.name}
            color={m.color || "#E5E7EB"}
            title={m.archived ? "このメニューは現在アーカイブされています" : undefined}
            className={m.archived ? "is-archived" : undefined}
          />
        );
      })}
    </span>
  );
}

export default function MonthlyLogsModal({ open, month, onClose, onSelectDate }: Props) {
  const [state, setState] = useState<LoadState>({ kind: "idle" });

  // ✅ セグメント無し：検索だけ
  const [q, setQ] = useState("");

  const title = useMemo(() => {
    const y = month.slice(0, 4);
    const m = month.slice(5, 7);
    return `${y}年${m}月のログ一覧`;
  }, [month]);

  // logs取得
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setState({ kind: "loading" });

      const res = await fetchTrainingLogsByMonth(month);
      if (cancelled) return;

      if ("error" in res && res.error) {
        setState({ kind: "error", message: res.error });
        return;
      }

      setState({ kind: "ready", logs: res.data ?? [] });
    })();

    return () => {
      cancelled = true;
    };
  }, [open, month]);

  // Escで閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (isEsc(e)) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // ✅ Hooksは早期return前に全部呼ぶ
  const logsAll = useMemo(() => {
    if (state.kind !== "ready") return [];
    return [...state.logs].sort((a, b) => a.practiced_on.localeCompare(b.practiced_on));
  }, [state]);

  const filtered = useMemo(() => {
    return logsAll.filter((log) => matchesLog(log, q));
  }, [logsAll, q]);

  if (!open) return null;

  return (
    <div className="mlm__overlay" role="dialog" aria-modal="true">
      <button className="mlm__backdrop" onClick={onClose} aria-label="close" />
      <div className="mlm__panel">
        <div className="mlm__header">
          <div>
            <div className="mlm__title">{title}</div>
            <div className="mlm__subtle">検索できます（メニュー/メモ/日付）</div>
          </div>
          <button className="mlm__close" onClick={onClose} aria-label="close">
            ×
          </button>
        </div>

        {/* ✅ controls：検索のみ */}
        <div className="mlm__controls">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mlm__search"
            placeholder="検索（メニュー/メモ/日付）"
          />
        </div>

        <div className="mlm__body">
          <div className="mlm__sectionTitle">一覧（古い日付順）</div>

          {state.kind === "loading" && <div className="mlm__subtle">読み込み中…</div>}
          {state.kind === "error" && (
            <div className="mlm__error">取得に失敗しました: {state.message}</div>
          )}
          {state.kind === "ready" && logsAll.length === 0 && (
            <div className="mlm__subtle">この月のログはまだありません。</div>
          )}

          {state.kind === "ready" && logsAll.length > 0 && (
            <>
              <div className="mlm__subtle" style={{ marginBottom: 10 }}>
                表示: {filtered.length} 件（全体: {logsAll.length} 件）
              </div>

              <div className="mlm__list">
                {filtered.map((log) => {
                  const menuItems = ((log.menus ?? []) as unknown) as MenuItem[];

                  return (
                    <button
                      key={log.id}
                      type="button"
                      className="mlm__row"
                      onClick={() => {
                        onSelectDate?.(log.practiced_on);
                      }}
                    >
                      <div className="mlm__rowTop">
                        <div className="mlm__date">{fmtDate(log.practiced_on)}</div>
                        <div className="mlm__duration">練習時間：{log.duration_min ?? 0}分</div>
                        <div className="mlm__notesHint">{log.notes?.trim() ? "メモあり" : ""}</div>
                      </div>

                      <div className="mlm__rowMid">
                        <div className="mlm__tags">{renderMenuTags(menuItems)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="mlm__footer">
          <button className="mlm__close" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
