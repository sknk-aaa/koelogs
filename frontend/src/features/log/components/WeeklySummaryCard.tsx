import { useEffect, useState } from "react";
import ColoredTag from "../../../components/ColoredTag";
import type { WeeklyLog, WeeklyLogSummary } from "../../../types/weeklyLog";

type Props = {
  loading: boolean;
  error: string | null;
  log: WeeklyLog | null;
  summary: WeeklyLogSummary | null;
  emptyHint: string;
  saving: boolean;
  saveError: string | null;
  onSave: (payload: { notes: string | null }) => void;
  onDirtyChange: (dirty: boolean) => void;
};

function dash(v?: string | null) {
  return v && v.trim().length ? v : "—";
}

export default function WeeklySummaryCard({
  loading,
  error,
  log,
  summary,
  emptyHint,
  saving,
  saveError,
  onSave,
  onDirtyChange,
}: Props) {
  const initialNotes = (log?.notes ?? "").trim() === "" ? null : (log?.notes ?? "").trim();
  const [notesDraft, setNotesDraft] = useState(() => log?.notes ?? "");

  const totalDurationMin = summary?.total_duration_min ?? 0;
  const practiceDaysCount = summary?.practice_days_count ?? 0;
  const menuCounts = summary?.menu_counts ?? [];
  const normalizedCurrentNotes = notesDraft.trim() === "" ? null : notesDraft.trim();
  const hasNotesChanges = normalizedCurrentNotes !== initialNotes;

  useEffect(() => {
    onDirtyChange(hasNotesChanges);
  }, [onDirtyChange, hasNotesChanges]);

  return (
    <div className="card logPage__card">
      <div className="logPage__cardHead">
        <div className="logPage__cardTitle">週サマリー</div>

        <div className="logPage__cardHeadRight">
          {log && <div className="logPage__cardBadge logPage__cardBadge--ok">記録あり</div>}
          {!log && !loading && !error && <div className="logPage__cardBadge logPage__cardBadge--empty">未記録</div>}
        </div>
      </div>

      {loading && <div className="logPage__muted">読み込み中…</div>}

      {!loading && error && <div className="logPage__error">取得に失敗しました: {error}</div>}

      {!loading && !error && (
        <>
          <div className="logPage__kpiRow">
            <div className="logPage__kpi">
              <div className="logPage__kpiLabel">累計練習時間（今週）</div>
              <div className="logPage__kpiValue">
                <span className="logPage__kpiNumber">{totalDurationMin}</span>
                <span className="logPage__kpiUnit">分</span>
              </div>
              <div className="logPage__kpiSub">練習した日: {practiceDaysCount} / 7 日</div>
            </div>

            <div className="logPage__kpiSmallGrid">
              <div className="logPage__mini">
                <div className="logPage__miniLabel">週内の裏声最高音</div>
                <div className="logPage__miniValue">{dash(summary?.falsetto_top_note)}</div>
              </div>
              <div className="logPage__mini">
                <div className="logPage__miniLabel">週内の地声最高音</div>
                <div className="logPage__miniValue">{dash(summary?.chest_top_note)}</div>
              </div>
            </div>
          </div>

          <div className="logPage__section">
            <div className="logPage__sectionTitle">やってきたメニュー（回数）</div>
            {menuCounts.length ? (
              <div className="logPage__tags">
                {menuCounts.map((m) => (
                  <ColoredTag key={m.menu_id} text={`${m.name} ×${m.count}`} color={m.color || "#E5E7EB"} />
                ))}
              </div>
            ) : (
              <div className="logPage__muted">なし</div>
            )}
          </div>

          <div className="logPage__section">
            <div className="logPage__sectionTitle">週メモ（編集可）</div>
            <textarea
              className="logNew__textarea"
              rows={4}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder={"例:良かった点 / 課題 / 来週やること など"}
            />
          </div>

          <div className="logPage__actions">
            <button
              type="button"
              className={`logPage__btn ${hasNotesChanges && !saving ? "logPage__btn--cta" : ""}`}
              disabled={saving}
              onClick={() =>
                onSave({
                  notes: notesDraft.trim() === "" ? null : notesDraft,
                })
              }
            >
              {saving ? "保存中…" : "週メモを保存"}
            </button>
            {saveError && <div className="logPage__error">保存に失敗しました: {saveError}</div>}
          </div>

          {!log && <div className="logPage__muted">{emptyHint}</div>}
        </>
      )}
    </div>
  );
}
