// frontend/src/features/training/styles.ts
import type React from "react";

export const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "14px 14px 90px",
    maxWidth: 920,
    margin: "0 auto",
    color: "var(--text)",
    position: "relative",

    // ✅ 横に広がる装飾があっても画面幅を壊さない
    overflowX: "hidden",
  },

  bgGlow: {
    position: "absolute",
    top: -120,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100vw",
    height: 300,
    background:
      "radial-gradient(closest-side at 20% 20%, var(--accentSoft), rgba(0,0,0,0.00) 62%)," +
      "radial-gradient(closest-side at 80% 10%, rgba(0,0,0,0.06), rgba(0,0,0,0.00) 60%)",
    filter: "blur(8px)",
    pointerEvents: "none",
    zIndex: -1,
  },

  shell: { display: "grid", gap: 14, minWidth: 0 },

  // ✅ wrapしても「右が右」に居続けるヘッダー
  header: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    padding: "4px 2px 0",
    minWidth: 0,
    flexWrap: "wrap",
  },

  // ✅ ここが重要：width:100% を消し、marginLeft:auto で右寄せ維持
  headerRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    minWidth: 0,
    marginLeft: "auto",
  },

  kicker: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    opacity: 0.6,
    marginBottom: 6,
  },

  title: {
    fontSize: 18,
    fontWeight: 950,
    margin: "0 0 6px",
    letterSpacing: 0.2,
  },

  subtitle: {
    fontSize: 13,
    opacity: 0.8,
    margin: 0,
    lineHeight: 1.7,
    maxWidth: 560,
  },

  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.80)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
    userSelect: "none",
    whiteSpace: "nowrap", // ✅ スマホで変に折れない
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "currentColor",
    boxShadow: "0 0 0 4px rgba(0,0,0,0.05)",
  },

  tipCard: {
    width: "100%",
    borderRadius: 18,
    border: "1px solid rgba(0,0,0,0.08)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.90), rgba(255,255,255,0.70))",
    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
    padding: "10px 12px",
  },

  tipTitle: {
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 0.2,
    marginBottom: 4,
    opacity: 0.88,
  },

  tipText: {
    fontSize: 12,
    lineHeight: 1.6,
    opacity: 0.8,
    fontWeight: 700,
  },

  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
    minWidth: 0,
    display: "grid",
    gap: 14,
  },

  section: { display: "grid", gap: 12, minWidth: 0 },

  sectionHead: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    minWidth: 0,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: 950,
    letterSpacing: 0.2,
    opacity: 0.9,
  },

  sectionMeta: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  badge: {
    fontSize: 11,
    fontWeight: 900,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "var(--accentSoft)",
    boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
    opacity: 0.95,
    whiteSpace: "nowrap",
  },

  miniNote: {
    fontSize: 12,
    fontWeight: 800,
    opacity: 0.72,
  },

  filtersBox: {
    borderRadius: 16,
    border: "1px solid var(--border)",
    background: "rgba(255,255,255,0.78)",
    boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
    padding: 12,
  },

  playerShell: {
    borderRadius: 16,
    border: "1px solid var(--border)",
    background: "rgba(255,255,255,0.78)",
    boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
    padding: 14,
  },

  divider: { height: 1, width: "100%", background: "rgba(0,0,0,0.08)" },

  note: {
    margin: 0,
    fontSize: 12,
    opacity: 0.78,
    lineHeight: 1.6,
  },

  errorBox: {
    borderRadius: 16,
    border: "1px solid rgba(220,40,80,0.22)",
    background: "rgba(220,40,80,0.08)",
    padding: "10px 12px",
  },

  errorTitle: {
    fontSize: 12,
    fontWeight: 950,
    marginBottom: 4,
    color: "rgba(220,40,80,0.92)",
  },

  errorText: {
    fontSize: 12,
    fontWeight: 800,
    opacity: 0.85,
    lineHeight: 1.6,
  },

  skeletonRow: {
    display: "grid",
    gap: 10,
    paddingTop: 2,
  },

  skeleton: {
    height: 12,
    width: "55%",
    borderRadius: 999,
    background:
      "linear-gradient(90deg, rgba(0,120,255,0.06), rgba(0,0,0,0.10), rgba(0,120,255,0.06))",
    backgroundSize: "200% 100%",
  },
};
