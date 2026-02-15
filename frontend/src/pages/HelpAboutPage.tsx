export default function HelpAboutPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>このアプリについて</h1>

      <div style={styles.card}>
        <p style={styles.p}>
          voice-app は「日々のボイトレ」を続けやすくするための、記録・再生・分析アプリです。
        </p>
        <ul style={styles.ul}>
          <li>記録：練習メニュー / 時間 / 最高音 / メモ</li>
          <li>再生：スケール音源で練習</li>
          <li>分析：継続状況や頻度の可視化</li>
        </ul>
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
  ul: { margin: 0, paddingLeft: 18, lineHeight: 1.8, fontSize: 13 },
};
