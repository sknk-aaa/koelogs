import { Link } from "react-router-dom";

import InsightsCardHeader from "../features/insights/components/InsightsCardHeader";
import "./InsightsPages.css";

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const day = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function InsightsMenusPage() {
  const to = `/log?date=${encodeURIComponent(todayISO())}`;

  return (
    <div className="page insightsPage">
      <div className="insightsPage__bg" aria-hidden="true" />

      <section className="card insightsHero">
        <div className="insightsHero__head">
          <div>
            <div className="insightsHero__kicker">Insights</div>
            <h1 className="insightsHero__title">メニュー実施数</h1>
            <p className="insightsHero__sub">この指標はログページの日別表示へ統合しました。</p>
          </div>
          <Link to="/insights" className="insightsBack">
            戻る
          </Link>
        </div>
      </section>

      <section className="insightsCard">
        <InsightsCardHeader title="移動先" />
        <p className="insightsMuted">日付を切り替えながら、その日のメニュー記録をログページで確認できます。</p>
        <div style={{ marginTop: 10 }}>
          <Link to={to} className="insightsBack">
            ログを開く
          </Link>
        </div>
      </section>
    </div>
  );
}
