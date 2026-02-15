export default function SettingsPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>設定</h1>
      <p style={styles.p}>
        まずはUIだけ用意しています。将来ここに「テーマカラー」などの設定を追加します。
      </p>

      <div style={styles.card}>
        <div style={styles.k}>テーマカラー</div>
        <div style={styles.v}>未実装</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "14px 14px 90px", maxWidth: 920, margin: "0 auto", color: "#111" },
  h1: { fontSize: 18, fontWeight: 900, margin: "6px 0 10px" },
  p: { fontSize: 13, opacity: 0.8, lineHeight: 1.6, marginBottom: 12 },
  card: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  k: { fontSize: 13, fontWeight: 800, opacity: 0.8 },
  v: { fontSize: 13, fontWeight: 900 },
};
