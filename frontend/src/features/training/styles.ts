// frontend/src/features/training/styles.ts
export const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "14px 14px 90px",
    maxWidth: 920,
    margin: "0 auto",
    color: "#111",
  },

  shell: { display: "grid", gap: 12, minWidth: 0 },

  header: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    padding: "2px 2px 0",
    minWidth: 0,
  },

  title: { fontSize: 18, fontWeight: 900, margin: "6px 0 3px", letterSpacing: 0.2 },
  subtitle: { fontSize: 12, opacity: 0.75, margin: 0, lineHeight: 1.6 },

  card: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
    minWidth: 0,
    display: "grid",
    gap: 14,
  },

  block: { display: "grid", gap: 12, minWidth: 0 },

  divider: { height: 1, width: "100%", background: "rgba(0,0,0,0.06)" },

  note: {
    margin: 0,
    fontSize: 12,
    opacity: 0.75,
    lineHeight: 1.6,
  },
};
