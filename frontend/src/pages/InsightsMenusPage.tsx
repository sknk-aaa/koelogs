import { Link } from "react-router-dom";

import "./InsightsPages.css";

function currentMonth() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function InsightsMenusPage() {
  const month = currentMonth();
  const to = `/log?mode=month&month=${encodeURIComponent(month)}`;

  return (
    <div className="page insightsPage">
      <div className="insightsPage__bg" aria-hidden="true" />

      <section className="card insightsHero">
        <div className="insightsHero__head">
          <div>
            <div className="insightsHero__kicker">Insights</div>
            <h1 className="insightsHero__title">メニュー実施数</h1>
            <p className="insightsHero__sub">この指標は月ログへ移動しました。</p>
          </div>
          <Link to="/insights" className="insightsBack">
            戻る
          </Link>
        </div>
      </section>

      <section className="insightsCard">
        <div className="insightsCard__head">
          <div className="insightsCard__title">移動先</div>
        </div>
        <p className="insightsMuted">今月の日ログ一覧・合計実施メニュー・累計練習時間は月ログで確認できます。</p>
        <div style={{ marginTop: 10 }}>
          <Link to={to} className="insightsBack">
            月ログを開く
          </Link>
        </div>
      </section>
    </div>
  );
}

