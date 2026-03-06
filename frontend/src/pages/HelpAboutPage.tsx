import type { MouseEvent } from "react";
import "./HelpPages.css";

type AboutSectionId =
  | "ai_recommendation"
  | "ai_data"
  | "audio_data"
  | "collective_knowledge"
  | "recording_eval"
  | "ai_prompt"
  | "insights_colors";

type AboutSection = {
  id: AboutSectionId;
  label: string;
  title: string;
  shortDescription: string;
};

const ABOUT_SECTIONS: AboutSection[] = [
  {
    id: "ai_recommendation",
    label: "1. AIおすすめについて",
    title: "1. AIおすすめについて",
    shortDescription:
      "現状高解像度・症状連動推薦 v1 では、今週テーマと現在の声の状態に合わせて根拠付きで提案します。"
  },
  {
    id: "ai_data",
    label: "2. AIが参照するデータ",
    title: "2. AIが参照するデータ",
    shortDescription: "AIおすすめの生成で、どの情報をどの順で使うかを説明する項目です。"
  },
  {
    id: "audio_data",
    label: "3. 音源データ",
    title: "3. 音源データ",
    shortDescription: "トレーニング音源の種類、使い分け、管理方針を説明する項目です。"
  },
  {
    id: "collective_knowledge",
    label: "4. 集合知の集め方",
    title: "4. 集合知の集め方",
    shortDescription: "コミュニティ投稿がどのようにAI補助根拠として使われるかを説明する項目です。"
  },
  {
    id: "recording_eval",
    label: "5. 録音評価ロジック",
    title: "5. 録音評価ロジック",
    shortDescription: "測定結果の扱いと、評価の考え方を説明する項目です。"
  },
  {
    id: "ai_prompt",
    label: "6. AIプロンプト",
    title: "6. AIプロンプト",
    shortDescription: "AIへどんな指示を出しているか、公開可能な範囲で説明する項目です。"
  },
  {
    id: "insights_colors",
    label: "7. 練習時間の色分け",
    title: "7. 練習時間の色分け",
    shortDescription: "Insightsの可視化で使う色分けルールを説明する項目です。"
  }
];

export default function HelpAboutPage() {
  const handleTocClick = (event: MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    event.preventDefault();
    const target = document.getElementById(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${sectionId}`);
  };

  return (
    <div className="page helpPage">
      <div className="helpPage__bg" aria-hidden="true" />

      <section className="card helpPage__hero">
        <div className="helpPage__kicker">About</div>
        <h1 className="helpPage__title">このアプリについて</h1>
        <p className="helpPage__sub">
          仕組みを透明にするため、AIおすすめの生成方法を公開しています。今後、他の仕組みも順次公開します。
        </p>
      </section>

      <section className="card helpPage__card">
        <div className="helpAbout__toc" role="tablist" aria-label="このアプリについての目次">
          {ABOUT_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#about-${section.id}`}
              className="helpAbout__tocLink"
              onClick={(event) => handleTocClick(event, `about-${section.id}`)}
            >
              {section.label}
            </a>
          ))}
        </div>
      </section>

      {ABOUT_SECTIONS.map((section) => (
        <section key={section.id} className="card helpPage__card helpAbout__contentCard helpAbout__section" id={`about-${section.id}`}>
          <h2 className="helpAbout__sectionTitle">{section.title}</h2>
          <p className="helpAbout__lead">{section.shortDescription}</p>
          <h3 className="helpAbout__subTitle">短版（1分で読める）</h3>
          {section.id === "ai_recommendation" ? (
            <>
              <p className="helpAbout__paragraph">
                AIおすすめは、まず「今の声の状況」を高解像度で診断し、その結果に合う練習を根拠付きで探す二層方式です。
                同じタグだから同じ提案、ではなく、今週テーマと現在状態の一致を優先して提案します。
              </p>
              <ul className="helpPage__list">
                <li>診断レイヤー: 日ログ / ボイトレメモリ / 目標 / 今週テーマ / 改善タグ / 必要時のみ測定を使い、現状を整理</li>
                <li>根拠探索レイヤー: コミュニティ自由記述との一致を優先し、不足分はWebで補完</li>
                <li>最終表示: 今週のテーマ / テーマに関しての現状 / 今週のメニュー（やり方・なぜ有効か・根拠）</li>
              </ul>

              <details className="helpAbout__details">
                <summary className="helpAbout__detailsSummary">詳細版（仕様説明）を開く</summary>
                <div className="helpAbout__detailsBody">
                  <h4 className="helpAbout__miniTitle">1. 診断レイヤー（現状高解像度）</h4>
                  <p className="helpAbout__paragraph">
                    先にメニューを選ばず、まず現在状態を作ります。内部では5スロット（発生帯域 / 課題タイプ /
                    成功条件 / 破綻条件 / 今回の狙い）を組み立てますが、画面表示は固定フォーマットにせず、
                    テーマに関する現状を自然な文章で出力します。
                  </p>

                  <h4 className="helpAbout__miniTitle">2. テーマによるコミュニティ参照ON/OFF</h4>
                  <p className="helpAbout__paragraph">
                    今週テーマに、対象キーワード（例: 地声 / 裏声 / ミドル・ミックス / 声帯閉鎖 / 音域 / 音程 / 音量 /
                    ロングトーン / 力み / 疲れ / ブレス / 息）が含まれる場合のみコミュニティを参照します。
                    テーマ語がなければコミュニティ参照はOFFで、Web中心に探索します。
                  </p>

                  <h4 className="helpAbout__miniTitle">3. 根拠探索レイヤー（一致判定）</h4>
                  <p className="helpAbout__paragraph">
                    一致判定はメニュー名一致ではなく、コミュニティの自由記述と、診断レイヤーで作った現在状態の一致で判定します。
                    音域は近傍一致（例: F#4なら±2半音）を許容し、症状や狙いの一致を重視します。
                  </p>

                  <h4 className="helpAbout__miniTitle">4. 件数ルールと補完順</h4>
                  <ul className="helpPage__list">
                    <li>強一致が1件以上あれば、そのメニューは強い根拠として採用</li>
                    <li>一致が3件を超える場合は、上位3件のみ採用</li>
                    <li>一致が3件未満（0件含む）の場合は不足分を補完</li>
                  </ul>
                  <p className="helpAbout__paragraph">
                    補完順は「同タグ次点コミュニティ → 一致0件時のみ個人ログ実績 → Web」です。Web補完は必要時のみ実行します。
                  </p>

                  <h4 className="helpAbout__miniTitle">5. 同一メニュー統合</h4>
                  <p className="helpAbout__paragraph">
                    同じメニューが複数一致した場合は重複表示せず1枠に統合します。差分は
                    「やり方A（目的）/ やり方B（目的）」として1枠内に併記します。
                  </p>

                  <h4 className="helpAbout__miniTitle">6. 最終出力の構成</h4>
                  <ul className="helpPage__list">
                    <li>1) 今週のテーマ</li>
                    <li>2) テーマに関しての現状</li>
                    <li>3) 今週のおすすめメニュー</li>
                  </ul>
                  <p className="helpAbout__paragraph">
                    3) の各メニューでは「やり方」「なぜ有効か」「根拠」を分けて表示し、根拠がWebを含む場合はWeb出典URLも表示します。
                  </p>

                  <h4 className="helpAbout__miniTitle">7. 根拠表示ルール</h4>
                  <p className="helpAbout__paragraph">
                    根拠は検証可能な形式で表示します。コミュニティ一致があるメニューは
                    「根拠: 両方（コミュニティN件 + Web）」または「根拠: コミュニティN件」を表示し、
                    強一致時は「コミュニティ原文: 「...」」を併記します。一致がないメニューにはコミュニティ根拠を付けません。
                  </p>

                  <h4 className="helpAbout__miniTitle">8. 文章品質ルール</h4>
                  <ul className="helpPage__list">
                    <li>Markdown記号（* など）を混ぜない</li>
                    <li>抽象的な説明だけで終わらせない</li>
                    <li>「なぜ有効か」をメニューごとに変える</li>
                    <li>同じ文の使い回しを減らす</li>
                    <li>「やり方」「なぜ有効か」「失敗時（ある場合）」を読みやすく分ける</li>
                  </ul>

                  <h4 className="helpAbout__miniTitle">9. この方式の狙い</h4>
                  <p className="helpAbout__paragraph">
                    従来の「タグ主導で同じ提案が続く」問題に対して、現状高解像度診断と症状連動一致を導入し、
                    同じカテゴリ内でも今の状態に合う理由が違えば提案内容が変わるようにしています。
                  </p>
                  <div className="helpAbout__evidenceExample" aria-label="根拠表示の例">
                    <p className="helpAbout__exampleLine">根拠: 両方（コミュニティ + Web）</p>
                    <p className="helpAbout__exampleLine">コミュニティ原文: 「F#4付近でやると、換声点のつながりがきれいになる。」</p>
                  </div>
                </div>
              </details>
            </>
          ) : (
            <>
              <p className="helpAbout__paragraph">{section.shortDescription}</p>
              <details className="helpAbout__details">
                <summary className="helpAbout__detailsSummary">詳細版（仕様説明）を開く</summary>
                <div className="helpAbout__detailsBody">
                  <p className="helpAbout__paragraph">この項目は準備中です。内容が固まり次第、順次公開します。</p>
                </div>
              </details>
            </>
          )}
        </section>
      ))}
    </div>
  );
}
