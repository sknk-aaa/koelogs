import "./HelpPages.css";

export default function HelpAboutPage() {
  return (
    <div className="page helpPage">
      <div className="helpPage__bg" aria-hidden="true" />

      <section className="card helpPage__hero">
        <div className="helpPage__kicker">About</div>
        <h1 className="helpPage__title">このアプリについて</h1>
        <p className="helpPage__sub">
          voice-app は「日々のボイトレ」を続けやすくするための、記録・再生・分析アプリです。
        </p>
      </section>

      <section className="card helpPage__card">
        <ul className="helpPage__list">
          <li>記録: 練習メニュー / 時間 / 最高音 / メモ</li>
          <li>再生: スケール音源で練習</li>
          <li>分析: 継続状況や頻度の可視化</li>
        </ul>
      </section>
    </div>
  );
}
