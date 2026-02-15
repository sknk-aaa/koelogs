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
  return `${m}/${d}`;
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
    return <ColoredTag text="メニューなし" color="#E5E7EB" />;
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
  const [selectedId, setSelectedId] = useState<number | null>(null);

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
      setSelectedId(null);

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
  const logsAll = state.kind === "ready" ? state.logs : [];

  const filtered = useMemo(() => {
    return logsAll.filter((log) => matchesLog(log, q));
  }, [logsAll, q]);

  const selected = useMemo(() => {
    if (state.kind !== "ready" || selectedId == null) return null;
    return logsAll.find((l) => l.id === selectedId) ?? null;
  }, [state.kind, selectedId, logsAll]);

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
          <div className="mlm__sectionTitle">一覧（新しい日付順）</div>

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
                  const active = selectedId === log.id;
                  const menuItems = ((log.menus ?? []) as unknown) as MenuItem[];

                  return (
                    <button
                      key={log.id}
                      type="button"
                      className={`mlm__row ${active ? "is-active" : ""}`}
                      onClick={() => {
                        setSelectedId(log.id);
                        onSelectDate?.(log.practiced_on);
                      }}
                    >
                      <div className="mlm__rowTop">
                        <div className="mlm__date">{fmtDate(log.practiced_on)}</div>
                        <div className="mlm__duration">{log.duration_min ?? 0}分</div>
                        <div className="mlm__notesHint">{log.notes?.trim() ? "メモ" : ""}</div>
                      </div>

                      <div className="mlm__rowMid">
                        <div className="mlm__tags">{renderMenuTags(menuItems)}</div>
                      </div>

                      <div className="mlm__rowBottom">
                        <div>裏声: {log.falsetto_top_note ?? "—"}</div>
                        <div>地声: {log.chest_top_note ?? "—"}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="mlm__sectionTitle" style={{ marginTop: 18 }}>
            詳細（閲覧専用）
          </div>

          {!selected && <div className="mlm__subtle">一覧から日付を選択してください。</div>}

          {selected && (
            <div className="mlm__detailCard">
              <div className="mlm__detailGrid">
                <div className="mlm__detailItem">
                  <div className="mlm__detailLabel">日付</div>
                  <div className="mlm__detailValue">{selected.practiced_on}</div>
                </div>
                <div className="mlm__detailItem">
                  <div className="mlm__detailLabel">練習時間</div>
                  <div className="mlm__detailValue">{selected.duration_min ?? 0} 分</div>
                </div>
                <div className="mlm__detailItem">
                  <div className="mlm__detailLabel">裏声最高音</div>
                  <div className="mlm__detailValue">{selected.falsetto_top_note ?? "—"}</div>
                </div>
                <div className="mlm__detailItem">
                  <div className="mlm__detailLabel">地声最高音</div>
                  <div className="mlm__detailValue">{selected.chest_top_note ?? "—"}</div>
                </div>
              </div>

              <div className="mlm__detailBlock">
                <div className="mlm__detailLabel">メニュー</div>
                <div className="mlm__tags" style={{ marginTop: 6 }}>
                  {renderMenuTags(((selected.menus ?? []) as unknown) as MenuItem[])}
                </div>
              </div>

              <div className="mlm__detailBlock">
                <div className="mlm__detailLabel">メモ</div>
                <div className="mlm__memo">{selected.notes?.trim() ? selected.notes : "—"}</div>
              </div>

              {selected.updated_at && (
                <div className="mlm__subtle" style={{ marginTop: 10 }}>
                  更新: {selected.updated_at}
                </div>
              )}
            </div>
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
