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
            <div className="insightsHero__eyebrowRow">
              <span className="insightsHero__eyebrowIcon" aria-hidden="true">
                <DestinationIcon />
              </span>
              <div className="insightsHero__eyebrow">DESTINATION</div>
            </div>
            <p className="insightsHero__sub">この指標はログページの日別表示へ統合しました。</p>
          </div>
          <Link to="/insights" className="insightsBack">
            戻る
          </Link>
        </div>
      </section>

      <section className="insightsCard">
        <InsightsCardHeader title="移動先" eyebrow="LOG" icon={<LogSectionIcon />} />
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

function DestinationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M6 18.5V5.5" />
      <path className="accent" d="M7.5 6h9l-2 3 2 3h-9" />
    </svg>
  );
}

function LogSectionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4.5" width="14" height="15" rx="3" />
      <path className="accent" d="M8.5 9h7" />
      <path d="M8.5 12.5h7" />
      <path d="M8.5 16h4.5" />
    </svg>
  );
}
