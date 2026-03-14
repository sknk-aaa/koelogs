import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  { name: "Sky", color: "#8FD2F4" },
  { name: "Mint", color: "#86DBBF" },
  { name: "Lime", color: "#B5DD82" },
  { name: "Canary", color: "#EDD16E" },
  { name: "Coral", color: "#EC9C81" },
  { name: "Lavender", color: "#B3A3EA" },
  { name: "Rose", color: "#E39AC3" },
  { name: "Slate", color: "#B8C4CF" },
];

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return null;
  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) return null;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function toDarkSwatchColor(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const minChannel = Math.min(rgb.r, rgb.g, rgb.b);
  const maxChannel = Math.max(rgb.r, rgb.g, rgb.b);
  const spread = Math.max(1, maxChannel - minChannel);
  const boosted = {
    r: ((rgb.r - minChannel) / spread) * 170 + 52,
    g: ((rgb.g - minChannel) / spread) * 170 + 52,
    b: ((rgb.b - minChannel) / spread) * 170 + 52,
  };
  return rgbToHex(boosted.r, boosted.g, boosted.b);
}

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
  const canAddMenu = menuToAdd.trim().length > 0;

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

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="todayMenuModal" role="dialog" aria-modal="true" aria-label="今日のメニューを編集">
      <button type="button" className="todayMenuModal__backdrop uiModalBackdrop" aria-label="閉じる" onClick={onClose} />
      <section className="todayMenuModal__panel uiModalPanel">
        <div className="todayMenuModal__head uiModalHeader">
          <div>
            <div className="todayMenuModal__eyebrow uiModalEyebrow">TODAY MENU</div>
            <div className="todayMenuModal__title uiModalTitle">今日やったメニューを選ぶ</div>
          </div>
          <button type="button" className="todayMenuModal__close uiButton uiButton--secondary uiIconButton" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="todayMenuModal__body">
          <div className="todayMenuModal__composer">
            <input
              value={menuToAdd}
              onChange={(event) => setMenuToAdd(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                void addMenu();
              }}
              placeholder="メニュー名を入力"
              className="todayMenuModal__input uiInput uiInputShell"
            />
            <div className="todayMenuModal__palette">
              {MENU_COLOR_PALETTE.map((palette) => {
                const active = palette.color === menuColorToAdd;
                return (
                  <button
                    key={palette.color}
                    type="button"
                    className={`todayMenuModal__swatch uiSwatch ${active ? "is-active" : ""}`}
                    style={{
                      ["--swatch-color" as string]: palette.color,
                      ["--swatch-display-color" as string]: toDarkSwatchColor(palette.color),
                    }}
                    aria-label={palette.name}
                    onClick={() => setMenuColorToAdd(palette.color)}
                  />
                );
              })}
            </div>
            <button
              type="button"
              className={`todayMenuModal__addBtn uiButton uiButton--secondary ${canAddMenu ? "is-ready" : ""}`.trim()}
              onClick={() => void addMenu()}
              disabled={!canAddMenu}
            >
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
                  className={`todayMenuModal__item uiSelectRow ${checked ? "is-selected" : ""}`}
                >
                  <span className="todayMenuModal__check uiCheckDot" aria-hidden="true">
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
        </div>

        <div className="todayMenuModal__footer uiModalFooter">
          <button type="button" className="todayMenuModal__ghost uiButton uiButton--secondary" onClick={onClose} disabled={saving}>
            キャンセル
          </button>
          <button type="button" className="todayMenuModal__save uiButton uiButton--primary" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}
