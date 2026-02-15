// frontend/src/features/monthlyLogs/MonthlyLogsModal.tsx
import { useEffect, useMemo, useState } from "react";
import type { TrainingLog } from "../../types/trainingLog";
import { fetchTrainingLogsByMonth } from "../../api/trainingLogs";
import "./monthlyLogsModal.css";

type Props = {
  open: boolean;
  month: string; // YYYY-MM
  onClose: () => void;
  onSelectDate?: (dateISO: string) => void; // /log の日付選択と同期したい場合に使う
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; logs: TrainingLog[] };

function fmtDate(dateISO: string) {
  // YYYY-MM-DD -> M/D (曜日は不要なら出さない)
  const m = Number(dateISO.slice(5, 7));
  const d = Number(dateISO.slice(8, 10));
  return `${m}/${d}`;
}

function isEsc(e: KeyboardEvent) {
  return e.key === "Escape";
}

export default function MonthlyLogsModal({ open, month, onClose, onSelectDate }: Props) {
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [selected, setSelected] = useState<TrainingLog | null>(null);

  const title = useMemo(() => {
    const y = month.slice(0, 4);
    const m = month.slice(5, 7);
    return `${y}年${m}月のログ一覧`;
  }, [month]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    (async () => {
      setState({ kind: "loading" });
      setSelected(null);

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

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (isEsc(e)) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const logs = state.kind === "ready" ? state.logs : [];

  return (
    <div className="mlm__overlay" role="dialog" aria-modal="true">
      <div className="mlm__panel">
        <div className="mlm__header">
          <div className="mlm__title">{title}</div>
          <button className="mlm__close" onClick={onClose} aria-label="close">
            ×
          </button>
        </div>

        <div className="mlm__body">
          {/* 一覧 */}
          <div className="mlm__sectionTitle">一覧（新しい日付順）</div>

          {state.kind === "loading" && <div className="mlm__subtle">読み込み中…</div>}
          {state.kind === "error" && (
            <div className="mlm__error">取得に失敗しました: {state.message}</div>
          )}

          {state.kind === "ready" && logs.length === 0 && (
            <div className="mlm__subtle">この月のログはまだありません。</div>
          )}

          {state.kind === "ready" && logs.length > 0 && (
            <div className="mlm__list">
              {logs.map((log) => {
                const active = selected?.id === log.id;
                return (
                  <button
                    key={log.id}
                    className={`mlm__row ${active ? "is-active" : ""}`}
                    onClick={() => {
                      setSelected(log);
                      onSelectDate?.(log.practiced_on);
                    }}
                  >
                    <div className="mlm__rowTop">
                      <div className="mlm__date">{fmtDate(log.practiced_on)}</div>
                      <div className="mlm__duration">
                        {log.duration_min ?? 0}分
                      </div>
                      <div className="mlm__notesHint">
                        {log.notes ? "メモあり" : ""}
                      </div>
                    </div>

                    <div className="mlm__rowMid">
                      <div className="mlm__tags">
                        {(log.menus ?? []).length ? (
                          log.menus.map((m) => (
                            <span key={m} className="mlm__tag">
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="mlm__tag is-muted">メニューなし</span>
                        )}
                      </div>
                    </div>

                    <div className="mlm__rowBottom">
                      <div className="mlm__note">
                        裏声: {log.falsetto_top_note ?? "—"}
                      </div>
                      <div className="mlm__note">
                        地声: {log.chest_top_note ?? "—"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 詳細 */}
          <div className="mlm__sectionTitle" style={{ marginTop: 16 }}>
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
                  {(selected.menus ?? []).length ? (
                    selected.menus.map((m) => (
                      <span key={m} className="mlm__tag">
                        {m}
                      </span>
                    ))
                  ) : (
                    <span className="mlm__tag is-muted">メニューなし</span>
                  )}
                </div>
              </div>

              <div className="mlm__detailBlock">
                <div className="mlm__detailLabel">メモ</div>
                <div className="mlm__memo">
                  {selected.notes?.trim() ? selected.notes : "—"}
                </div>
              </div>

              {selected.updated_at && (
                <div className="mlm__subtle" style={{ marginTop: 8 }}>
                  更新: {selected.updated_at}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mlm__footer">
          <button className="btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>

      {/* 背景クリックで閉じる */}
      <button className="mlm__backdrop" onClick={onClose} aria-label="backdrop" />
    </div>
  );
}
