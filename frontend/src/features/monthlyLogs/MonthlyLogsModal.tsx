import { useEffect, useMemo, useState } from "react";
import { fetchTrainingLogsByMonth } from "../../api/trainingLogs";
import ColoredTag from "../../components/ColoredTag";
import type { TrainingLog } from "../../types/trainingLog";
import "./monthlyLogsModal.css";

type Props = {
  open: boolean;
  month: string;
  onClose: () => void;
  onSelectDate?: (dateISO: string) => void;
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; logs: TrainingLog[] };

function addMonths(month: string, diff: number) {
  const matched = month.match(/^(\d{4})-(\d{2})$/);
  if (!matched) return month;
  const base = new Date(Number(matched[1]), Number(matched[2]) - 1, 1);
  base.setMonth(base.getMonth() + diff);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function fmtDate(dateISO: string) {
  const m = Number(dateISO.slice(5, 7));
  const d = Number(dateISO.slice(8, 10));
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(dateISO).getDay()] ?? "";
  return `${m}/${d}(${w})`;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesLog(log: TrainingLog, q: string): boolean {
  const nq = normalize(q);
  if (!nq) return true;

  const date = log.practiced_on ?? "";
  const notes = log.notes ?? "";
  const menuText = (log.menus ?? []).map((menu) => menu.name).join(" ");

  return normalize(date).includes(nq) || normalize(notes).includes(nq) || normalize(menuText).includes(nq);
}

function tagTextColor(bg: string) {
  const hex = bg.trim();
  const matched = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (!matched) return "#17324a";
  const value = matched[1];
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.68 ? "#17324a" : "#ffffff";
}

export default function MonthlyLogsModal({ open, month, onClose, onSelectDate }: Props) {
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [q, setQ] = useState("");
  const [viewMonth, setViewMonth] = useState(month);

  const title = useMemo(() => {
    const y = viewMonth.slice(0, 4);
    const m = viewMonth.slice(5, 7);
    return `${y}年${m}月のログ一覧`;
  }, [viewMonth]);

  useEffect(() => {
    if (!open) return;
    setViewMonth(month);
    setQ("");
  }, [open, month]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setState({ kind: "loading" });
      const res = await fetchTrainingLogsByMonth(viewMonth);
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
  }, [open, viewMonth]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const logsAll = useMemo(() => {
    if (state.kind !== "ready") return [];
    return [...state.logs].sort((a, b) => a.practiced_on.localeCompare(b.practiced_on));
  }, [state]);

  const filtered = useMemo(() => logsAll.filter((log) => matchesLog(log, q)), [logsAll, q]);

  if (!open) return null;

  return (
    <div className="mlm__overlay" role="dialog" aria-modal="true" aria-label={title}>
      <button className="mlm__backdrop uiModalBackdrop" onClick={onClose} aria-label="閉じる" />
      <div className="mlm__panel uiModalPanel">
        <div className="mlm__header uiModalHeader">
          <div>
            <div className="mlm__title uiModalTitle">{title}</div>
            <div className="mlm__subtle">検索できます（メニュー / メモ / 日付）</div>
          </div>
          <button className="mlm__close uiButton uiButton--secondary uiIconButton" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        <div className="mlm__controls">
          <div className="mlm__monthNav">
            <button type="button" className="mlm__monthNavBtn uiButton uiButton--secondary uiIconButton" onClick={() => setViewMonth((prev) => addMonths(prev, -1))}>
              ‹
            </button>
            <input
              type="month"
              className="mlm__monthInput uiInput uiInputShell"
              value={viewMonth}
              onChange={(e) => setViewMonth(e.target.value)}
            />
            <button type="button" className="mlm__monthNavBtn uiButton uiButton--secondary uiIconButton" onClick={() => setViewMonth((prev) => addMonths(prev, 1))}>
              ›
            </button>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mlm__search uiInput uiInputShell"
            placeholder="検索（メニュー / メモ / 日付）"
          />
        </div>

        <div className="mlm__body">
          <div className="mlm__sectionTitle">一覧（古い日付順）</div>

          {state.kind === "loading" && <div className="mlm__subtle">読み込み中…</div>}
          {state.kind === "error" && <div className="mlm__error">取得に失敗しました: {state.message}</div>}
          {state.kind === "ready" && logsAll.length === 0 && <div className="mlm__subtle">この月のログはまだありません。</div>}

          {state.kind === "ready" && logsAll.length > 0 && (
            <>
              <div className="mlm__subtle" style={{ marginBottom: 10 }}>
                表示: {filtered.length} 件（全体: {logsAll.length} 件）
              </div>

              <div className="mlm__list">
                {filtered.map((log) => (
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
                      <div className="mlm__tags">
                        {(log.menus ?? []).length === 0 ? (
                          <ColoredTag text="メニューなし" color="#E5E7EB" />
                        ) : (
                          (log.menus ?? []).map((menu) => (
                            <ColoredTag
                              key={menu.id}
                              text={menu.name}
                              color={menu.color || "#E5E7EB"}
                              style={{ color: tagTextColor(menu.color || "#E5E7EB") }}
                              title={menu.archived ? "このメニューは現在アーカイブされています" : undefined}
                              className={menu.archived ? "is-archived" : undefined}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="mlm__footer uiModalFooter">
          <button className="mlm__close uiButton uiButton--secondary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
