import { Link } from "react-router-dom";
import "./HelpPages.css";

type TermsSection = {
  title: string;
  body: readonly string[];
  list?: boolean;
};

const TERMS_SECTIONS: readonly TermsSection[] = [
  {
    title: "1. 適用",
    body: [
      "この利用規約は、Koelogs が提供するボイストレーニング記録・分析サービスの利用条件を定めるものです。",
      "Koelogs を利用した時点で、本規約に同意したものとして取り扱います。",
    ],
  },
  {
    title: "2. 提供内容",
    body: [
      "Koelogs では、練習ログの記録、測定結果の保存、分析表示、AIによる提案補助、コミュニティ投稿などの機能を提供します。",
      "本サービスは、練習の振り返りや継続を補助するためのものであり、歌唱力や身体的改善を保証するものではありません。",
    ],
  },
  {
    title: "3. アカウント",
    body: [
      "アカウント情報やログイン手段は、利用者自身の責任で管理してください。",
      "登録情報に虚偽がある場合や、運営上不適切と判断した場合には、利用停止またはアカウント削除を行うことがあります。",
    ],
  },
  {
    title: "4. 禁止事項",
    body: [
      "法令または公序良俗に反する行為",
      "第三者の権利または利益を侵害する行為",
      "不正アクセス、過度な自動送信、サービス運営を妨げる行為",
      "虚偽情報の投稿、なりすまし、迷惑行為",
      "コミュニティ機能における誹謗中傷、ハラスメント、営業・勧誘行為",
    ],
    list: true,
  },
  {
    title: "5. 投稿コンテンツ",
    body: [
      "投稿内容について必要な権利を持っていることは、利用者自身が確認してください。",
      "公開設定されたコミュニティ投稿は、他の利用者から閲覧されるほか、サービス内の AI 提案の補助根拠として使われる場合があります。",
    ],
  },
  {
    title: "6. AI機能",
    body: [
      "AI機能は、練習内容の整理や提案補助のための参考情報を返すものであり、専門家による指導や医療的判断に代わるものではありません。",
      "AIの出力内容は、利用者自身の判断で活用してください。",
    ],
  },
  {
    title: "7. 料金とプラン",
    body: [
      "有料プランの料金、課金周期、解約条件は、サービス内の表示および特定商取引法に基づく表記に従います。",
      "課金、解約、支払い情報の変更は、外部決済サービスを通じて行われる場合があります。",
    ],
  },
  {
    title: "8. サービスの変更・停止",
    body: [
      "機能追加や改善のために、サービス内容を変更することがあります。",
      "保守、障害対応、法令対応などやむを得ない事情がある場合には、事前の予告なく一時停止することがあります。",
    ],
  },
  {
    title: "9. 免責",
    body: [
      "運営は、本サービスの継続性、完全性、有用性を保証するものではありません。",
      "利用者間または第三者との間で生じたトラブルについて、運営に故意または重過失がある場合を除き、責任を負いません。",
    ],
  },
  {
    title: "10. 規約変更",
    body: [
      "必要に応じて、本規約の内容を変更することがあります。",
      "重要な変更がある場合は、サービス内または適切な方法でお知らせします。",
    ],
  },
];

export default function HelpTermsPage() {
  return (
    <div className="page helpPage legalPage">
      <section className="helpPage__hero legalPage__hero">
        <div className="helpPage__sectionHead">
          <div className="helpPage__kicker">TERMS</div>
        </div>
        <h1 className="helpPage__title">利用規約</h1>
        <p className="helpPage__sub">
          Koelogs を使うときの基本ルールを、個人開発サービスとしての実態に合わせてまとめています。
        </p>
      </section>

      <section className="legalPage__toc">
        <div className="legalPage__tocTitle">関連ページ</div>
        <div className="legalPage__linkRow">
          <Link to="/help/privacy" className="legalPage__linkChip">プライバシーポリシー</Link>
          <Link to="/help/legal" className="legalPage__linkChip">特商法表記</Link>
          <Link to="/help/contact" className="legalPage__linkChip">お問い合わせ</Link>
        </div>
      </section>

      <section className="legalPage__content">
        {TERMS_SECTIONS.map((section) => (
          <section key={section.title} className="legalPage__section">
            <h2 className="legalPage__sectionTitle">{section.title}</h2>
            {section.list ? (
              <ul className="helpPage__list legalPage__list">
                {section.body.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <div className="legalPage__paragraphs">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="legalPage__paragraph">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </section>
        ))}
      </section>
    </div>
  );
}
