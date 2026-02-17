export default function HelpGuidePage() {
  return (
    <div className="page" style={styles.page}>
      <h1 className="h1">使い方</h1>

      <div className="card" style={styles.card}>
        <ol style={styles.ol}>
          <li>ログ：日付を選んで記録を確認</li>
          <li>記録：/log/new から練習内容を保存</li>
          <li>トレーニング：音源を再生して練習</li>
          <li>分析：直近の傾向を確認</li>
        </ol>
        <div style={styles.note}>
          ※ 記録は日付単位で保存され、同じ日の入力は上書き更新されます
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {},
  card: {},
  ol: { margin: 0, paddingLeft: 18, lineHeight: 1.8, fontSize: 13 },
  note: { marginTop: 10, fontSize: 12, opacity: 0.7, lineHeight: 1.6 },
};
