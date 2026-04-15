import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "./HelpPages.css";

type FactValue = string | ReactNode;

type BusinessItem = {
  label: string;
  value: FactValue;
};

type PricePlan = {
  name: string;
  price: string;
  detail: string;
};

const BUSINESS_ITEMS: readonly BusinessItem[] = [
  { label: "販売事業者", value: "Koelogs" },
  { label: "運営統括責任者", value: "請求があった場合には遅滞なく開示いたします" },
  { label: "所在地", value: "請求があった場合には遅滞なく開示いたします" },
  { label: "電話番号", value: "請求があった場合には遅滞なく開示いたします" },
  { label: "メールアドレス", value: "koelogs.app@gmail.com" },
  {
    label: "販売URL",
    value: (
      <a href="https://koelogs.com" className="legalPage__inlineLink">
        https://koelogs.com
      </a>
    ),
  },
  { label: "支払方法", value: "クレジットカード決済" },
  { label: "支払時期", value: "購入手続き完了時に初回決済が行われます。以後は契約中、各更新日に自動で決済されます。" },
  { label: "商品の引渡時期", value: "決済完了後、直ちに対象プランの機能を利用できます。" },
  { label: "商品代金以外に必要な費用", value: "インターネット接続に必要な通信料などはお客様のご負担となります。" },
  {
    label: "解約方法",
    value: "プラン管理画面または Stripe のカスタマーポータルから解約できます。次回更新日前までに解約すると、次回以降の請求は発生しません。",
  },
  {
    label: "返品・交換・返金",
    value: "デジタルサービスの性質上、決済完了後の返品・交換は受け付けていません。法令上認められる場合を除き、返金は行いません。",
  },
];

const PRICE_PLANS: readonly PricePlan[] = [
  {
    name: "Premium 1か月プラン",
    price: "980円",
    detail: "1か月ごとの自動更新です。",
  },
  {
    name: "Premium 3か月プラン",
    price: "2,499円",
    detail: "3か月ごとの自動更新です。実質 833円 / 月です。",
  },
];

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
        <section className="legalPage__section">
          <h2 className="legalPage__sectionTitle">販売しているサービス</h2>
          <div className="legalPage__paragraphs">
            <p className="legalPage__paragraph">
              Koelogs の有料プランでは、練習ログの継続記録、音声測定結果の確認、AI による練習提案の活用、分析や比較機能などを利用できます。
            </p>
            <p className="legalPage__paragraph">
              サービス内容の詳細は
              {" "}
              <Link to="/premium" className="legalPage__inlineLink">
                プレミアムプランページ
              </Link>
              {" "}
              と
              {" "}
              <Link to="/help/about" className="legalPage__inlineLink">
                このアプリについて
              </Link>
              {" "}
              に掲載しています。
            </p>
          </div>
        </section>

        <section className="legalPage__section">
          <h2 className="legalPage__sectionTitle">販売価格</h2>
          <div className="legalPage__priceList">
            {PRICE_PLANS.map((plan) => (
              <div key={plan.name} className="legalPage__priceRow">
                <div className="legalPage__priceName">{plan.name}</div>
                <div className="legalPage__priceValue">{plan.price}</div>
                <div className="legalPage__priceDetail">{plan.detail}</div>
              </div>
            ))}
          </div>
        </section>

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
          <h2 className="legalPage__sectionTitle">更新と解約</h2>
          <div className="legalPage__paragraphs">
            <p className="legalPage__paragraph">
              すべての有料プランは自動更新型です。契約期間が終了する前に解約しない場合、同一プランで次回分が自動更新されます。
            </p>
            <p className="legalPage__paragraph">
              解約後も、現在の契約期間が満了するまでは対象機能を継続利用できます。次回更新日や解約予定日は、ログイン後のプラン管理画面または
              Stripe の契約管理画面で確認できます。
            </p>
          </div>
        </section>

        <section className="legalPage__section">
          <h2 className="legalPage__sectionTitle">関連ページ</h2>
          <div className="legalPage__linkRow">
            <Link to="/premium" className="legalPage__linkChip">プレミアムプラン</Link>
            <Link to="/help/about" className="legalPage__linkChip">このアプリについて</Link>
            <Link to="/help/terms" className="legalPage__linkChip">利用規約</Link>
            <Link to="/help/privacy" className="legalPage__linkChip">プライバシーポリシー</Link>
            <Link to="/help/contact" className="legalPage__linkChip">お問い合わせ</Link>
          </div>
        </section>
      </section>
    </div>
  );
}
