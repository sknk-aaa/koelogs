export default function HelpAboutPage() {
  return (
    <div className="page" style={styles.page}>
      <h1 className="h1">このアプリについて</h1>

      <div className="card" style={styles.card}>
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
  page: {},
  card: {},
  p: { fontSize: 13, opacity: 0.85, lineHeight: 1.7, margin: "0 0 10px" },
  ul: { margin: 0, paddingLeft: 18, lineHeight: 1.8, fontSize: 13 },
};
