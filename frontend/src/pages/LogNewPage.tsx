import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { upsertTrainingLog, type UpsertTrainingLogInput } from "../api/trainingLogs";
import { fetchTrainingLogByDate } from "../api/trainingLogs";
import { createAiRecommendation } from "../api/aiRecommendations";
import { fetchInsights } from "../api/insights";
import type { TrainingLog } from "../types/trainingLog";
import type { SaveRewards } from "../types/gamification";
import { fetchTrainingMenus, createTrainingMenu, updateTrainingMenu } from "../api/trainingMenus";
import type { TrainingMenu } from "../types/trainingMenu";
import { useSettings } from "../features/settings/useSettings";
import ColoredTag from "../components/ColoredTag";

import "./LogNewPage.css";

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
type EffectFeedbackPayload = { menu_id: number; improvement_tags: string[] };

export default function LogNewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { settings } = useSettings();
  const navState = location.state as { quickFromWelcome?: boolean } | null;
  const quickMode = navState?.quickFromWelcome === true;

  // /log/new?date=YYYY-MM-DD で来たらそれを優先
  const initialDate = params.get("date") || todayISO();

  const [practicedOn, setPracticedOn] = useState(initialDate);
  const [durationMin, setDurationMin] = useState("");
  const [notes, setNotes] = useState("");

  // メニュー管理：DB由来（追加/論理削除 + 複数選択）
  const [menuCatalog, setMenuCatalog] = useState<TrainingMenu[]>([]);
  const [menuToAdd, setMenuToAdd] = useState("");
  const [selectedMenuIds, setSelectedMenuIds] = useState<Set<number>>(() => new Set());
  const [effectFeedbacks, setEffectFeedbacks] = useState<EffectFeedbackPayload[]>([]);

  // 追加時の色
  const [menuColorToAdd, setMenuColorToAdd] = useState(MENU_COLOR_PALETTE[0].color);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiPromptDate, setAiPromptDate] = useState<string | null>(null);
  const [aiPromptLoading, setAiPromptLoading] = useState(false);
  const [aiPromptError, setAiPromptError] = useState<string | null>(null);
  const [showAiPromptOnSave, setShowAiPromptOnSave] = useState(false);
  const [pendingRewards, setPendingRewards] = useState<SaveRewards | null>(null);
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

  // 初回保存時のみ AI生成ポップアップを出す
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchInsights(30);
      if (cancelled) return;

      if ("error" in res && res.error) {
        setShowAiPromptOnSave(false);
        return;
      }

      const total = res.data?.total_practice_days_count ?? 0;
      setShowAiPromptOnSave(total === 0);
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
        setEffectFeedbacks([]);
        setInitialLoading(false);
        return;
      }

      setDurationMin(existing.duration_min == null ? "" : String(existing.duration_min));
      setNotes(existing.notes ?? "");

      const ids =
        existing.menu_ids && existing.menu_ids.length ? existing.menu_ids : (existing.menus ?? []).map((m) => m.id);

      setSelectedMenuIds(new Set(ids));
      const validEffectFeedbacks = Array.isArray(existing.effect_feedbacks)
        ? existing.effect_feedbacks
            .map((entry): EffectFeedbackPayload | null => {
              const menuId = typeof entry?.menu_id === "number" && entry.menu_id > 0 ? entry.menu_id : null;
              const improvementTags = Array.isArray(entry?.improvement_tags)
                ? Array.from(
                    new Set(
                      entry.improvement_tags
                        .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
                        .filter((tag) => tag.length > 0)
                    )
                  )
                : [];
              if (!menuId || improvementTags.length === 0) return null;
              return { menu_id: menuId, improvement_tags: improvementTags };
            })
            .filter((v): v is EffectFeedbackPayload => v !== null)
        : [];
      setEffectFeedbacks(validEffectFeedbacks);

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

    const parsedDuration = durationMin.trim() === "" ? null : Number.parseInt(durationMin.trim(), 10);

    const payload: UpsertTrainingLogInput = {
      practiced_on: practicedOn,
      duration_min: Number.isNaN(parsedDuration as number) ? null : parsedDuration,
      menu_ids: quickMode ? [] : selectedMenuIdsArray,
      notes: notes.trim() === "" ? null : notes,
      effect_feedbacks: effectFeedbacks,
    };

    const result = await upsertTrainingLog(payload);
    setSubmitting(false);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    const nextRewards = result.rewards ?? null;
    setPendingRewards(nextRewards);

    if (showAiPromptOnSave) {
      setAiPromptDate(practicedOn);
      setAiPromptError(null);
      setAiPromptOpen(true);
      setShowAiPromptOnSave(false);
      return;
    }

    navigate(`/log?mode=day&date=${encodeURIComponent(practicedOn)}`, {
      replace: true,
      state: nextRewards ? { gamificationToast: nextRewards } : null,
    });
  };

  const onCancel = () => {
    navigate(`/log?mode=day&date=${encodeURIComponent(practicedOn)}`);
  };

  const onSkipAiRecommendation = () => {
    if (aiPromptLoading) return;
    const targetDate = aiPromptDate ?? practicedOn;
    setAiPromptOpen(false);
    navigate(`/log?mode=day&date=${encodeURIComponent(targetDate)}`, {
      replace: true,
      state: pendingRewards ? { gamificationToast: pendingRewards } : null,
    });
  };

  const onCreateAiRecommendation = async () => {
    if (!aiPromptDate || aiPromptLoading) return;

    setAiPromptLoading(true);
    setAiPromptError(null);

    const res = await createAiRecommendation({
      date: aiPromptDate,
      range_days: settings.aiRangeDays,
    });

    if (!res.ok) {
      setAiPromptError(res.errors.join("\n"));
      setAiPromptLoading(false);
      return;
    }

    setAiPromptOpen(false);
    setAiPromptLoading(false);
    navigate(`/log?mode=day&date=${encodeURIComponent(aiPromptDate)}`, {
      replace: true,
      state: pendingRewards ? { gamificationToast: pendingRewards } : null,
    });
  };

  return (
    <div className="page logNew">
      <form id="log-new-form" onSubmit={onSubmit} className="logNew__form">
        {initialLoading && <div className="logNew__loading">既存ログを読み込み中…</div>}

        {!quickMode && (
          <section className="card logNew__section">
            <div className="logNew__sectionTitle">基本情報</div>

            <div className="logNew__field">
              <label className="logNew__label" htmlFor="practicedOn">日付</label>
              <input
                id="practicedOn"
                type="date"
                value={practicedOn}
                onChange={(e) => setPracticedOn(e.target.value)}
                className="logNew__input"
              />
            </div>

            <div className="logNew__field">
              <label className="logNew__label" htmlFor="durationMin">練習時間（分）</label>
              <input
                id="durationMin"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                placeholder="例: 30"
                className="logNew__input"
              />
            </div>
          </section>
        )}

        {!quickMode && (
          <section className="card logNew__section">
            <div className="logNew__sectionTitle">練習メニュー（複数選択）</div>

          <div className="logNew__panel">
            <div className="logNew__subLabel">メニュー名</div>
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
              className="logNew__input"
            />

            <div className="logNew__subLabel">追加する色</div>
            <div className="logNew__palette">
              {MENU_COLOR_PALETTE.map((p) => {
                const active = p.color === menuColorToAdd;
                return (
                  <button
                    key={p.color}
                    type="button"
                    onClick={() => setMenuColorToAdd(p.color)}
                    title={`この色で追加: ${p.name}`}
                    aria-label={`この色で追加: ${p.name}`}
                    className={`logNew__swatch ${active ? "is-active" : ""}`}
                    style={{ background: p.color }}
                  >
                    {active && <span className="logNew__swatchCheck">✓</span>}
                  </button>
                );
              })}
            </div>

            <div className="logNew__previewRow">
              <div className="logNew__subLabel">プレビュー</div>
              <ColoredTag text="タグ表示" color={menuColorToAdd} />
            </div>

            <div className="logNew__panelActions">
              <button type="button" onClick={addMenu} disabled={!menuToAdd.trim()} className="logNew__btn logNew__btn--ghost">
                この色で追加
              </button>
              <div className="logNew__muted">※ 選んだ色はメニュータグとして保存されます</div>
            </div>
          </div>

          <div className="logNew__menuList">
            {menuCatalog.map((menu) => {
              const checked = selectedMenuIds.has(menu.id);

              return (
                <div
                  key={menu.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleMenu(menu.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleMenu(menu.id);
                    }
                  }}
                  aria-pressed={checked}
                  className={`logNew__menuRow ${checked ? "is-checked" : ""}`}
                >
                  <span className="logNew__check" aria-hidden="true">✓</span>

                  <ColoredTag text={menu.name} color={menu.color} />

                  {checked && <span className="logNew__selectedText">選択中</span>}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeMenuFromCatalog(menu);
                    }}
                    className="logNew__removeBtn"
                    title="カタログから削除（archived=true）"
                  >
                    削除
                  </button>
                </div>
              );
            })}

            {menuCatalog.length === 0 && (
              <div className="logNew__muted">メニューがありません。上の入力から追加してください。</div>
            )}
          </div>

          <div className="logNew__field">
            <div className="logNew__subLabel">選択中メニュー</div>
            <div className="logNew__selectedTags">
              {selectedMenuIdsArray.length ? (
                selectedMenuIdsArray.map((id) => {
                  const m = menuCatalog.find((x) => x.id === id);
                  return <ColoredTag key={id} text={m?.name ?? `#${id}`} color={m?.color ?? "#E5E7EB"} />;
                })
              ) : (
                <span className="logNew__muted">なし</span>
              )}
            </div>
          </div>
          </section>
        )}

        <section className="card logNew__section">
          <div className="logNew__sectionTitle">{quickMode ? "現在の声の状況を教えてください" : "自由記述"}</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder={quickMode ? "いまの声の状態・気づき（詳細に記述することでAIがより適切なアドバイスを提供できます）" : "メモ（声の状態や悩みを詳細に記述すると、AIがより適切なアドバイスを提供できます。） "}
            className="logNew__textarea"
          />
        </section>

        {errors.length > 0 && (
          <section className="logNew__errorBox">
            <div className="logNew__errorTitle">保存できませんでした</div>
            <ul className="logNew__errorList">
              {errors.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </section>
        )}
      </form>

      {aiPromptOpen && (
        <div className="logNew__aiPromptOverlay" role="dialog" aria-modal="true" aria-label="AIおすすめ生成確認">
          <section className="logNew__aiPromptCard">
            <div className="logNew__aiPromptTitle">AIおすすめを生成しますか？</div>
            <div className="logNew__aiPromptText">
              保存した記録をもとに、今日のおすすめメニューを提案します。
            </div>
            {aiPromptError && <div className="logNew__aiPromptError">{aiPromptError}</div>}
            <div className="logNew__aiPromptActions">
              <button
                type="button"
                className="logNew__btn logNew__btn--ghost"
                onClick={onSkipAiRecommendation}
                disabled={aiPromptLoading}
              >
                あとで
              </button>
              <button
                type="button"
                className="logNew__btn logNew__btn--primary"
                onClick={() => void onCreateAiRecommendation()}
                disabled={aiPromptLoading}
              >
                {aiPromptLoading ? "生成中…" : "生成する"}
              </button>
            </div>
          </section>
        </div>
      )}

      <div className="logNew__stickyBar">
        <div className="logNew__stickyInner">
          <button type="button" onClick={onCancel} disabled={submitting} className="logNew__btn logNew__btn--ghost">
            キャンセル
          </button>

          <button
            type="button"
            onClick={() => {
              const form = document.getElementById("log-new-form") as HTMLFormElement | null;
              form?.requestSubmit();
            }}
            disabled={submitting}
            className="logNew__btn logNew__btn--primary"
          >
            {submitting ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
