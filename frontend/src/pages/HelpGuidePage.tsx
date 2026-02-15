export default function HelpGuidePage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>使い方</h1>

      <div style={styles.card}>
        <ol style={styles.ol}>
          <li>ログ：日付を選んで記録を確認</li>
          <li>記録：/log/new から練習内容を保存</li>
          <li>トレーニング：音源を再生して練習</li>
          <li>分析：直近の傾向を確認</li>
        </ol>
        <div style={styles.note}>
          ※ ここはあとでスクショ付きにすると「プロダクト感」が一気に上がります
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
  ol: { margin: 0, paddingLeft: 18, lineHeight: 1.8, fontSize: 13 },
  note: { marginTop: 10, fontSize: 12, opacity: 0.7, lineHeight: 1.6 },
};
