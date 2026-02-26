import { useEffect, useMemo, useRef, useState } from "react";

export type DrawerItem = {
  label: string;
  onClick: () => void;

  to?: string;
  match?: "exact" | "prefix";

  disabled?: boolean;
  variant?: "default" | "danger";
};

export type DrawerSection = {
  title: string;
  items: DrawerItem[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  headerTitle: string;
  headerSub?: string;
  sections: DrawerSection[];
  activePath: string;
};

const TRANSITION_MS = 220;

export default function HamburgerDrawer({
  open,
  onClose,
  headerTitle,
  headerSub,
  sections,
  activePath,
}: Props) {
  // close animationのためだけに残すフラグ
  const [mounted, setMounted] = useState(open);
  // 見た目（transform/opacity）用
  const [visible, setVisible] = useState(false);

  const closeTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // open が true なら必ず mounted 扱いにする（レンダー由来）
  const shouldRender = open || mounted;

  // open/close の切り替え
  useEffect(() => {
    // 既存タイマー掃除
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (open) {
      // マウントは「すでにmounted=true」なら不要、falseなら次tickでtrueにする
      // （effect内同期setStateを避けるため、rAFに乗せる）
      if (!mounted) {
        rafRef.current = window.requestAnimationFrame(() => {
          setMounted(true);
          // mountedになった次フレームでvisibleをtrue（transition確実化）
          rafRef.current = window.requestAnimationFrame(() => setVisible(true));
        });
      } else {
        // すでにDOMがあるなら、次フレームでvisibleだけtrue
        rafRef.current = window.requestAnimationFrame(() => setVisible(true));
      }
      return;
    }

    // closing: まずvisibleを落としてアニメ開始（次フレームで実行）
    rafRef.current = window.requestAnimationFrame(() => setVisible(false));

    // transition後にunmount
    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
    }, TRANSITION_MS);

    return () => {
      if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // body scroll lock + ESC（DOMが出ている間だけ）
  useEffect(() => {
    if (!shouldRender) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [shouldRender, onClose]);

  const isActive = useMemo(() => {
    return (it: DrawerItem) => {
      if (!it.to) return false;
      const mode = it.match ?? "exact";
      if (mode === "exact") return activePath === it.to;
      return activePath === it.to || activePath.startsWith(`${it.to}/`);
    };
  }, [activePath]);

  if (!shouldRender) return null;

  return (
    <div style={styles.root} role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="メニューを閉じる"
        onClick={onClose}
        style={{
          ...styles.backdrop,
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
        }}
      />

      <aside
        className="drawer"
        style={{
          ...styles.sheet,
          transform: visible ? "translateX(0)" : "translateX(18px)",
          opacity: visible ? 1 : 0,
        }}
      >
        <div style={styles.sheetHeader}>
          <div>
            <div className="drawer__headerTitle" style={styles.sheetTitle}>
              {headerTitle}
            </div>
            {headerSub && (
              <div className="drawer__headerSub" style={styles.sheetSub}>
                {headerSub}
              </div>
            )}
          </div>

          <button type="button" onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        <div style={styles.content}>
          {sections.map((sec) => (
            <section key={sec.title}>
              <div className="drawer__sectionTitle">{sec.title}</div>

              <div className="drawer__group">
                {sec.items.map((it, index) => {
                  const active = isActive(it);
                  const className = [
                    "drawer__item",
                    it.variant === "danger" ? "drawer__item--danger" : null,
                    active ? "drawer__item--active" : null,
                    it.disabled ? "drawer__item--disabled" : null,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <button
                      className={className}
                      key={it.label}
                      type="button"
                      disabled={it.disabled}
                      onClick={() => {
                        it.onClick();
                        onClose();
                      }}
                      style={{
                        ...styles.item,
                        ...(index > 0 ? styles.itemWithDivider : null),
                        ...(it.variant === "danger" ? styles.itemDanger : null),
                        ...(it.disabled ? styles.itemDisabled : null),
                        ...(active ? styles.itemActive : null),
                      }}
                    >
                      <span
                        style={{
                          ...styles.itemLabel,
                          ...(active ? styles.itemLabelActive : null),
                        }}
                      >
                        {it.label}
                      </span>

                      {active ? (
                        <span style={styles.activeDot} aria-hidden="true">
                          ●
                        </span>
                      ) : (
                        <span className="drawer__chevron" style={styles.chev}>
                          ›
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
            ))}
          </div>

        <div className="drawer__hint" style={styles.bottomHint}>
          ESC または背景タップで閉じられます
        </div>
      </aside>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
  },
  backdrop: {
    position: "absolute",
    inset: 0,
    background: "var(--drawerBackdrop)",
    border: "none",
    padding: 0,
    cursor: "pointer",
    transition: `opacity ${TRANSITION_MS}ms ease`,
  },
  sheet: {
    position: "absolute",
    top: 0,
    right: 0,
    height: "100%",
    width: "min(380px, 92vw)",
    display: "flex",
    flexDirection: "column",
    backdropFilter: "blur(14px)",
    boxShadow: "-10px 0 34px rgba(0,0,0,0.22)",
    transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${TRANSITION_MS}ms ease`,
    willChange: "transform, opacity",
  },
  sheetHeader: {
    padding: "14px 14px 10px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.14)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: 900,
    letterSpacing: 0.2,
    color: "rgba(255, 255, 255, 0.95)",
  },
  sheetSub: {
    fontSize: 12,
    marginTop: 2,
    color: "rgba(255, 255, 255, 0.6)",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 800,
    lineHeight: "40px",
  },
  content: { padding: 14, overflow: "auto" },
  item: {
    width: "100%",
    minHeight: 54,
    textAlign: "left",
    padding: "14px 14px",
    cursor: "pointer",
    border: "none",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  itemWithDivider: {
    borderTop: "1px solid var(--drawerBorder)",
  },
  itemLabel: { fontSize: 14, fontWeight: 800 },
  itemLabelActive: { fontWeight: 900 },
  itemActive: {
    boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.15) inset",
  },
  activeDot: { fontSize: 10, opacity: 0.8, lineHeight: "1", marginLeft: 8 },
  chev: { fontSize: 18, marginLeft: 8 },
  itemDanger: { color: "rgba(255, 120, 120, 0.92)" },
  itemDisabled: { opacity: 0.35, cursor: "not-allowed" },
  bottomHint: {
    padding: "10px 14px 14px",
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.55)",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  },
};
