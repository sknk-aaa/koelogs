import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../features/theme/useTheme";

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
  icon?: React.ReactNode;
};

export type DrawerProfile = {
  avatar?: React.ReactNode;
  name: string;
  planLabel?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  headerTitle: string;
  headerSub?: string;
  profile?: DrawerProfile;
  sections: DrawerSection[];
  footerItem?: DrawerItem;
  activePath: string;
};

const TRANSITION_MS = 220;

export default function HamburgerDrawer({
  open,
  onClose,
  headerTitle,
  headerSub,
  profile,
  sections,
  footerItem,
  activePath,
}: Props) {
  const { resolvedMode } = useTheme();
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

  const drawerThemeVars = useMemo(
    () =>
      ({
        "--drawerBackdrop":
          resolvedMode === "dark" ? "rgba(4, 8, 16, 0.7)" : "rgba(0, 0, 0, 0.35)",
        "--drawerSheet": resolvedMode === "dark" ? "#0c101b" : "#ffffff",
        "--drawerBorder":
          resolvedMode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
        "--drawerCard": resolvedMode === "dark" ? "#141f33" : "#ffffff",
        "--drawerText": resolvedMode === "dark" ? "#e6edf8" : "#111111",
        "--muted":
          resolvedMode === "dark" ? "rgba(231, 238, 251, 0.78)" : "rgba(16, 30, 48, 0.68)",
        "--menuLine": resolvedMode === "dark" ? "#ffffff" : "rgba(0, 0, 0, 0.78)",
      }) as React.CSSProperties,
    [resolvedMode]
  );

  if (!shouldRender) return null;

  return (
    <div style={{ ...styles.root, ...drawerThemeVars }} role="dialog" aria-modal="true">
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
          <div style={styles.headerCopy}>
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
            <span style={{ ...styles.closeBar, ...styles.closeBarTop }} />
            <span style={{ ...styles.closeBar, ...styles.closeBarMiddle }} />
            <span style={{ ...styles.closeBar, ...styles.closeBarBottom }} />
          </button>
        </div>

        <div style={styles.content}>
          {profile ? (
            <div style={styles.profileBlock}>
              <div style={styles.profileAvatar}>{profile.avatar}</div>
              <div style={styles.profileText}>
                <div style={styles.profileName}>{profile.name}</div>
                {profile.planLabel ? <div style={styles.profilePlan}>{profile.planLabel}</div> : null}
              </div>
            </div>
          ) : null}
          {sections.map((sec) => (
            <section key={sec.title} style={styles.section}>
              <div className="drawer__sectionTitle" style={styles.sectionTitleRow}>
                {sec.icon ? <span style={styles.sectionIcon} aria-hidden="true">{sec.icon}</span> : null}
                <span style={styles.sectionTitle}>{sec.title}</span>
              </div>

              <div className="drawer__group" style={styles.group}>
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
                        ...(it.variant === "danger" ? styles.itemDangerSpacing : null),
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
                        <span style={styles.trailingSlot} aria-hidden="true">
                          <span style={styles.activeMark} />
                        </span>
                      ) : (
                        <span className="drawer__chevron" style={styles.trailingSlot} aria-hidden="true">
                          <span style={styles.chev}>→</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
            ))}
        </div>

        {footerItem ? (
          <div style={styles.footerArea}>
            <button
              className="drawer__item drawer__item--danger"
              type="button"
              onClick={() => {
                footerItem.onClick();
                onClose();
              }}
              style={{
                ...styles.item,
                ...styles.footerItem,
                ...(footerItem.variant === "danger" ? styles.itemDanger : null),
                ...(footerItem.disabled ? styles.itemDisabled : null),
              }}
              disabled={footerItem.disabled}
            >
              <span style={{ ...styles.itemLabel, ...styles.footerItemLabel }}>{footerItem.label}</span>
            </button>
          </div>
        ) : null}

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
    background: "var(--drawerSheet, #ffffff)",
    boxShadow: "none",
    transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${TRANSITION_MS}ms ease`,
    willChange: "transform, opacity",
  },
  sheetHeader: {
    padding: "16px 16px 12px",
    borderBottom: "1px solid var(--drawerBorder, rgba(18, 53, 58, 0.08))",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    minWidth: 0,
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.16em",
    color: "var(--drawerText, #5f7480)",
  },
  sheetSub: {
    fontSize: 12,
    marginTop: 2,
    color: "var(--muted, #97a6b1)",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    border: "0",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 0,
  },
  closeBar: {
    display: "block",
    width: 20,
    height: 1.5,
    borderRadius: 999,
    background: "var(--menuLine)",
    margin: 0,
    transformOrigin: "center",
  },
  closeBarTop: {
    transform: "translateY(5.5px) rotate(45deg)",
  },
  closeBarMiddle: {
    opacity: 0,
  },
  closeBarBottom: {
    transform: "translateY(-5.5px) rotate(-45deg)",
  },
  profileBlock: {
    padding: "14px 16px 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    overflow: "hidden",
    flex: "0 0 auto",
    background: "var(--drawerCard, #ffffff)",
  },
  profileText: {
    minWidth: 0,
    display: "grid",
    gap: 4,
  },
  profileName: {
    fontSize: 14,
    fontWeight: 800,
    color: "var(--drawerText, #244050)",
    lineHeight: 1.3,
  },
  profilePlan: {
    width: "fit-content",
    minHeight: 24,
    padding: "0 10px",
    borderRadius: 999,
    border: "1px solid var(--drawerBorder, rgba(18, 53, 58, 0.08))",
    background: "color-mix(in srgb, var(--accent) 8%, var(--drawerCard, #ffffff))",
    color: "var(--muted, #728592)",
    fontSize: 11,
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
  },
  content: { padding: "0 16px 20px", overflow: "auto", display: "grid", gap: 0 },
  section: { display: "grid", gap: 6 },
  sectionTitleRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
  },
  sectionIcon: {
    width: 20,
    height: 20,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "color-mix(in srgb, var(--accent) 48%, var(--muted, #70839a))",
    flex: "0 0 auto",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.14em",
    color: "var(--muted, #738795)",
  },
  group: {
    borderTop: "0",
  },
  item: {
    width: "100%",
    minHeight: 58,
    textAlign: "left",
    padding: "15px 16px",
    cursor: "pointer",
    borderRadius: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  itemWithDivider: {
    marginTop: 10,
  },
  itemLabel: { fontSize: 14, fontWeight: 800, color: "var(--drawerText, #314a5a)" },
  itemLabelActive: { fontWeight: 900, color: "var(--drawerText, #173e52)" },
  itemActive: {
  },
  trailingSlot: {
    width: 18,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    flex: "0 0 auto",
  },
  activeMark: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "color-mix(in srgb, var(--accent) 72%, #5aa6d0)",
  },
  chev: { fontSize: 16, lineHeight: 1, color: "var(--muted, #91a2ae)", transform: "translateY(-1px)" },
  itemDanger: { color: "#866a6a" },
  itemDangerSpacing: {
    marginTop: 10,
    borderTop: "1px solid var(--drawerBorder, rgba(18, 53, 58, 0.08))",
  },
  itemDisabled: { opacity: 0.35, cursor: "not-allowed" },
  footerArea: {
    marginTop: "auto",
    padding: "8px 16px 18px",
    borderTop: "1px solid var(--drawerBorder, rgba(18, 53, 58, 0.08))",
  },
  footerItem: {
    minHeight: 48,
    padding: "12px 16px",
  },
  footerItemLabel: {
    fontSize: 13,
  },
};
