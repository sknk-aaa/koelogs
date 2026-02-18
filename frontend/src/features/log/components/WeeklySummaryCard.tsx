import { useEffect, useMemo, useState } from "react";
import ColoredTag from "../../../components/ColoredTag";
import type { WeeklyLog, WeeklyLogSummary } from "../../../types/weeklyLog";

type ImprovementTagKey =
  | "high_note_ease"
  | "pitch_stability"
  | "passaggio_smoothness"
  | "less_breathlessness"
  | "volume_stability"
  | "less_throat_tension"
  | "resonance_clarity"
  | "long_tone_sustain";

type EffectFeedbackInput = { menuId: number | null; improvementTags: ImprovementTagKey[] };

const IMPROVEMENT_TAG_OPTIONS: { key: ImprovementTagKey; label: string }[] = [
  { key: "high_note_ease", label: "高音の出しやすさ" },
  { key: "pitch_stability", label: "音程の安定" },
  { key: "passaggio_smoothness", label: "換声点の滑らかさ" },
  { key: "less_breathlessness", label: "息切れしにくさ" },
  { key: "volume_stability", label: "声量の安定" },
  { key: "less_throat_tension", label: "喉の力み軽減" },
  { key: "resonance_clarity", label: "声の抜け・響き" },
  { key: "long_tone_sustain", label: "ロングトーン維持" },
];

type MenuOption = { id: number; name: string };

type Props = {
  loading: boolean;
  error: string | null;
  log: WeeklyLog | null;
  summary: WeeklyLogSummary | null;
  emptyHint: string;
  menuOptions: MenuOption[];
  saving: boolean;
  saveError: string | null;
  onSave: (payload: { notes: string | null; effect_feedbacks: Array<{ menu_id: number; improvement_tags: string[] }> }) => void;
  onDirtyChange: (dirty: boolean) => void;
};

function dash(v?: string | null) {
  return v && v.trim().length ? v : "—";
}

function parseInitialEffects(log: WeeklyLog | null): EffectFeedbackInput[] {
  if (!log?.effect_feedbacks) return [];

  return log.effect_feedbacks
    .map((entry): EffectFeedbackInput | null => {
      const menuId = typeof entry?.menu_id === "number" && entry.menu_id > 0 ? entry.menu_id : null;
      const improvementTags = Array.isArray(entry?.improvement_tags)
        ? entry.improvement_tags.filter((tag): tag is ImprovementTagKey =>
            IMPROVEMENT_TAG_OPTIONS.some((opt) => opt.key === tag)
          )
        : [];

      if (!menuId || improvementTags.length === 0) return null;
      return { menuId, improvementTags: Array.from(new Set(improvementTags)) };
    })
    .filter((v): v is EffectFeedbackInput => v !== null);
}

function buildEffectPayload(rows: EffectFeedbackInput[]): Array<{ menu_id: number; improvement_tags: string[] }> {
  const payload = rows
    .filter((row) => row.menuId && row.improvementTags.length > 0)
    .map((row) => ({
      menu_id: row.menuId as number,
      improvement_tags: Array.from(new Set(row.improvementTags)).sort(),
    }))
    .filter((row, idx, arr) => arr.findIndex((v) => v.menu_id === row.menu_id) === idx)
    .sort((a, b) => a.menu_id - b.menu_id);

  return payload;
}

export default function WeeklySummaryCard({
  loading,
  error,
  log,
  summary,
  emptyHint,
  menuOptions,
  saving,
  saveError,
  onSave,
  onDirtyChange,
}: Props) {
  const initialNotes = (log?.notes ?? "").trim() === "" ? null : (log?.notes ?? "").trim();
  const initialEffectSnapshot = JSON.stringify(buildEffectPayload(parseInitialEffects(log)));
  const [notesDraft, setNotesDraft] = useState(log?.notes ?? "");
  const [effectFeedbacks, setEffectFeedbacks] = useState<EffectFeedbackInput[]>(parseInitialEffects(log));

  const menuNameById = useMemo(() => {
    return new Map(menuOptions.map((m) => [m.id, m.name]));
  }, [menuOptions]);

  const selectedEffectMenuIdSet = useMemo(() => {
    const ids = effectFeedbacks.map((row) => row.menuId).filter((id): id is number => typeof id === "number");
    return new Set(ids);
  }, [effectFeedbacks]);

  const menuOptionsForRow = (currentMenuId: number | null) => {
    return menuOptions
      .filter((menu) => menu.id === currentMenuId || !selectedEffectMenuIdSet.has(menu.id))
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  };

  const canAddEffectBox = menuOptions.length > effectFeedbacks.length;

  const addEffectFeedbackBox = () => {
    setEffectFeedbacks((prev) => [...prev, { menuId: null, improvementTags: [] }]);
  };

  const removeEffectFeedbackBox = (idx: number) => {
    setEffectFeedbacks((prev) => prev.filter((_, i) => i !== idx));
  };

  const setEffectFeedbackMenu = (idx: number, menuId: number | null) => {
    setEffectFeedbacks((prev) => prev.map((row, i) => (i === idx ? { ...row, menuId } : row)));
  };

  const toggleEffectFeedbackTag = (idx: number, key: ImprovementTagKey) => {
    setEffectFeedbacks((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const has = row.improvementTags.includes(key);
        return {
          ...row,
          improvementTags: has ? row.improvementTags.filter((t) => t !== key) : [...row.improvementTags, key],
        };
      })
    );
  };

  const currentEffectPayload = buildEffectPayload(effectFeedbacks);

  const totalDurationMin = summary?.total_duration_min ?? 0;
  const practiceDaysCount = summary?.practice_days_count ?? 0;
  const menuCounts = summary?.menu_counts ?? [];
  const normalizedCurrentNotes = notesDraft.trim() === "" ? null : notesDraft.trim();
  const hasNotesChanges = normalizedCurrentNotes !== initialNotes;
  const currentEffectSnapshot = JSON.stringify(currentEffectPayload);
  const hasEffectChanges = currentEffectSnapshot !== initialEffectSnapshot;
  const shouldEmphasizeSave = hasNotesChanges || hasEffectChanges;

  useEffect(() => {
    onDirtyChange(shouldEmphasizeSave);
  }, [onDirtyChange, shouldEmphasizeSave]);

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

          <div className="logPage__section">
            <div className="logPage__sectionTitle">効いた実感があったメニュー（記録すると、AIおすすめの精度が上がります（任意））</div>

            <div className="logNew__effectBoxes">
              {effectFeedbacks.map((row, idx) => (
                <div key={`weekly-effect-row-${idx}`} className="logNew__effectBox">
                  <div className="logNew__effectBoxHead">
                    <div className="logNew__subLabel">記録 {idx + 1}</div>
                    <button
                      type="button"
                      className="logNew__removeBtn"
                      onClick={() => removeEffectFeedbackBox(idx)}
                    >
                      削除
                    </button>
                  </div>

                  <div className="logNew__field">
                    <label className="logNew__label">効いた実感があったメニュー</label>
                    <select
                      className="logNew__input"
                      value={row.menuId ?? ""}
                      onChange={(e) => {
                        const raw = Number.parseInt(e.target.value, 10);
                        setEffectFeedbackMenu(idx, Number.isNaN(raw) ? null : raw);
                      }}
                    >
                      <option value="">選択してください</option>
                      {menuOptionsForRow(row.menuId).map((menu) => (
                        <option key={`weekly-effect-menu-option-${idx}-${menu.id}`} value={menu.id}>
                          {menu.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="logNew__field">
                    <div className="logNew__label">改善した感覚（複数選択）</div>
                    <div className="logNew__chipList">
                      {IMPROVEMENT_TAG_OPTIONS.map((tag) => {
                        const selected = row.improvementTags.includes(tag.key);
                        return (
                          <button
                            key={`weekly-effect-tag-${idx}-${tag.key}`}
                            type="button"
                            className={`logNew__chip ${selected ? "is-selected" : ""}`}
                            onClick={() => toggleEffectFeedbackTag(idx, tag.key)}
                          >
                            {tag.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="logPage__btn"
              onClick={addEffectFeedbackBox}
              disabled={!canAddEffectBox}
            >
              記録ボックスを追加
            </button>

            {!canAddEffectBox && (
              <div className="logPage__muted">追加できるメニューがありません。</div>
            )}

            {menuOptions.length === 0 && (
              <div className="logPage__muted">メニューがありません。日ログでメニューを追加すると選べます。</div>
            )}
          </div>

          <div className="logPage__actions">
            <button
              type="button"
              className={`logPage__btn ${shouldEmphasizeSave && !saving ? "logPage__btn--cta" : ""}`}
              disabled={saving}
              onClick={() =>
                onSave({
                  notes: notesDraft.trim() === "" ? null : notesDraft,
                  effect_feedbacks: currentEffectPayload,
                })
              }
            >
              {saving ? "保存中…" : "週メモを保存"}
            </button>
            {saveError && <div className="logPage__error">保存に失敗しました: {saveError}</div>}
          </div>

          {!log && <div className="logPage__muted">{emptyHint}</div>}

          {log?.effect_feedbacks && log.effect_feedbacks.length > 0 && (
            <div className="logPage__section">
              <div className="logPage__sectionTitle">保存済みの効果メモ</div>
              <div className="logPage__notesBox">
                {log.effect_feedbacks
                  .map((entry) => {
                    const menuName = menuNameById.get(entry.menu_id) || `#${entry.menu_id}`;
                    const labels = entry.improvement_tags
                      .map((tag) => IMPROVEMENT_TAG_OPTIONS.find((opt) => opt.key === tag)?.label)
                      .filter((v): v is string => !!v);
                    return `・${menuName}： ${labels.join(" / ")}`;
                  })
                  .join("\n")}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
