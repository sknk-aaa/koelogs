import "./HelpPages.css";

export default function HelpGuidePage() {
  return (
    <div className="page helpPage">
      <div className="helpPage__bg" aria-hidden="true" />

      <section className="card helpPage__hero">
        <div className="helpPage__kicker">Help</div>
        <h1 className="helpPage__title">使い方ガイド</h1>
        <p className="helpPage__sub">最短で使い始めるための基本フローです。</p>
        <div className="helpPage__chipRow">
          <div className="helpPage__chip">ログ記録</div>
          <div className="helpPage__chip">トレーニング再生</div>
          <div className="helpPage__chip">分析確認</div>
        </div>
      </section>

      <section className="card helpPage__card">
        <ol className="helpPage__ordered">
          <li>ログ: 日付を選んで記録を確認</li>
          <li>記録: `/log/new` から練習内容を保存</li>
          <li>トレーニング: 音源を再生して練習</li>
          <li>分析: 直近の傾向を確認</li>
        </ol>
        <p className="helpPage__note">※ 記録は日付単位で保存され、同じ日の入力は上書き更新されます。</p>
      </section>
    </div>
  );
}
