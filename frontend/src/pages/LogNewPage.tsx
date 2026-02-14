import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { upsertTrainingLog, type UpsertTrainingLogInput } from "../api/trainingLogs";
import { fetchTrainingLogByDate } from "../api/trainingLogs";
import type { TrainingLog } from "../types/trainingLog";

import {
  fetchTrainingMenus,
  createTrainingMenu,
  updateTrainingMenu,
  type TrainingMenu,
} from "../api/trainingMenus";

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

export default function LogNewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // /log/new?date=YYYY-MM-DD で来たらそれを優先（戻り先も合わせやすい）
  const initialDate = params.get("date") || todayISO();

  const [practicedOn, setPracticedOn] = useState(initialDate);
  const [durationMin, setDurationMin] = useState<string>(""); // input扱いやすさ優先
  const [notes, setNotes] = useState<string>("");

  // メニュー管理：DB由来（追加/論理削除 + 複数選択）
  const [menuCatalog, setMenuCatalog] = useState<TrainingMenu[]>([]);
  const [menuToAdd, setMenuToAdd] = useState<string>("");

  const [selectedMenus, setSelectedMenus] = useState<Set<string>>(() => new Set());

  const [falsettoEnabled, setFalsettoEnabled] = useState(false);
  const [falsettoTopNote, setFalsettoTopNote] = useState<string>("");

  const [chestEnabled, setChestEnabled] = useState(false);
  const [chestTopNote, setChestTopNote] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);

  const selectedMenusArray = useMemo(() => Array.from(selectedMenus), [selectedMenus]);

  // 初期ロード：メニュー一覧を取得（archived=falseのみ）
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const menus = await fetchTrainingMenus();
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
        // 取得失敗はフォーム入力を邪魔しない（保存はできる）方針
        setErrors([`既存ログの取得に失敗しました: ${res.error}`]);
        setInitialLoading(false);
        return;
      }

      const existing = res.data as TrainingLog | null;
      if (!existing) {
        setInitialLoading(false);
        return;
      }

      // 既存ログでフォームを上書き
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
    // practicedOn が変わると対象日付も変わるので再取得
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
      const created = await createTrainingMenu(v);
      setMenuCatalog((prev) => [...prev, created]);
      setMenuToAdd("");
    } catch (e) {
      setErrors([errorMessage(e, "メニュー追加に失敗しました")]);
    }
  };

  const removeMenuFromCatalog = async (menu: TrainingMenu) => {
    try {
      await updateTrainingMenu(menu.id, { archived: true });
      setMenuCatalog((prev) => prev.filter((m) => m.id !== menu.id));
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

    // フロント側でも最低限の事故を防ぐ（ただし最終責任はRailsの422）
    const localErrors: string[] = [];
    if (falsettoEnabled && !falsettoTopNote.trim()) localErrors.push("裏声最高音が未入力です");
    if (chestEnabled && !chestTopNote.trim()) localErrors.push("地声最高音が未入力です");
    if (localErrors.length) {
      setErrors(localErrors);
      setSubmitting(false);
      return;
    }

    const parsedDuration =
      durationMin.trim() === "" ? null : Number.parseInt(durationMin.trim(), 10);

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

    // 成功：/log?date=YYYY-MM-DD に戻す
    navigate(`/log?date=${encodeURIComponent(practicedOn)}`, { replace: true });
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 16 }}>今日のトレーニングを記録</h1>

      {initialLoading && (
        <div style={{ marginBottom: 12, opacity: 0.7, fontSize: 13 }}>
          既存ログを読み込み中…
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
        {/* 日付 */}
        <section>
          <div style={{ fontSize: 14, marginBottom: 6 }}>日付</div>
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
        <section>
          <div style={{ fontSize: 14, marginBottom: 6 }}>練習メニュー（複数選択）</div>

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              value={menuToAdd}
              onChange={(e) => setMenuToAdd(e.target.value)}
              placeholder="メニューを追加（例: 裏声リップロール）"
              style={{
                height: 40,
                padding: "0 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                flex: 1,
              }}
            />
            <button
              type="button"
              onClick={addMenu}
              style={{
                height: 40,
                padding: "0 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "white",
                cursor: "pointer",
              }}
            >
              追加
            </button>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {menuCatalog.map((menu) => {
              const checked = selectedMenus.has(menu.name);
              return (
                <div
                  key={menu.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "rgba(0,0,0,0.02)",
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMenu(menu.name)}
                    />
                    <span>{menu.name}</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => removeMenuFromCatalog(menu)}
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      opacity: 0.7,
                    }}
                    title="カタログから削除"
                  >
                    削除
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* 練習時間 */}
        <section>
          <div style={{ fontSize: 14, marginBottom: 6 }}>練習時間（分）</div>
          <input
            inputMode="numeric"
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
        <section>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={falsettoEnabled}
              onChange={(e) => setFalsettoEnabled(e.target.checked)}
            />
            <span>裏声最高音を記録する</span>
          </label>

          <input
            value={falsettoTopNote}
            onChange={(e) => setFalsettoTopNote(e.target.value)}
            placeholder="例: G5, F#5 など"
            disabled={!falsettoEnabled}
            style={{
              marginTop: 8,
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
        <section>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={chestEnabled}
              onChange={(e) => setChestEnabled(e.target.checked)}
            />
            <span>地声最高音を記録する</span>
          </label>

          <input
            value={chestTopNote}
            onChange={(e) => setChestTopNote(e.target.value)}
            placeholder="例: G4, F#4 など"
            disabled={!chestEnabled}
            style={{
              marginTop: 8,
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
        <section>
          <div style={{ fontSize: 14, marginBottom: 6 }}>自由記述</div>
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
            <div style={{ fontWeight: 600, marginBottom: 6 }}>保存できませんでした</div>
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
            }}
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
