import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { upsertTrainingLog, type UpsertTrainingLogInput } from "../api/trainingLogs";
import { fetchTrainingLogByDate } from "../api/trainingLogs";
import type { TrainingLog } from "../types/trainingLog";
import { fetchTrainingMenus, createTrainingMenu, updateTrainingMenu } from "../api/trainingMenus";
import type { TrainingMenu } from "../types/trainingMenu";
import ColoredTag from "../components/ColoredTag";

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// 最小パレット（背景向けの薄め色）
const MENU_COLOR_PALETTE: { name: string; color: string }[] = [
  { name: "Sky", color: "#E0F2FE" },
  { name: "Mint", color: "#D1FAE5" },
  { name: "Lime", color: "#ECFCCB" },
  { name: "Yellow", color: "#FEF9C3" },
  { name: "Orange", color: "#FFEDD5" },
  { name: "Red", color: "#FFE4E6" },
  { name: "Pink", color: "#FCE7F3" },
  { name: "Purple", color: "#EDE9FE" },
  { name: "Gray", color: "#E5E7EB" },
  { name: "Blue", color: "#DBEAFE" },
];

export default function LogNewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // /log/new?date=YYYY-MM-DD で来たらそれを優先
  const initialDate = params.get("date") || todayISO();

  const [practicedOn, setPracticedOn] = useState(initialDate);
  const [durationMin, setDurationMin] = useState("");
  const [notes, setNotes] = useState("");

  // メニュー管理：DB由来（追加/論理削除 + 複数選択）
  const [menuCatalog, setMenuCatalog] = useState<TrainingMenu[]>([]);
  const [menuToAdd, setMenuToAdd] = useState("");
  const [selectedMenuIds, setSelectedMenuIds] = useState<Set<number>>(() => new Set());

  // 追加時の色
  const [menuColorToAdd, setMenuColorToAdd] = useState(MENU_COLOR_PALETTE[0].color);

  const [falsettoEnabled, setFalsettoEnabled] = useState(false);
  const [falsettoTopNote, setFalsettoTopNote] = useState("");
  const [chestEnabled, setChestEnabled] = useState(false);
  const [chestTopNote, setChestTopNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);

  const selectedMenuIdsArray = useMemo(() => Array.from(selectedMenuIds), [selectedMenuIds]);

  // 初期ロード：メニュー一覧を取得（archived=falseのみ）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const menus = await fetchTrainingMenus(false);
        if (!cancelled) setMenuCatalog(menus);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 初期表示で既存ログを読み込み、あればフォームに反映
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInitialLoading(true);
      const res = await fetchTrainingLogByDate(practicedOn);
      if (cancelled) return;

      if ("error" in res && res.error) {
        setErrors([`既存ログの取得に失敗しました: ${res.error}`]);
        setInitialLoading(false);
        return;
      }

      const existing = res.data as TrainingLog | null;
      if (!existing) {
        setInitialLoading(false);
        return;
      }

      setDurationMin(existing.duration_min == null ? "" : String(existing.duration_min));
      setNotes(existing.notes ?? "");

      const ids =
        existing.menu_ids && existing.menu_ids.length ? existing.menu_ids : (existing.menus ?? []).map((m) => m.id);

      setSelectedMenuIds(new Set(ids));

      const f = existing.falsetto_top_note;
      setFalsettoEnabled(f != null);
      setFalsettoTopNote(f ?? "");

      const c = existing.chest_top_note;
      setChestEnabled(c != null);
      setChestTopNote(c ?? "");

      setInitialLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [practicedOn]);

  const toggleMenu = (id: number) => {
    setSelectedMenuIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addMenu = async () => {
    const v = menuToAdd.trim();
    if (!v) return;

    try {
      const created = await createTrainingMenu({ name: v, color: menuColorToAdd });
      setMenuCatalog((prev) => [...prev, created]);
      setMenuToAdd("");
      setMenuColorToAdd(MENU_COLOR_PALETTE[0].color);
    } catch (e) {
      setErrors([errorMessage(e, "メニュー追加に失敗しました")]);
    }
  };

  const removeMenuFromCatalog = async (menu: TrainingMenu) => {
    try {
      await updateTrainingMenu(menu.id, { archived: true });
      setMenuCatalog((prev) => prev.filter((m) => m.id !== menu.id));
      setSelectedMenuIds((prev) => {
        const next = new Set(prev);
        next.delete(menu.id);
        return next;
      });
    } catch (e) {
      setErrors([errorMessage(e, "メニュー削除に失敗しました")]);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const localErrors: string[] = [];
    if (falsettoEnabled && !falsettoTopNote.trim()) localErrors.push("裏声最高音が未入力です");
    if (chestEnabled && !chestTopNote.trim()) localErrors.push("地声最高音が未入力です");

    if (localErrors.length) {
      setErrors(localErrors);
      setSubmitting(false);
      return;
    }

    const parsedDuration = durationMin.trim() === "" ? null : Number.parseInt(durationMin.trim(), 10);

    const payload: UpsertTrainingLogInput = {
      practiced_on: practicedOn,
      duration_min: Number.isNaN(parsedDuration as number) ? null : parsedDuration,
      menu_ids: selectedMenuIdsArray,
      notes: notes.trim() === "" ? null : notes,

      falsetto_enabled: falsettoEnabled,
      falsetto_top_note: falsettoEnabled ? falsettoTopNote.trim() : null,
      chest_enabled: chestEnabled,
      chest_top_note: chestEnabled ? chestTopNote.trim() : null,
    };

    const result = await upsertTrainingLog(payload);
    setSubmitting(false);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    navigate(`/log?date=${encodeURIComponent(practicedOn)}`, { replace: true });
  };

  const onCancel = () => {
    navigate(`/log?date=${encodeURIComponent(practicedOn)}`);
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>今日のトレーニングを記録</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
        {initialLoading && <div style={styles.muted}>既存ログを読み込み中…</div>}

        {/* 日付 */}
        <section style={{ display: "grid", gap: 8 }}>
          <div style={styles.label}>日付</div>
          <input type="date" value={practicedOn} onChange={(e) => setPracticedOn(e.target.value)} style={styles.input} />
        </section>

        {/* メニュー */}
        <section style={{ display: "grid", gap: 10 }}>
          <div style={styles.label}>練習メニュー（複数選択）</div>

          {/* 追加欄 */}
          <div style={styles.panel}>
            <div style={styles.subLabel}>メニュー名</div>
            <input
              value={menuToAdd}
              onChange={(e) => setMenuToAdd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  void addMenu();
                }
              }}
              placeholder="メニューを追加（例: 裏声リップロール）"
              style={styles.inputFull}
            />

            <div style={styles.subLabel}>追加する色</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {MENU_COLOR_PALETTE.map((p) => {
                const active = p.color === menuColorToAdd;
                return (
                  <button
                    key={p.color}
                    type="button"
                    onClick={() => setMenuColorToAdd(p.color)}
                    title={`この色で追加: ${p.name}`}
                    aria-label={`この色で追加: ${p.name}`}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      border: active ? "2px solid rgba(0,0,0,0.65)" : "1px solid rgba(0,0,0,0.15)",
                      background: p.color,
                      cursor: "pointer",
                      position: "relative",
                      boxShadow: active ? "0 0 0 3px rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    {active && <span style={{ fontWeight: 900, fontSize: 14 }}>✓</span>}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={styles.subLabel}>プレビュー</div>
              <ColoredTag text="タグ表示" color={menuColorToAdd} />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" onClick={addMenu} disabled={!menuToAdd.trim()} style={styles.primaryBtn}>
                この色で追加
              </button>
              <div style={styles.muted}>※ ここで選んだ色が、このメニューのタグ色として保存されます（ログ表示にも反映）</div>
            </div>
          </div>

          {/* ✅ カタログ一覧：行全体タップでtoggle */}
          <div style={{ display: "grid", gap: 10 }}>
            {menuCatalog.map((menu) => {
              const checked = selectedMenuIds.has(menu.id);

              return (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => toggleMenu(menu.id)}
                  aria-pressed={checked}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    textAlign: "left",

                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(0,0,0,0.10)",
                    background: "rgba(255,255,255,0.92)",
                    cursor: "pointer",
                  }}
                >
                  {/* ✅ チェックマーク専用表示（見た目だけ。クリックは行に任せる） */}
                  <span
                    aria-hidden="true"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      background: checked ? "var(--accentSoft)" : "rgba(0,0,0,0.02)",
                      border: checked ? "1px solid rgba(255,59,122,0.40)" : "1px solid rgba(0,0,0,0.14)",
                      color: checked ? "var(--accent)" : "rgba(0,0,0,0.20)",

                      fontWeight: 900,
                      fontSize: 13,
                      lineHeight: 1,
                    }}
                  >
                    ✓
                  </span>

                  <ColoredTag text={menu.name} color={menu.color} />

                  {checked && <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>選択中</span>}

                  <div style={{ marginLeft: "auto" }}>
                    {/* 削除ボタンは行トグルを止める */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void removeMenuFromCatalog(menu);
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        opacity: 0.75,
                        fontWeight: 800,
                        padding: "6px 8px",
                        borderRadius: 10,
                      }}
                      title="カタログから削除（archived=true）"
                    >
                      削除
                    </button>
                  </div>
                </button>
              );
            })}

            {menuCatalog.length === 0 && (
              <div style={styles.muted}>メニューがありません。上の入力から追加してください。</div>
            )}
          </div>

          {/* 選択中のサマリ */}
          <div style={{ display: "grid", gap: 8 }}>
            <div style={styles.subLabel}>選択中メニュー</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {selectedMenuIdsArray.length ? (
                selectedMenuIdsArray.map((id) => {
                  const m = menuCatalog.find((x) => x.id === id);
                  return <ColoredTag key={id} text={m?.name ?? `#${id}`} color={m?.color ?? "#E5E7EB"} />;
                })
              ) : (
                <span style={styles.muted}>なし</span>
              )}
            </div>
          </div>
        </section>

        {/* 練習時間 */}
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={durationMin}
          onChange={(e) => setDurationMin(e.target.value)}
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
          placeholder="例: 30"
          style={styles.input}
        />

        {/* 裏声最高音 */}
        <section style={{ display: "grid", gap: 8 }}>
          <label style={styles.checkRow}>
            <input type="checkbox" checked={falsettoEnabled} onChange={(e) => setFalsettoEnabled(e.target.checked)} />
            裏声最高音を記録する
          </label>
          <input
            value={falsettoTopNote}
            onChange={(e) => setFalsettoTopNote(e.target.value)}
            placeholder="例: G5, F#5 など"
            disabled={!falsettoEnabled}
            style={{ ...styles.input, opacity: falsettoEnabled ? 1 : 0.6 }}
          />
        </section>

        {/* 地声最高音 */}
        <section style={{ display: "grid", gap: 8 }}>
          <label style={styles.checkRow}>
            <input type="checkbox" checked={chestEnabled} onChange={(e) => setChestEnabled(e.target.checked)} />
            地声最高音を記録する
          </label>
          <input
            value={chestTopNote}
            onChange={(e) => setChestTopNote(e.target.value)}
            placeholder="例: G4, F#4 など"
            disabled={!chestEnabled}
            style={{ ...styles.input, opacity: chestEnabled ? 1 : 0.6 }}
          />
        </section>

        {/* 自由記述 */}
        <section style={{ display: "grid", gap: 8 }}>
          <div style={styles.label}>自由記述</div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} placeholder="メモ（任意）" style={styles.textarea} />
        </section>

        {/* エラー */}
        {errors.length > 0 && (
          <section style={styles.errorBox}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>保存できませんでした</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {errors.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </section>
        )}

        {/* ✅ ここに保存ボタンは置かない（下部固定に移動） */}
      </form>

      {/* ✅ 下部固定アクションバー */}
      <div style={styles.stickyBar}>
        <div style={styles.stickyInner}>
          <button type="button" onClick={onCancel} disabled={submitting} style={styles.secondaryBtn}>
            キャンセル
          </button>

          {/* form外なので submit を手動で発火 */}
          <button
            type="button"
            onClick={() => {
              const form = document.querySelector("form");
              if (form) form.requestSubmit();
            }}
            disabled={submitting}
            style={styles.primaryBtn}
          >
            {submitting ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "14px 14px 110px", maxWidth: 920, margin: "0 auto" }, // ✅ sticky分少し増やす
  h1: { fontSize: 18, fontWeight: 900, margin: "6px 0 10px" },
  label: { fontSize: 13, fontWeight: 800 },
  subLabel: { fontSize: 12, fontWeight: 800, opacity: 0.85 },
  muted: { opacity: 0.8, fontSize: 12, lineHeight: 1.5 },

  input: {
    height: 44,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    width: "100%",
    maxWidth: 260,
    background: "#fff",
  },
  inputFull: {
    height: 44,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    width: "100%",
    background: "#fff",
  },

  textarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    resize: "vertical",
    background: "#fff",
  },

  panel: {
    display: "grid",
    gap: 8,
    padding: 12,
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.92)",
  },

  checkRow: { display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13 },

  errorBox: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,0,0,0.25)",
    background: "rgba(255,0,0,0.06)",
  },

  primaryBtn: {
    height: 44,
    padding: "0 16px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "black",
    color: "white",
    cursor: "pointer",
    opacity: 1,
    fontWeight: 900,
  },

  secondaryBtn: {
    height: 44,
    padding: "0 16px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    cursor: "pointer",
    fontWeight: 900,
  },

  textBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    opacity: 0.75,
    fontWeight: 800,
  },

  stickyBar: {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,

  // ✅ iPhone safe-area 対応
  paddingTop: 10,
  paddingLeft: 14,
  paddingRight: 14,
  paddingBottom: "calc(10px + env(safe-area-inset-bottom))",

  background: "rgba(255,255,255,0.78)",
  backdropFilter: "blur(10px)",
  borderTop: "1px solid rgba(0,0,0,0.06)",
  zIndex: 90,
},


  stickyInner: {
    maxWidth: 920,
    margin: "0 auto",
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
  },
};
