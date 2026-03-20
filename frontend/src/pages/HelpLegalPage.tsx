import { Link } from "react-router-dom";
import "./HelpPages.css";

const BUSINESS_ITEMS = [
  { label: "販売事業者", value: "Koelogs" },
  { label: "代表責任者", value: "請求があった場合には遅滞なく開示します" },
  { label: "所在地", value: "請求があった場合には遅滞なく開示します" },
  { label: "電話番号", value: "請求があった場合には遅滞なく開示します" },
  { label: "メールアドレス", value: "koelogs.app@gmail.com" },
  { label: "サイトURL", value: "https://koelogs.com" },
  { label: "商品販売価格", value: "各プランページに記載の金額" },
  { label: "商品代金以外に必要な費用", value: "インターネット接続に必要な通信料等" },
  { label: "支払方法", value: "クレジットカード決済" },
  { label: "支払時期", value: "購入手続き時に直ちに決済されます。以後は契約中、各更新日に自動課金されます。" },
  { label: "商品の引渡時期", value: "決済完了後、直ちに対象プランの機能を利用できる状態になります。" },
  { label: "解約方法", value: "プラン管理画面または Stripe の契約管理画面からいつでも手続きできます" },
  {
    label: "返品・交換",
    value:
      "商品の性質上、購入手続き完了後の返品・交換には対応していません。法令上認められる場合を除き、返金は行いません。",
  },
  {
    label: "返金・キャンセル",
    value:
      "次回更新日前までに解約手続きを行うことで、次回以降の請求を停止できます。解約後も契約期間満了までは利用可能です。",
  },
] as const;

export default function HelpLegalPage() {
  return (
    <div className="page helpPage legalPage">
      <section className="helpPage__hero legalPage__hero">
        <div className="helpPage__sectionHead">
          <div className="helpPage__kicker">LEGAL</div>
        </div>
        <h1 className="helpPage__title">特定商取引法に基づく表記</h1>
        <p className="helpPage__sub">
          Koelogs の有料プランに関する販売条件と、決済・解約・返金に関する基本情報を掲載しています。
        </p>
      </section>

      <section className="legalPage__notice">
        Koelogs は、ボイストレーニングの練習記録、音声測定、AI による練習支援機能を提供するサブスクリプション型 Web
        サービスです。
      </section>

      <section className="legalPage__content">
        <section className="legalPage__section legalPage__section--table">
          <h2 className="legalPage__sectionTitle">事業者情報</h2>
          <dl className="legalPage__facts">
            {BUSINESS_ITEMS.map((item) => (
              <div key={item.label} className="legalPage__factRow">
                <dt className="legalPage__factKey">{item.label}</dt>
                <dd className="legalPage__factValue">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="legalPage__section">
          <h2 className="legalPage__sectionTitle">関連ページ</h2>
          <div className="legalPage__linkRow">
            <Link to="/help/terms" className="legalPage__linkChip">利用規約</Link>
            <Link to="/help/privacy" className="legalPage__linkChip">プライバシーポリシー</Link>
            <Link to="/help/contact" className="legalPage__linkChip">お問い合わせ</Link>
          </div>
        </section>
      </section>
    </div>
  );
}
