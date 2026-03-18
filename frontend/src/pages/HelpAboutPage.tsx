import type { MouseEvent } from "react";
import aboutAiSystemIcon from "../assets/help/about-ai-system-icon.svg";
import aboutAppDataIcon from "../assets/help/about-app-data-icon.svg";
import aboutCommunityIcon from "../assets/help/about-community-icon.svg";
import InfoModal from "../components/InfoModal";
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
  title: string;
  iconSrc: string;
  shortDescription: string;
};

type AboutGroup = {
  id: string;
  englishLabel: string;
  title: string;
  iconSrc: string;
  sectionIds: AboutSectionId[];
};

type DetailItem = {
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
};

type DetailSummaryPoint = {
  title: string;
  body: string;
};

const ABOUT_SECTIONS: AboutSection[] = [
  {
    id: "ai_recommendation",
    title: "AIおすすめについて",
    iconSrc: aboutAiSystemIcon,
    shortDescription:
      "AIおすすめは、今週テーマと現在の声の状態に合わせて、理由が分かる形で提案します。"
  },
  {
    id: "ai_data",
    title: "AIが参照するデータ",
    iconSrc: aboutAiSystemIcon,
    shortDescription: "AIおすすめの生成で、どの情報をどの順で使うかを説明する項目です。"
  },
  {
    id: "audio_data",
    title: "音源データ",
    iconSrc: aboutAppDataIcon,
    shortDescription: "トレーニング音源の種類、使い分け、管理方針を説明する項目です。"
  },
  {
    id: "collective_knowledge",
    title: "集合知の集め方",
    iconSrc: aboutCommunityIcon,
    shortDescription: "コミュニティ投稿がどのようにAI補助根拠として使われるかを説明する項目です。"
  },
  {
    id: "recording_eval",
    title: "録音評価ロジック",
    iconSrc: aboutAppDataIcon,
    shortDescription: "測定結果の扱いと、評価の考え方を説明する項目です。"
  },
  {
    id: "ai_prompt",
    title: "AIプロンプト",
    iconSrc: aboutAiSystemIcon,
    shortDescription: "AIへどんな指示を出しているか、公開可能な範囲で説明する項目です。"
  },
  {
    id: "insights_colors",
    title: "練習時間の色分け",
    iconSrc: aboutAppDataIcon,
    shortDescription: "Insightsの可視化で使う色分けルールを説明する項目です。"
  }
];

const ABOUT_GROUPS: AboutGroup[] = [
  {
    id: "ai-system",
    englishLabel: "AI SYSTEM",
    title: "AIの仕組み",
    iconSrc: aboutAiSystemIcon,
    sectionIds: ["ai_recommendation", "ai_data", "ai_prompt"],
  },
  {
    id: "app-data",
    englishLabel: "APP DATA",
    title: "アプリ内データと評価",
    iconSrc: aboutAppDataIcon,
    sectionIds: ["audio_data", "recording_eval", "insights_colors"],
  },
  {
    id: "community",
    englishLabel: "COMMUNITY",
    title: "コミュニティ活用",
    iconSrc: aboutCommunityIcon,
    sectionIds: ["collective_knowledge"],
  },
];

const AI_DETAIL_ITEMS: DetailItem[] = [
  {
    eyebrow: "診断",
    title: "診断レイヤー",
    body:
      "先にメニューを選ばず、まず現在状態を作ります。内部では発声帯域・課題タイプ・成功条件・破綻条件・今回の狙いを整理し、画面では自然な文章として出力します。"
  },
  {
    eyebrow: "参照条件",
    title: "テーマによるコミュニティ参照",
    body:
      "今週テーマに地声・裏声・ミドル・音域・音程・音量・ロングトーンなどの対象語が含まれる場合のみ、コミュニティを参照します。テーマ語がなければ Web 中心に探索します。"
  },
  {
    eyebrow: "一致判定",
    title: "一致判定",
    body:
      "一致判定はメニュー名ではなく、コミュニティの自由記述と現在状態の一致で判定します。音域は近傍一致を許容しつつ、症状や狙いの一致を優先します。"
  },
  {
    eyebrow: "採用ルール",
    title: "件数ルールと補完順",
    body:
      "一致件数に応じて採用数を調整し、不足分だけ補完します。Web 補完は必要なときだけ実行します。",
    bullets: [
      "強一致が 1 件以上あれば、そのメニューは強い根拠として採用",
      "一致が 3 件を超える場合は上位 3 件のみ採用",
      "一致が 3 件未満の場合は不足分を補完"
    ]
  },
  {
    eyebrow: "統合表示",
    title: "同一メニュー統合",
    body:
      "同じメニューが複数一致した場合は重複表示せず 1 枠に統合し、やり方の差分だけを 1 枠内で整理して表示します。"
  },
  {
    eyebrow: "出力構成",
    title: "最終出力",
    body:
      "最終表示は、今週のテーマ・テーマに関する現状・今週のおすすめメニューの 3 段で構成します。各メニューでは、やり方・なぜ有効か・根拠を分けて表示します。"
  },
  {
    eyebrow: "根拠表示",
    title: "根拠表示ルール",
    body:
      "コミュニティ一致があるメニューだけに、コミュニティ件数や原文を付けます。一致がないメニューにはコミュニティ根拠を付けません。"
  },
  {
    eyebrow: "文章品質",
    title: "文章品質ルール",
    body:
      "Markdown 記号を混ぜず、抽象説明だけで終わらせないことを重視しています。同じ文の使い回しを減らし、やり方・なぜ有効か・失敗時を読み分けやすくします。"
  },
  {
    eyebrow: "設計意図",
    title: "この方式の狙い",
    body:
      "タグだけで同じ提案が続く問題を避け、今の状態に合う理由が違えば提案内容も変わるようにしています。"
  }
];

const AI_DETAIL_SUMMARY: DetailSummaryPoint[] = [
  {
    title: "状態を先に作る",
    body: "今週テーマと現在状態を先に整理してから、提案内容を組み立てます。"
  },
  {
    title: "一致で根拠を選ぶ",
    body: "コミュニティ自由記述や必要時の Web 情報から、今の状態に合う根拠だけを拾います。"
  },
  {
    title: "理由付きで返す",
    body: "おすすめメニューは、やり方・有効な理由・根拠が分かる形で表示します。"
  }
];

const AI_DATA_DETAIL_ITEMS: DetailItem[] = [
  {
    eyebrow: "優先順位",
    title: "使う順序",
    body:
      "AIおすすめでは、カスタム指示・目標・改善したい項目・個人ログ・集合知の順に参照し、主根拠と補助根拠を分けて扱います。"
  },
  {
    eyebrow: "個人データ",
    title: "個人ログの使い方",
    body:
      "練習時間・メニュー・メモなどの個人ログを主な根拠として使います。とくに直近14日の記録を重視して、今の状態に合う提案を行います。"
  },
  {
    eyebrow: "補助根拠",
    title: "集合知と Web の使い方",
    body:
      "コミュニティ投稿は補助根拠として使い、必要なときだけ Web 情報で補完します。どちらも主役ではなく、個人ログの補助として扱います。"
  },
  {
    eyebrow: "測定連携",
    title: "測定データを使う条件",
    body:
      "録音測定の結果は常時使うのではなく、改善タグ・目標・直近メモに測定関連の示唆がある場合だけ参照します。"
  },
  {
    eyebrow: "保存方針",
    title: "保存される情報",
    body:
      "生成結果だけでなく、生成時に参照した文脈やモデル情報も保存し、あとから推薦の根拠を追えるようにしています。"
  }
];

const AI_DATA_DETAIL_SUMMARY: DetailSummaryPoint[] = [
  {
    title: "個人ログが主役",
    body: "まず自分の記録を主根拠として使い、その上で補助情報を重ねます。"
  },
  {
    title: "補助根拠は必要時のみ",
    body: "集合知や Web 情報は、個人ログだけでは補えない部分だけに使います。"
  },
  {
    title: "測定は条件付き参照",
    body: "測定結果は常時参照せず、改善タグや目標との関連がある場合だけ使います。"
  }
];

const AI_PROMPT_DETAIL_ITEMS: DetailItem[] = [
  {
    eyebrow: "優先順位",
    title: "カスタム指示の扱い",
    body:
      "ユーザーが設定した ai_custom_instructions は、回答スタイル要求として最優先で反映します。まずこの指示を読み、その不足分だけを他の設定で補います。"
  },
  {
    eyebrow: "補助設定",
    title: "回答スタイル設定の扱い",
    body:
      "ai_response_style_prefs に保存された回答スタイル設定は、カスタム指示で不足する部分を補助するために使います。トーン・温度感・勢い・絵文字使用などを構造化して渡します。"
  },
  {
    eyebrow: "文脈",
    title: "プロンプトへ入る情報",
    body:
      "プロンプトには、カスタム指示・ボイトレメモリ・目標・改善したい項目・診断レイヤー・根拠探索レイヤーなどを優先順位つきで渡します。"
  },
  {
    eyebrow: "保存",
    title: "バージョン情報の保存",
    body:
      "生成後のデータには、prompt_version や thread 側の system_prompt_version / user_prompt_version を保存し、どの指示系で生成されたかを追えるようにしています。"
  }
];

const AI_PROMPT_DETAIL_SUMMARY: DetailSummaryPoint[] = [
  {
    title: "カスタム指示が最優先",
    body: "まずユーザーのカスタム指示を読み、回答スタイル要求として最優先で反映します。"
  },
  {
    title: "構造化設定は補助",
    body: "回答スタイル設定は、カスタム指示で足りない部分だけを補う用途で使います。"
  },
  {
    title: "バージョンを保存する",
    body: "どの prompt version で生成したかを保存し、後から追えるようにしています。"
  }
];

const RECORDING_EVAL_DETAIL_ITEMS: DetailItem[] = [
  {
    eyebrow: "測定種別",
    title: "保存している指標",
    body:
      "測定は range / long_tone / volume_stability / pitch_accuracy の4種に分かれ、それぞれ専用の result テーブルへ保存します。"
  },
  {
    eyebrow: "保存条件",
    title: "保存前のガード",
    body:
      "TrainingPage では、検出不足のまま保存しないように事前ガードを入れています。必要な値がそろわない場合は API 呼び出し自体を行いません。"
  },
  {
    eyebrow: "正規化",
    title: "保存時の補正",
    body:
      "API 側では、音域の octave 換算や音量安定性の ratio / pct 補完、pitch_accuracy の score clamp などを行い、保存形式をそろえています。"
  },
  {
    eyebrow: "表示連携",
    title: "Insights へ出す条件",
    body:
      "measurement_run には include_in_insights を持たせ、Insights 側に出すかどうかを切り替えられるようにしています。latest API でも true のものだけを参照します。"
  },
  {
    eyebrow: "非保存",
    title: "保存しないもの",
    body:
      "録音ファイルそのものは保存しません。保存するのは測定結果の数値と補助情報だけで、録音データ自体は残さない設計です。"
  }
];

const RECORDING_EVAL_DETAIL_SUMMARY: DetailSummaryPoint[] = [
  {
    title: "4種の測定に分かれる",
    body: "音域・ロングトーン・音量安定性・音程精度の4種を別々の結果として保存します。"
  },
  {
    title: "保存前に不足を弾く",
    body: "必要な値が取れていない場合は、そのまま保存せず UI 側で止めます。"
  },
  {
    title: "数値だけを保存する",
    body: "録音音声は残さず、結果の数値と表示用の補助情報だけを保存します。"
  }
];

const AUDIO_DETAIL_ITEMS: DetailItem[] = [
  {
    eyebrow: "管理単位",
    title: "管理している音源",
    body:
      "現在の音源は 5tone / triad / Descending5tone / octave / Risingoctave を管理しています。各音源は low / mid / high の range_type ごとに分かれています。"
  },
  {
    eyebrow: "選択UI",
    title: "ユーザーが選ぶ項目",
    body:
      "TrainingPage ではテンポ選択は廃止しています。ユーザーが選ぶのはスケール種別と音域帯だけで、再生時はその組み合わせに対応する固定音源を使います。"
  },
  {
    eyebrow: "ファイル構成",
    title: "ファイル配置ルール",
    body:
      "音源ファイルは public/scales/{scale_type}-{range_type}.mp3 の命名で管理しています。例として 5tone-low.mp3 や triad-mid.mp3、octave-high.mp3 のような形式です。"
  },
  {
    eyebrow: "測定用音源",
    title: "音程精度測定のガイド音",
    body:
      "pitch_accuracy では通常の音源選択とは別に、pitch_accuracy-low / mid / high の固定ガイド音源を再生します。録音開始と同時に参照バーとガイド音を使って測定します。"
  }
];

const AUDIO_DETAIL_SUMMARY: DetailSummaryPoint[] = [
  {
    title: "固定音源を使う",
    body: "音源は scale_type と range_type の組み合わせごとに固定ファイルを再生します。"
  },
  {
    title: "選択は最小限",
    body: "TrainingPage ではテンポを選ばず、スケール種別と音域帯だけを選びます。"
  },
  {
    title: "測定用ガイドも分離",
    body: "pitch_accuracy では通常音源とは別の固定ガイド音源を使って測定します。"
  }
];

const INSIGHTS_COLORS_DETAIL_ITEMS: DetailItem[] = [
  {
    eyebrow: "表示単位",
    title: "日ごとの練習時間を 5 段階で表示",
    body:
      "ヒートマップでは、その日の練習時間を level-0 から level-4 の 5 段階に分けて表示します。練習時間が 0 分なら level-0 です。"
  },
  {
    eyebrow: "判定基準",
    title: "最大値に対する比率で色を決める",
    body:
      "色の強さは固定分数ではなく、表示期間内の最大練習時間に対する比率で決めます。期間ごとの相対比較なので、同じ 20 分でも期間内の最大値によって色段階は変わります。",
    bullets: [
      "ratio 0.75 以上: level-4",
      "ratio 0.5 以上: level-3",
      "ratio 0.25 以上: level-2",
      "それ未満で 0 分超: level-1"
    ]
  },
  {
    eyebrow: "light",
    title: "ライトモードの配色",
    body:
      "ライトモードでは、薄い青から濃い青へ段階的に強くなる配色を使います。0 分はごく薄い面で、値が大きいほど彩度とコントラストを上げています。"
  },
  {
    eyebrow: "dark",
    title: "ダークモードの配色",
    body:
      "ダークモードでは、暗い背景の中でも段階差が見えるように、低段階は沈めつつ高段階だけ明るくしています。可読性を優先して light とは別配色で調整しています。"
  },
  {
    eyebrow: "当日表示",
    title: "今日の日付だけ枠線を追加",
    body:
      "当日セルには色段階とは別に outline を付け、練習量とは独立して『今日』が分かるようにしています。"
  },
  {
    eyebrow: "補助表示",
    title: "ツールチップと凡例",
    body:
      "各セルには ISO 日付と分数をツールチップで表示し、下部には level-0 から level-4 の凡例を置いています。凡例ラベルは『少 / 多』です。"
  }
];

const INSIGHTS_COLORS_DETAIL_SUMMARY: DetailSummaryPoint[] = [
  {
    title: "5 段階で表示する",
    body: "練習時間は level-0 から level-4 の 5 段階に分けて色で表示します。"
  },
  {
    title: "最大値との比率で決まる",
    body: "色段階は絶対値ではなく、表示期間内の最大練習時間に対する比率で決めています。"
  },
  {
    title: "今日だけ枠線で強調する",
    body: "当日のセルは色とは別に outline を付け、現在位置が分かるようにしています。"
  }
];

const COLLECTIVE_KNOWLEDGE_DETAIL_ITEMS: DetailItem[] = [
  {
    eyebrow: "元データ",
    title: "公開投稿だけを対象に集計",
    body:
      "集合知の元データには community_posts の公開投稿だけを使います。AI 補助根拠として使うのは published=true の投稿だけです。"
  },
  {
    eyebrow: "集計範囲",
    title: "直近 90 日を対象にする",
    body:
      "集計対象は直近 90 日の投稿です。古い投稿をそのまま引きずらず、最近の投稿傾向が反映されるようにしています。"
  },
  {
    eyebrow: "集計単位",
    title: "改善タグ × canonical_key でまとめる",
    body:
      "投稿はそのまま全文検索せず、改善タグと canonical_key の組み合わせで集計します。unknown 系の canonical_key は集計対象から外します。"
  },
  {
    eyebrow: "採用条件",
    title: "件数が少ないものは外す",
    body:
      "タグごとの集計では、件数が min_count=3 未満のメニューは外します。偶然の 1 件だけで強い傾向に見えないようにするためです。"
  },
  {
    eyebrow: "出力内容",
    title: "AI へ渡す要約形式",
    body:
      "AI へは、生投稿をそのまま渡すのではなく、上位メニュー・上位スケール・自由記述サンプル・頻出語句・テンプレ項目別要点をまとめた要約として渡します。"
  },
  {
    eyebrow: "キャッシュ",
    title: "集計結果は 6 時間キャッシュ",
    body:
      "集合知サマリは Rails.cache に 6 時間保存します。キャッシュ取得に失敗しても、生成自体は止めず build を直接実行して継続します。"
  },
  {
    eyebrow: "表示ルール",
    title: "一致したときだけ根拠として表示",
    body:
      "AIおすすめ本文では、コミュニティ一致があったメニューだけにコミュニティ由来の根拠文を付けます。一致しない内容には付けません。"
  }
];

const COLLECTIVE_KNOWLEDGE_DETAIL_SUMMARY: DetailSummaryPoint[] = [
  {
    title: "公開投稿だけを使う",
    body: "集合知の元データに使うのは、公開されているコミュニティ投稿だけです。"
  },
  {
    title: "タグ × メニューで集計する",
    body: "改善タグと canonical_key の組み合わせで件数を集計し、傾向を要約します。"
  },
  {
    title: "一致した場合だけ根拠に出す",
    body: "AIおすすめ本文では、実際に一致したメニューだけにコミュニティ根拠を付けます。"
  }
];

const orderedSectionIds = ABOUT_GROUPS.flatMap((group) => group.sectionIds);
const sectionOrder = Object.fromEntries(orderedSectionIds.map((id, index) => [id, index + 1])) as Record<AboutSectionId, number>;
const sectionById = Object.fromEntries(ABOUT_SECTIONS.map((section) => [section.id, section])) as Record<AboutSectionId, AboutSection>;

function renderDetailModalContent(
  summaryTitle: string,
  summaryBody: string,
  summaryPoints: DetailSummaryPoint[],
  items: DetailItem[],
  example?: React.ReactNode
) {
  return (
    <div className="helpAbout__detailModal">
      <section className="helpAbout__detailModalIntro">
        <div className="helpAbout__detailModalEyebrow">仕様公開</div>
        <h3 className="helpAbout__detailModalTitle">{summaryTitle}</h3>
        <p className="helpAbout__detailModalLead">{summaryBody}</p>
      </section>

      <section className="helpAbout__detailModalSummary">
        <div className="helpAbout__detailModalSpecHead">
          <div className="helpAbout__detailModalEyebrow">要点</div>
          <h3 className="helpAbout__detailModalSectionTitle">先に把握しておく内容</h3>
        </div>
        <dl className="helpAbout__detailModalFacts">
          {summaryPoints.map((point) => (
            <div key={point.title} className="helpAbout__detailModalFact">
              <dt className="helpAbout__detailModalFactKey">{point.title}</dt>
              <dd className="helpAbout__detailModalFactValue">{point.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="helpAbout__detailModalSpec">
        <div className="helpAbout__detailModalSpecHead">
          <div className="helpAbout__detailModalEyebrow">仕様</div>
          <h3 className="helpAbout__detailModalSectionTitle">仕様の内訳</h3>
        </div>
        <div className="helpAbout__detailModalList">
          {items.map((item) => (
            <article key={item.title} className="helpAbout__detailModalItem">
              <div className="helpAbout__detailModalItemBody">
                <div className="helpAbout__detailModalItemEyebrow">{item.eyebrow}</div>
                <h4 className="helpAbout__detailModalItemTitle">{item.title}</h4>
                <p className="helpAbout__detailModalItemText">{item.body}</p>
                {item.bullets?.length ? (
                  <ul className="helpAbout__detailModalBullets">
                    {item.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {example ? (
        <section className="helpAbout__detailModalExample">
          <div className="helpAbout__detailModalSpecHead">
            <div className="helpAbout__detailModalEyebrow">補足</div>
            <h3 className="helpAbout__detailModalSectionTitle">表示例</h3>
          </div>
          {example}
        </section>
      ) : null}
    </div>
  );
}

export default function HelpAboutPage() {
  const handleTocClick = (event: MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    event.preventDefault();
    const target = document.getElementById(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${sectionId}`);
  };

  const detailTriggerContent = (
    <>
      <span className="helpAbout__detailTrigger" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <circle cx="12" cy="12" r="8.5" />
          <text x="12" y="12.45" className="infoModal__triggerText" textAnchor="middle" dominantBaseline="middle">
            i
          </text>
        </svg>
      </span>
      <span className="helpAbout__detailLabel">詳細版（仕様説明）を見る</span>
    </>
  );

  return (
    <div className="page helpPage">
      <div className="helpPage__bg" aria-hidden="true" />

      <section className="helpPage__hero helpAbout__hero">
        <p className="helpPage__sub">
          このページでは、Koelogs がどのデータをどう使っているか、AIおすすめや音源・評価ロジックをどう設計しているかを公開します。
        </p>
        <div className="helpAbout__groupList" aria-label="このアプリについての目次">
          <div className="helpAbout__tocIntro">
            <h2 className="helpAbout__tocHeading">目次</h2>
            <p className="helpAbout__groupHint">項目をクリックすると該当箇所へ移動します。</p>
          </div>
          {ABOUT_GROUPS.map((group) => (
            <section key={group.id} className="helpAbout__group">
              <div className="helpAbout__groupHead">
                <img src={group.iconSrc} alt="" className="helpAbout__groupIcon" />
                <div className="helpAbout__groupEnglish">{group.englishLabel}</div>
              </div>
              <div className="helpAbout__tocTags" role="tablist" aria-label={group.title}>
                {group.sectionIds.map((sectionId) => {
                  const section = sectionById[sectionId];
                  const order = sectionOrder[section.id];
                  return (
                    <a
                      key={section.id}
                      href={`#about-${section.id}`}
                      className="helpAbout__tocTag"
                      onClick={(event) => handleTocClick(event, `about-${section.id}`)}
                    >
                      <span className="helpAbout__tocTagNumber">{order}.</span>
                      <span className="helpAbout__tocTagBody">
                        <span className="helpAbout__tocTagTitle">{section.title}</span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      {ABOUT_GROUPS.map((group, index) => (
        <div key={group.id} className={`helpAbout__band${index % 2 === 0 ? " helpAbout__band--tint" : ""}`}>
          <div className={`helpAbout__wave${index % 2 === 0 ? " is-tint" : ""}`} aria-hidden="true">
            <svg viewBox="0 0 100 16" preserveAspectRatio="none">
              <path d="M0 16V8C18 8 22 2 38 2C56 2 64 10 82 10C91 10 96 8 100 6V16Z" fill="currentColor" />
            </svg>
          </div>
          <div className={`helpAbout__inner${index % 2 === 0 ? " is-tint" : " is-white"}`}>
            <div className="helpAbout__contentCard">
              <div className="helpAbout__groupBodyHead">
                <img src={group.iconSrc} alt="" className="helpAbout__groupIcon" />
                <div className="helpAbout__groupEnglish">{group.englishLabel}</div>
              </div>
              {group.sectionIds.map((sectionId) => {
                const section = sectionById[sectionId];
                const order = sectionOrder[section.id];
                return (
                  <section key={section.id} className={`helpAbout__section${section.id === "ai_recommendation" ? " helpAbout__section--ai" : ""}`} id={`about-${section.id}`}>
                    <div className="helpAbout__sectionHeadBlock">
                      <div className="helpAbout__sectionMarkerRow">
                        <span className="helpAbout__sectionNumber">{order}</span>
                        <h2 className="helpAbout__sectionTitle">{section.title}</h2>
                      </div>
                      <p className="helpAbout__lead">{section.shortDescription}</p>
                    </div>
                    {section.id === "ai_recommendation" ? (
                      <div className="helpAbout__bodyStack">
                        <div className="helpAbout__aiOverview">
                          <h3 className="helpAbout__subTitle helpAbout__subTitle--overview">全体像</h3>
                          <div className="helpAbout__aiOverviewList">
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">診断レイヤー</div>
                              <div className="helpAbout__aiOverviewValue">日ログ / ボイトレメモリ / 目標 / 今週テーマ / 改善タグ / 必要時のみ測定を使い、現状を整理</div>
                            </div>
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">根拠探索レイヤー</div>
                              <div className="helpAbout__aiOverviewValue">コミュニティ自由記述との一致を優先し、不足分はWebで補完</div>
                            </div>
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">最終表示</div>
                              <div className="helpAbout__aiOverviewValue">今週のテーマ / テーマに関しての現状 / 今週のメニュー（やり方・なぜ有効か・根拠）</div>
                            </div>
                          </div>
                        </div>
                        <InfoModal
                          title="AIおすすめについての詳細"
                          triggerClassName="helpAbout__detailAction"
                          triggerAriaLabel="AIおすすめについての詳細版（仕様説明）を見る"
                          bodyClassName="helpAbout__detailModalBody"
                          triggerContent={detailTriggerContent}
                        >
                          {renderDetailModalContent(
                            "今の状態を先に整理し、その状態に合う練習を根拠付きで返す仕組みです。",
                            "この機能では、先に現在の状態を整理し、その結果に合う練習内容を根拠付きで返します。タグだけで同じ提案を返すのではなく、今週テーマと現在状態の一致を優先して提案を組み立てます。",
                            AI_DETAIL_SUMMARY,
                            AI_DETAIL_ITEMS,
                            <div className="helpAbout__detailModalExampleCard" aria-label="根拠表示の例">
                              <div className="helpAbout__detailModalExampleLabel">表示例</div>
                              <p className="helpAbout__exampleLine">根拠: 両方（コミュニティ + Web）</p>
                              <p className="helpAbout__exampleLine">コミュニティ原文: 「F#4付近でやると、換声点のつながりがきれいになる。」</p>
                            </div>
                          )}
                        </InfoModal>
                      </div>
                    ) : section.id === "ai_data" ? (
                      <div className="helpAbout__bodyStack">
                        <div className="helpAbout__aiOverview">
                          <h3 className="helpAbout__subTitle helpAbout__subTitle--overview">全体像</h3>
                          <div className="helpAbout__aiOverviewList">
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">主な根拠</div>
                              <div className="helpAbout__aiOverviewValue">個人ログの練習時間・メニュー・メモを、推薦生成の主な根拠として使います。</div>
                            </div>
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">補助的に使う情報</div>
                              <div className="helpAbout__aiOverviewValue">集合知・Web情報・測定結果は、必要な場合だけ補助根拠として重ねます。</div>
                            </div>
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">保存される情報</div>
                              <div className="helpAbout__aiOverviewValue">推薦文だけでなく、生成時の文脈や参照情報も保存し、後から追えるようにしています。</div>
                            </div>
                          </div>
                        </div>
                        <InfoModal
                          title="AIが参照するデータについての詳細"
                          triggerClassName="helpAbout__detailAction"
                          triggerAriaLabel="AIが参照するデータの詳細版（仕様説明）を見る"
                          bodyClassName="helpAbout__detailModalBody"
                          triggerContent={detailTriggerContent}
                        >
                          {renderDetailModalContent(
                            "AIおすすめでは、個人ログを主な根拠とし、集合知・Web・測定結果を条件付きで補助に使います。",
                            "どの情報も同じ重みで使うのではなく、主根拠と補助根拠を分けています。個人ログを中心に置き、必要な場合だけ集合知や Web、測定結果を重ねます。",
                            AI_DATA_DETAIL_SUMMARY,
                            AI_DATA_DETAIL_ITEMS
                          )}
                        </InfoModal>
                      </div>
                    ) : section.id === "ai_prompt" ? (
                      <div className="helpAbout__bodyStack">
                        <div className="helpAbout__aiOverview">
                          <h3 className="helpAbout__subTitle helpAbout__subTitle--overview">全体像</h3>
                          <div className="helpAbout__aiOverviewList">
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">最優先で使う設定</div>
                              <div className="helpAbout__aiOverviewValue">ユーザーのカスタム指示を、回答スタイル要求として最優先でプロンプトへ反映します。</div>
                            </div>
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">補助的に使う設定</div>
                              <div className="helpAbout__aiOverviewValue">構造化された回答スタイル設定は、カスタム指示で不足する部分だけを補います。</div>
                            </div>
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">保存される情報</div>
                              <div className="helpAbout__aiOverviewValue">生成時の prompt version や thread の prompt version を保存し、後から参照できます。</div>
                            </div>
                          </div>
                        </div>
                        <InfoModal
                          title="AIプロンプトについての詳細"
                          triggerClassName="helpAbout__detailAction"
                          triggerAriaLabel="AIプロンプトの詳細版（仕様説明）を見る"
                          bodyClassName="helpAbout__detailModalBody"
                          triggerContent={detailTriggerContent}
                        >
                          {renderDetailModalContent(
                            "AIプロンプトでは、まずユーザーのカスタム指示を読み、その不足分だけを構造化設定で補う方針を取っています。",
                            "どの情報も同じ重みで入れるのではなく、ユーザーが直接設定した指示を最優先にし、その上でスタイル設定や文脈情報を重ねています。",
                            AI_PROMPT_DETAIL_SUMMARY,
                            AI_PROMPT_DETAIL_ITEMS
                          )}
                        </InfoModal>
                      </div>
                    ) : section.id === "recording_eval" ? (
                      <div className="helpAbout__bodyStack">
                        <div className="helpAbout__aiOverview">
                          <h3 className="helpAbout__subTitle helpAbout__subTitle--overview">全体像</h3>
                          <div className="helpAbout__aiOverviewList">
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">測定の分かれ方</div>
                              <div className="helpAbout__aiOverviewValue">音域・ロングトーン・音量安定性・音程精度の4系統に分けて結果を保存します。</div>
                            </div>
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">保存前の判定</div>
                              <div className="helpAbout__aiOverviewValue">必要な値がそろわない場合は保存せず、検出不足として UI 側で止めます。</div>
                            </div>
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">残すデータ</div>
                              <div className="helpAbout__aiOverviewValue">録音ファイルは保存せず、測定結果の数値と表示用の補助情報だけを残します。</div>
                            </div>
                          </div>
                        </div>
                        <InfoModal
                          title="録音評価ロジックについての詳細"
                          triggerClassName="helpAbout__detailAction"
                          triggerAriaLabel="録音評価ロジックの詳細版（仕様説明）を見る"
                          bodyClassName="helpAbout__detailModalBody"
                          triggerContent={detailTriggerContent}
                        >
                          {renderDetailModalContent(
                            "録音評価は4種類の測定ごとに保存形式を分け、保存前ガードと API 側の正規化で結果を整える構成です。",
                            "測定値が取れたものだけを保存し、API 側で保存形式を整えたうえで Insights へ連携します。録音データそのものは残さず、評価結果の数値だけを扱います。",
                            RECORDING_EVAL_DETAIL_SUMMARY,
                            RECORDING_EVAL_DETAIL_ITEMS
                          )}
                        </InfoModal>
                      </div>
                    ) : section.id === "audio_data" ? (
                      <div className="helpAbout__bodyStack">
                        <div className="helpAbout__aiOverview">
                          <h3 className="helpAbout__subTitle helpAbout__subTitle--overview">全体像</h3>
                          <div className="helpAbout__aiOverviewList">
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">管理単位</div>
                              <div className="helpAbout__aiOverviewValue">音源は、scale_type と range_type の組み合わせごとに管理しています。</div>
                            </div>
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">選択方法</div>
                              <div className="helpAbout__aiOverviewValue">TrainingPage では、テンポは選ばず、スケール種別と Low / Mid / High を選んで使います。</div>
                            </div>
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">配信ファイル</div>
                              <div className="helpAbout__aiOverviewValue">再生する音源は、`/scales/{'{'}scale_type{'}'}-{'{'}range_type{'}'}.mp3` の命名で配信しています。</div>
                            </div>
                          </div>
                        </div>
                        <InfoModal
                          title="音源データについての詳細"
                          triggerClassName="helpAbout__detailAction"
                          triggerAriaLabel="音源データの詳細版（仕様説明）を見る"
                          bodyClassName="helpAbout__detailModalBody"
                          triggerContent={detailTriggerContent}
                        >
                          {renderDetailModalContent(
                            "音源はスケール種別と音域帯の組み合わせで管理し、固定ファイルを再生する構成です。",
                            "テンポは UI から選ばず、TrainingPage では scale_type と range_type の組み合わせだけを選びます。再生時は、その組み合わせに対応する固定音源を使用します。",
                            AUDIO_DETAIL_SUMMARY,
                            AUDIO_DETAIL_ITEMS
                          )}
                        </InfoModal>
                      </div>
                    ) : section.id === "insights_colors" ? (
                      <div className="helpAbout__bodyStack">
                        <div className="helpAbout__aiOverview">
                          <h3 className="helpAbout__subTitle helpAbout__subTitle--overview">全体像</h3>
                          <div className="helpAbout__aiOverviewList">
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">色分けの段階</div>
                              <div className="helpAbout__aiOverviewValue">練習時間は 0 を含む 5 段階に分けて、ヒートマップ上で色の濃さを変えています。</div>
                            </div>
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">判定の基準</div>
                              <div className="helpAbout__aiOverviewValue">色段階は固定分数ではなく、その期間内の最大練習時間に対する比率で決まります。</div>
                            </div>
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">今日の強調</div>
                              <div className="helpAbout__aiOverviewValue">当日のセルだけは枠線を追加し、練習量とは別に現在位置が分かるようにしています。</div>
                            </div>
                          </div>
                        </div>
                        <InfoModal
                          title="練習時間の色分けについての詳細"
                          triggerClassName="helpAbout__detailAction"
                          triggerAriaLabel="練習時間の色分けの詳細版（仕様説明）を見る"
                          bodyClassName="helpAbout__detailModalBody"
                          triggerContent={detailTriggerContent}
                        >
                          {renderDetailModalContent(
                            "Insights の練習時間ヒートマップでは、期間内の最大値に対する比率で色段階を決めています。",
                            "絶対分数で色を固定するのではなく、その期間の中でどれだけ練習したかが分かるように相対比率で段階を決めています。今日の日付は色段階とは別に枠線で強調します。",
                            INSIGHTS_COLORS_DETAIL_SUMMARY,
                            INSIGHTS_COLORS_DETAIL_ITEMS
                          )}
                        </InfoModal>
                      </div>
                    ) : section.id === "collective_knowledge" ? (
                      <div className="helpAbout__bodyStack">
                        <div className="helpAbout__aiOverview">
                          <h3 className="helpAbout__subTitle helpAbout__subTitle--overview">全体像</h3>
                          <div className="helpAbout__aiOverviewList">
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">元になる投稿</div>
                              <div className="helpAbout__aiOverviewValue">公開されているコミュニティ投稿だけを対象にして、改善タグごとの傾向をまとめます。</div>
                            </div>
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">集計の単位</div>
                              <div className="helpAbout__aiOverviewValue">改善タグと canonical_key の組み合わせで件数を集計し、少なすぎるデータは外します。</div>
                            </div>
                            <div className="helpAbout__aiOverviewRow">
                              <div className="helpAbout__aiOverviewKey">AI での使い方</div>
                              <div className="helpAbout__aiOverviewValue">AI には要約済みの傾向だけを補助根拠として渡し、一致したメニューにだけ根拠文を付けます。</div>
                            </div>
                          </div>
                        </div>
                        <InfoModal
                          title="集合知の集め方についての詳細"
                          triggerClassName="helpAbout__detailAction"
                          triggerAriaLabel="集合知の集め方の詳細版（仕様説明）を見る"
                          bodyClassName="helpAbout__detailModalBody"
                          triggerContent={detailTriggerContent}
                        >
                          {renderDetailModalContent(
                            "集合知は、公開投稿を改善タグ × メニュー単位で集計し、AI に補助根拠として渡す仕組みです。",
                            "生の投稿をそのまま AI に渡すのではなく、公開投稿を集計して傾向だけを要約します。件数が少ないものは外し、実際に一致したメニューだけにコミュニティ根拠を表示します。",
                            COLLECTIVE_KNOWLEDGE_DETAIL_SUMMARY,
                            COLLECTIVE_KNOWLEDGE_DETAIL_ITEMS
                          )}
                        </InfoModal>
                      </div>
                    ) : (
                      <div className="helpAbout__bodyStack">
                        <div className="helpAbout__introBlock">
                          <h3 className="helpAbout__subTitle">概要</h3>
                          <p className="helpAbout__paragraph">{section.shortDescription}</p>
                        </div>
                        <details className="helpAbout__details">
                          <summary className="helpAbout__detailsSummary">詳細版（仕様説明）を開く</summary>
                          <div className="helpAbout__detailsBody">
                            <p className="helpAbout__paragraph">この項目は準備中です。内容が固まり次第、順次公開します。</p>
                          </div>
                        </details>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
          <div className={`helpAbout__wave helpAbout__wave--bottom${index % 2 === 0 ? " is-tint" : ""}`} aria-hidden="true">
            <svg viewBox="0 0 100 16" preserveAspectRatio="none">
              <path d="M0 16V8C18 8 22 2 38 2C56 2 64 10 82 10C91 10 96 8 100 6V16Z" fill="currentColor" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
