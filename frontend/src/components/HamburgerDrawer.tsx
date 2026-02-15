import { useEffect } from "react";
import { createPortal } from "react-dom";

export type DrawerItem = {
  label: string;
  onClick: () => void;
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
};

export default function HamburgerDrawer({
  open,
  onClose,
  headerTitle,
  headerSub,
  sections,
}: Props) {
  // body スクロールロック + ESCで閉じる
  useEffect(() => {
    if (!open) return;

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
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div style={styles.root} role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="メニューを閉じる"
        onClick={onClose}
        style={styles.backdrop}
      />

      <aside style={styles.sheet}>
        <div style={styles.sheetHeader}>
          <div>
            <div style={styles.sheetTitle}>{headerTitle}</div>
            {headerSub && <div style={styles.sheetSub}>{headerSub}</div>}
          </div>

          <button type="button" onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        <div style={styles.content}>
          {sections.map((sec) => (
            <section key={sec.title} style={styles.section}>
              <div style={styles.sectionTitle}>{sec.title}</div>

              <div style={styles.card}>
                {sec.items.map((it) => (
                  <button
                    key={it.label}
                    type="button"
                    disabled={it.disabled}
                    onClick={() => {
                      it.onClick();
                      onClose();
                    }}
                    style={{
                      ...styles.item,
                      ...(it.variant === "danger" ? styles.itemDanger : null),
                      ...(it.disabled ? styles.itemDisabled : null),
                    }}
                  >
                    <span style={styles.itemLabel}>{it.label}</span>
                    <span style={styles.chev}>›</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div style={styles.bottomHint}>
          ESC または背景タップで閉じられます
        </div>
      </aside>
    </div>,
    document.body
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    zIndex: 200,
    display: "grid",
    gridTemplateColumns: "1fr",
  },
  backdrop: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    border: "none",
    padding: 0,
    cursor: "pointer",
  },
  sheet: {
    position: "absolute",
    top: 0,
    right: 0,
    height: "100%",
    width: "min(380px, 92vw)",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(12px)",
    borderLeft: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "-20px 0 60px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    animation: "drawerIn 180ms ease-out",
  },
  sheetHeader: {
    padding: "14px 14px 10px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sheetTitle: { fontSize: 15, fontWeight: 900, letterSpacing: 0.2 },
  sheetSub: { fontSize: 12, opacity: 0.65, marginTop: 2 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.85)",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 800,
    lineHeight: "40px",
  },
  content: {
    padding: 14,
    overflow: "auto",
  },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 800,
    opacity: 0.7,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  card: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  },
  item: {
    width: "100%",
    textAlign: "left",
    padding: "12px 12px",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    color: "#111",
  },
  itemLabel: { fontSize: 14, fontWeight: 800 },
  chev: { fontSize: 18, opacity: 0.35, marginLeft: 8 },
  itemDanger: { color: "#d70015" },
  itemDisabled: { opacity: 0.35, cursor: "not-allowed" },
  bottomHint: {
    padding: "10px 14px 14px",
    fontSize: 11,
    opacity: 0.55,
    borderTop: "1px solid rgba(0,0,0,0.06)",
  },
};
