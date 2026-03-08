import { useEffect, useMemo, useState } from "react";
import { createTrainingMenu, fetchTrainingMenus, updateTrainingMenu } from "../../../api/trainingMenus";
import type { TrainingMenu } from "../../../types/trainingMenu";
import "./TodayMenuModal.css";

type Props = {
  open: boolean;
  initialSelectedIds: number[];
  onClose: () => void;
  onSave: (menuIds: number[]) => Promise<void>;
};

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

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

export default function TodayMenuModal({ open, initialSelectedIds, onClose, onSave }: Props) {
  const [menuCatalog, setMenuCatalog] = useState<TrainingMenu[]>([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState<Set<number>>(() => new Set(initialSelectedIds));
  const [menuToAdd, setMenuToAdd] = useState("");
  const [menuColorToAdd, setMenuColorToAdd] = useState(MENU_COLOR_PALETTE[0].color);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedMenuIds(new Set(initialSelectedIds));
    setMenuToAdd("");
    setMenuColorToAdd(MENU_COLOR_PALETTE[0].color);
    setError(null);
  }, [initialSelectedIds, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void fetchTrainingMenus(false)
      .then((menus) => {
        if (cancelled) return;
        setMenuCatalog(menus);
        setLoading(false);
      })
      .catch((fetchError: unknown) => {
        if (cancelled) return;
        setError(errorMessage(fetchError, "メニュー取得に失敗しました"));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const selectedMenuIdsArray = useMemo(() => Array.from(selectedMenuIds), [selectedMenuIds]);

  if (!open) return null;

  const toggleMenu = (id: number) => {
    setSelectedMenuIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addMenu = async () => {
    const name = menuToAdd.trim();
    if (!name) return;
    try {
      const created = await createTrainingMenu({ name, color: menuColorToAdd });
      setMenuCatalog((prev) => [...prev, created]);
      setSelectedMenuIds((prev) => new Set(prev).add(created.id));
      setMenuToAdd("");
      setMenuColorToAdd(MENU_COLOR_PALETTE[0].color);
      setError(null);
    } catch (createError) {
      setError(errorMessage(createError, "メニュー追加に失敗しました"));
    }
  };

  const removeMenu = async (menu: TrainingMenu) => {
    try {
      await updateTrainingMenu(menu.id, { archived: true });
      setMenuCatalog((prev) => prev.filter((item) => item.id !== menu.id));
      setSelectedMenuIds((prev) => {
        const next = new Set(prev);
        next.delete(menu.id);
        return next;
      });
      setError(null);
    } catch (removeError) {
      setError(errorMessage(removeError, "メニュー削除に失敗しました"));
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(selectedMenuIdsArray);
      onClose();
    } catch (saveError) {
      setError(errorMessage(saveError, "メニュー保存に失敗しました"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="todayMenuModal" role="dialog" aria-modal="true" aria-label="今日のメニューを編集">
      <button type="button" className="todayMenuModal__backdrop" aria-label="閉じる" onClick={onClose} />
      <section className="todayMenuModal__panel">
        <div className="todayMenuModal__head">
          <div>
            <div className="todayMenuModal__eyebrow">TODAY MENU</div>
            <div className="todayMenuModal__title">今日やったメニューを選ぶ</div>
          </div>
          <button type="button" className="todayMenuModal__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="todayMenuModal__composer">
          <input
            value={menuToAdd}
            onChange={(event) => setMenuToAdd(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              void addMenu();
            }}
            placeholder="メニューを追加"
            className="todayMenuModal__input"
          />
          <div className="todayMenuModal__palette">
            {MENU_COLOR_PALETTE.map((palette) => {
              const active = palette.color === menuColorToAdd;
              return (
                <button
                  key={palette.color}
                  type="button"
                  className={`todayMenuModal__swatch ${active ? "is-active" : ""}`}
                  style={{ background: palette.color }}
                  aria-label={palette.name}
                  onClick={() => setMenuColorToAdd(palette.color)}
                />
              );
            })}
          </div>
          <button type="button" className="todayMenuModal__addBtn" onClick={() => void addMenu()} disabled={!menuToAdd.trim()}>
            追加
          </button>
        </div>

        {loading ? <div className="todayMenuModal__muted">読み込み中…</div> : null}
        {error ? <div className="todayMenuModal__error">{error}</div> : null}

        <div className="todayMenuModal__list">
          {menuCatalog.map((menu) => {
            const checked = selectedMenuIds.has(menu.id);
            return (
              <div
                key={menu.id}
                role="button"
                tabIndex={0}
                onClick={() => toggleMenu(menu.id)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  toggleMenu(menu.id);
                }}
                className={`todayMenuModal__item ${checked ? "is-selected" : ""}`}
              >
                <span className="todayMenuModal__check" aria-hidden="true">
                  {checked ? "✓" : ""}
                </span>
                <span className="todayMenuModal__tag" style={{ ["--menu-color" as string]: menu.color }}>
                  <span className="todayMenuModal__tagDot" aria-hidden="true" />
                  <span>{menu.name}</span>
                </span>
                <button
                  type="button"
                  className="todayMenuModal__remove"
                  onClick={(event) => {
                    event.stopPropagation();
                    void removeMenu(menu);
                  }}
                >
                  削除
                </button>
              </div>
            );
          })}
          {!loading && menuCatalog.length === 0 ? <div className="todayMenuModal__muted">メニューがありません。</div> : null}
        </div>

        <div className="todayMenuModal__footer">
          <button type="button" className="todayMenuModal__ghost" onClick={onClose} disabled={saving}>
            キャンセル
          </button>
          <button type="button" className="todayMenuModal__save" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </section>
    </div>
  );
}
