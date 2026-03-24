import { Link } from "react-router-dom";
import "./HelpPages.css";

type PrivacySection = {
  title: string;
  body: readonly string[];
  list?: boolean;
};

const PRIVACY_SECTIONS: readonly PrivacySection[] = [
  {
    title: "1. 取得する情報",
    body: [
      "アカウント登録時のメールアドレス、表示名、認証に必要な情報",
      "練習ログ、測定結果、目標、AI設定、プロフィール設定などの利用データ",
      "コミュニティ投稿、お気に入り、コメントなどの公開・準公開データ",
      "お問い合わせ時に入力された内容",
    ],
    list: true,
  },
  {
    title: "2. 利用目的",
    body: [
      "本サービスの提供、本人確認、サポート対応のため",
      "練習の記録、測定結果の保存、分析表示、AI提案機能の提供のため",
      "有料プランの管理、決済連携、利用状況確認のため",
      "不正利用防止、障害調査、品質改善のため",
    ],
    list: true,
  },
  {
    title: "3. AI機能での利用",
    body: [
      "AIおすすめやAIチャットでは、利用者のログ、測定結果、目標、AI設定、コミュニティ投稿などを参照する場合があります。",
      "AI機能は提案補助を目的としており、保存されるのは主に会話内容、生成結果、文脈スナップショットなどです。",
    ],
  },
  {
    title: "4. 録音データの取り扱い",
    body: [
      "TrainingPage の測定では、録音音声そのものは保存しません。",
      "保存するのは音域、秒数、音量安定性、音程精度などの測定結果の数値です。",
    ],
  },
  {
    title: "5. コミュニティ投稿",
    body: [
      "コミュニティ機能で公開設定された投稿は、他の利用者から閲覧されます。",
      "公開投稿は、サービス内の集合知表示や AI 提案の補助根拠として使われる場合があります。",
    ],
  },
  {
    title: "6. 第三者提供",
    body: [
      "法令に基づく場合を除き、本人の同意なく個人情報を第三者へ提供しません。",
      "ただし、決済、認証、メール送信などの外部サービスを利用する範囲で、必要な情報を取り扱うことがあります。",
    ],
  },
  {
    title: "7. 保存期間と削除",
    body: [
      "アカウントに紐づくデータは、サービス運営上必要な期間保存されます。",
      "削除や利用停止を希望する場合は、お問い合わせ窓口から連絡してください。法令または運営上保持が必要な情報を除き、対応を検討します。",
    ],
  },
  {
    title: "8. 安全管理",
    body: [
      "アクセス制御、認証、レート制限、セキュリティヘッダなどの対策を継続的に見直します。",
      "ただし、インターネット上の送受信や保存に絶対的な安全性を保証するものではありません。",
    ],
  },
  {
    title: "9. お問い合わせ",
    body: [
      "個人情報の取り扱いに関する問い合わせは、お問い合わせページから受け付けます。",
    ],
  },
];

export default function HelpPrivacyPage() {
  return (
    <div className="page helpPage legalPage">
      <section className="helpPage__hero legalPage__hero">
        <div className="helpPage__sectionHead">
          <div className="helpPage__kicker">PRIVACY</div>
        </div>
        <h1 className="helpPage__title">プライバシーポリシー</h1>
        <p className="helpPage__sub">
          Koelogs が扱うデータを、記録・測定・AI・コミュニティの実装に合わせて整理しています。
        </p>
      </section>

      <section className="legalPage__toc">
        <div className="legalPage__tocTitle">関連ページ</div>
        <div className="legalPage__linkRow">
          <Link to="/help/terms" className="legalPage__linkChip">利用規約</Link>
          <Link to="/help/legal" className="legalPage__linkChip">特商法表記</Link>
          <Link to="/help/contact" className="legalPage__linkChip">お問い合わせ</Link>
        </div>
      </section>

      <section className="legalPage__content">
        {PRIVACY_SECTIONS.map((section) => (
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
