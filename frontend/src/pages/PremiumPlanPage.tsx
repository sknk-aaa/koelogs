import { Link } from "react-router-dom";
import "./PremiumPlanPage.css";

const FEATURES = [
  {
    title: "AI強化",
    items: ["AIおすすめへの質問回数 無制限", "AIチャットの新規作成・継続会話"],
  },
  {
    title: "月ログ強化",
    items: ["先月 vs 今月 比較の詳細診断を閲覧"],
  },
  {
    title: "分析ページ強化",
    items: ["詳細ページの全期間グラフ", "測定履歴の全件表示", "CSV出力"],
  },
  {
    title: "録音測定強化",
    items: ["録音の重ね再生プレビュー", "音声のみWAV保存"],
  },
];

export default function PremiumPlanPage() {
  return (
    <div className="page premiumPlanPage">
      <section className="card premiumPlanPage__hero">
        <div className="premiumPlanPage__kicker">Premium</div>
        <h1 className="premiumPlanPage__title">プレミアムプラン</h1>
        <p className="premiumPlanPage__sub">
          練習の振り返りと分析を、より深く使えるプランです。
        </p>
      </section>

      <section className="premiumPlanPage__grid">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="card premiumPlanPage__card">
            <h2 className="premiumPlanPage__cardTitle">{feature.title}</h2>
            <ul className="premiumPlanPage__list">
              {feature.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="card premiumPlanPage__actions">
        <Link to="/settings" className="premiumPlanPage__cta">
          プラン設定へ進む
        </Link>
        <div className="premiumPlanPage__note">
          価格・決済フローは設定ページ側で順次反映します。
        </div>
      </section>
    </div>
  );
}
