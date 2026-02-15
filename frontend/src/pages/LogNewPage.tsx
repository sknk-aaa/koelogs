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
  const [selectedMenus, setSelectedMenus] = useState<Set<string>>(() => new Set());

  // 追加時の色
  const [menuColorToAdd, setMenuColorToAdd] = useState<string>(MENU_COLOR_PALETTE[0].color);

  const [falsettoEnabled, setFalsettoEnabled] = useState(false);
  const [falsettoTopNote, setFalsettoTopNote] = useState("");

  const [chestEnabled, setChestEnabled] = useState(false);
  const [chestTopNote, setChestTopNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);

  const selectedMenusArray = useMemo(() => Array.from(selectedMenus), [selectedMenus]);

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
      setSelectedMenus(new Set(existing.menus ?? []));

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

  const toggleMenu = (name: string) => {
    setSelectedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
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

      // UIからは消す（archived=false一覧なので）
      setMenuCatalog((prev) => prev.filter((m) => m.id !== menu.id));

      // もし選択済みなら外す（ログはname保存なので一貫性保つ）
      setSelectedMenus((prev) => {
        const next = new Set(prev);
        next.delete(menu.name);
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
      menus: selectedMenusArray,
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

  return (
    <div style={{ padding: "14px 14px 90px", maxWidth: 920, margin: "0 auto" }}>
      <h1 style={{ fontSize: 18, fontWeight: 900, margin: "6px 0 12px" }}>今日のトレーニングを記録</h1>

      {initialLoading && (
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>既存ログを読み込み中…</div>
      )}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
        {/* 日付 */}
        <section style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 800 }}>日付</div>
          <input
            type="date"
            value={practicedOn}
            onChange={(e) => setPracticedOn(e.target.value)}
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

        {/* メニュー */}
        <section style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>練習メニュー（複数選択）</div>

          {/* ✅ 追加欄（色選択が「追加の一部」として分かるUI） */}
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220, display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>メニュー名</div>
                <input
                  value={menuToAdd}
                  onChange={(e) => setMenuToAdd(e.target.value)}
                  placeholder="メニューを追加（例: 裏声リップロール）"
                  style={{
                    height: 40,
                    padding: "0 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    width: "100%",
                  }}
                />
              </div>

              <div style={{ minWidth: 180, display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>追加する色</div>

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
                          border: active
                            ? "2px solid rgba(0,0,0,0.65)"
                            : "1px solid rgba(0,0,0,0.15)",
                          background: p.color,
                          cursor: "pointer",
                          position: "relative",
                          boxShadow: active ? "0 0 0 3px rgba(0,0,0,0.06)" : "none",
                        }}
                      >
                        {active && (
                          <span
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 900,
                              fontSize: 14,
                              color: "rgba(0,0,0,0.75)",
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 6 }}>
                    <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>プレビュー</span>
                    <ColoredTag
                      label={menuToAdd.trim() ? menuToAdd.trim() : "新規メニュー"}
                      color={menuColorToAdd}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={addMenu}
                disabled={!menuToAdd.trim()}
                style={{
                  height: 40,
                  padding: "0 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "#fff",
                  cursor: menuToAdd.trim() ? "pointer" : "not-allowed",
                  fontWeight: 900,
                  opacity: menuToAdd.trim() ? 1 : 0.6,
                  whiteSpace: "nowrap",
                }}
              >
                この色で追加
              </button>
            </div>

            <div style={{ fontSize: 12, opacity: 0.7 }}>
              ※ ここで選んだ色が、このメニューのタグ色として保存されます（ログ表示にも反映）
            </div>
          </div>

          {/* カタログ一覧 */}
          <div style={{ display: "grid", gap: 10 }}>
            {menuCatalog.map((menu) => {
              const checked = selectedMenus.has(menu.name);
              return (
                <div
                  key={menu.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(0,0,0,0.10)",
                    background: "#fff",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMenu(menu.name)}
                    style={{ width: 18, height: 18 }}
                  />

                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <ColoredTag label={menu.name} color={menu.color} />
                    {checked && <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>選択中</span>}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeMenuFromCatalog(menu)}
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      opacity: 0.75,
                      fontWeight: 800,
                    }}
                    title="カタログから削除（archived=true）"
                  >
                    削除
                  </button>
                </div>
              );
            })}

            {menuCatalog.length === 0 && (
              <div style={{ fontSize: 12, opacity: 0.7 }}>メニューがありません。上の入力から追加してください。</div>
            )}

            {/* 選択中のサマリ（色付き） */}
            <div style={{ marginTop: 2 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900, marginBottom: 6 }}>
                選択中メニュー
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {selectedMenusArray.length ? (
                  selectedMenusArray.map((name) => {
                    const m = menuCatalog.find((x) => x.name === name);
                    return <ColoredTag key={name} label={name} color={m?.color} fallbackColor="#E5E7EB" />;
                  })
                ) : (
                  <ColoredTag label="なし" color="#E5E7EB" muted />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 練習時間 */}
        <section style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 800 }}>練習時間（分）</div>
          <input
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            placeholder="例: 30"
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

        {/* 裏声最高音 */}
        <section style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
            <input
              type="checkbox"
              checked={falsettoEnabled}
              onChange={(e) => setFalsettoEnabled(e.target.checked)}
            />
            裏声最高音を記録する
          </label>
          <input
            value={falsettoTopNote}
            onChange={(e) => setFalsettoTopNote(e.target.value)}
            placeholder="例: G5, F#5 など"
            disabled={!falsettoEnabled}
            style={{
              height: 40,
              padding: "0 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              width: "100%",
              maxWidth: 260,
              opacity: falsettoEnabled ? 1 : 0.6,
            }}
          />
        </section>

        {/* 地声最高音 */}
        <section style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
            <input type="checkbox" checked={chestEnabled} onChange={(e) => setChestEnabled(e.target.checked)} />
            地声最高音を記録する
          </label>
          <input
            value={chestTopNote}
            onChange={(e) => setChestTopNote(e.target.value)}
            placeholder="例: G4, F#4 など"
            disabled={!chestEnabled}
            style={{
              height: 40,
              padding: "0 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              width: "100%",
              maxWidth: 260,
              opacity: chestEnabled ? 1 : 0.6,
            }}
          />
        </section>

        {/* 自由記述 */}
        <section style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 800 }}>自由記述</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder="メモ（任意）"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              resize: "vertical",
            }}
          />
        </section>

        {/* 422などエラー表示 */}
        {errors.length > 0 && (
          <section
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,0,0,0.25)",
              background: "rgba(255,0,0,0.06)",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>保存できませんでした</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {errors.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </section>
        )}

        {/* 保存 */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "black",
              color: "white",
              cursor: "pointer",
              opacity: submitting ? 0.7 : 1,
              fontWeight: 900,
            }}
          >
            {submitting ? "保存中…" : "保存"}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/log?date=${encodeURIComponent(practicedOn)}`)}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
