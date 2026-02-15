export default function HelpContactPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>お問い合わせ</h1>

      <div style={styles.card}>
        <p style={styles.p}>
          まずはUIだけ用意しています。後で「お問い合わせフォーム（API）」や
          「メール送信（mailto）」に差し替えできます。
        </p>

        <div style={styles.row}>
          <div style={styles.k}>連絡方法</div>
          <div style={styles.v}>未実装</div>
        </div>

        <div style={styles.note}>
          次の実装案：
          <ul style={styles.ul}>
            <li>mailto リンク（最短）</li>
            <li>Railsに /api/inquiries を追加して保存（堅実）</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "14px 14px 90px", maxWidth: 920, margin: "0 auto", color: "#111" },
  h1: { fontSize: 18, fontWeight: 900, margin: "6px 0 10px" },
  card: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
  },
  p: { fontSize: 13, opacity: 0.85, lineHeight: 1.7, margin: "0 0 10px" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  k: { fontSize: 13, fontWeight: 800, opacity: 0.75 },
  v: { fontSize: 13, fontWeight: 900 },
  note: { marginTop: 10, fontSize: 12, opacity: 0.7, lineHeight: 1.6 },
  ul: { margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.8 },
};
