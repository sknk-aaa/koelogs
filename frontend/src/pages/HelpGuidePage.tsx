import type { MouseEvent } from "react";
import { useState } from "react";
import "./HelpPages.css";
import "./HelpGuidePage.css";

type GuideScreen = {
  src: string;
  alt: string;
  label: string;
  required?: boolean;
};

type GuideStep = {
  id: string;
  title: string;
  description: string;
  points: string[];
  screen?: GuideScreen;
  note?: string;
};

type GuideGroup = {
  id: string;
  englishLabel: string;
  title: string;
  steps: GuideStep[];
};

const GUIDE_GROUPS: GuideGroup[] = [
  {
    id: "start",
    englishLabel: "START",
    title: "まず最初に使う流れ",
    steps: [
      {
        id: "guide-log-top",
        title: "ログトップで今日の状態を見る",
        description:
          "まずは /log を開き、その日の記録や目標、AIおすすめの位置を確認します。Koelogs はここを起点に使う前提です。",
        points: [
          "その日のログ状況を確認できます",
          "目標やAIおすすめの導線がここに集まっています",
          "ゲストでもサンプル表示で流れを把握できます"
        ],
        screen: {
          src: "/guide/log-top.png",
          alt: "ログトップのサマリー表示",
          label: "Log"
        }
      },
      {
        id: "guide-log-new",
        title: "記録入力で練習時間・メニュー・メモを残す",
        description:
          "/log/new では、その日の練習内容を記録します。まずは短いメモでも残しておくと、あとから振り返りやAI提案に使えます。",
        points: [
          "練習時間を残せます",
          "実施したメニューを記録できます",
          "短いメモでも次回の判断材料になります"
        ],
        screen: {
          src: "/guide/log-new.png",
          alt: "ログ入力画面",
          label: "Log New"
        },
      }
    ]
  },
  {
    id: "training",
    englishLabel: "TRAINING",
    title: "練習と測定の進め方",
    steps: [
      {
        id: "guide-training-player",
        title: "Trainingで音源を選んで練習する",
        description:
          "/training では、スケール種別と音域帯を選んで音源を再生できます。テンポではなく、練習の型と高さを選ぶ構成です。",
        points: [
          "音源再生と練習を1ページで進められます",
          "スケール種別と low / mid / high を選べます",
          "そのまま測定にも進めます"
        ],
        screen: {
          src: "/guide/training-player.png",
          alt: "Trainingページの音源選択と再生UI",
          label: "Training"
        }
      },
      {
        id: "guide-training-measure",
        title: "測定して、今の声の状態を確認する",
        description:
          "音域、ロングトーン、音量安定性、音程精度の測定を行えます。測定結果はそのまま Insights の振り返りに使われます。",
        points: [
          "測定中は専用の可視化UIが表示されます",
          "必要な値が取れない場合は保存前に止まります",
          "録音ファイル自体は保存しません"
        ],
        screen: {
          src: "/guide/training-measurement.png",
          alt: "Trainingページの測定パネル",
          label: "Measurement"
        }
      }
    ]
  },
  {
    id: "review",
    englishLabel: "REVIEW",
    title: "振り返りと補助機能",
    steps: [
      {
        id: "guide-insights-top",
        title: "Insightsで変化を振り返る",
        description:
          "/insights では、練習時間や測定記録をまとめて見返せます。続けた量と測定結果の変化を、同じ流れの中で確認できます。",
        points: [
          "ヒートマップで継続状況を見られます",
          "最新値や最高値をまとめて確認できます",
          "推移を見る入口として使えます"
        ],
        screen: {
          src: "/guide/insights-top.png",
          alt: "Insightsトップ画面",
          label: "Insights"
        }
      },
      {
        id: "guide-insights-detail",
        title: "詳細分析で履歴を深く見る",
        description:
          "分析詳細ページでは、日数を広げて推移や履歴を確認できます。短期の変化だけでなく、長い期間の傾向も追えます。",
        points: [
          "推移グラフを長い期間で見られます",
          "測定履歴をまとめて確認できます",
          "前回比や成長幅を読み取りやすくなります"
        ],
        screen: {
          src: "/guide/insights-detail.png",
          alt: "Insights詳細画面",
          label: "Detail"
        }
      },
      {
        id: "guide-community",
        title: "コミュニティで実践例を見る",
        description:
          "/community では、他の人の投稿を見ながら練習のヒントを得られます。投稿は AIおすすめの補助根拠にも使われます。",
        points: [
          "新着・タグ別・自分の投稿を切り替えられます",
          "参考になった投稿はお気に入りできます",
          "公開投稿はAI補助根拠として使われます"
        ],
        screen: {
          src: "/guide/community-posts.png",
          alt: "コミュニティ投稿一覧",
          label: "Community"
        }
      },
      {
        id: "guide-ai-settings",
        title: "AIカスタム指示で提案の方向を調整する",
        description:
          "/settings/ai では、改善したい項目や回答スタイル、長期プロフィールを設定できます。AIおすすめやAIチャットの前提をここで調整します。",
        points: [
          "改善したい項目を指定できます",
          "回答スタイルを調整できます",
          "長期プロフィールを保存できます"
        ],
        screen: {
          src: "/lp/ai-settings-pc.png",
          alt: "AIカスタム指示画面",
          label: "AI Settings"
        }
      }
    ]
  }
];

function GuideSectionIcon({ kind }: { kind: "start" | "training" | "review" }) {
  if (kind === "start") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 12.5 10 17l9-10" />
        <path className="accent" d="M5 6.5h14" />
      </svg>
    );
  }
  if (kind === "training") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 19V5" />
        <path d="M17 19V9" />
        <path className="accent" d="m7 10 5-3 5 3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 18.5h14" />
      <path d="M7.3 18.5v-5.2" />
      <path d="M12 18.5v-8.1" />
      <path d="M16.7 18.5v-11" />
      <path className="accent" d="m6.8 12.1 4-2.7 3.1 1.9 3.7-3" />
    </svg>
  );
}

function ScreenshotPreview({ screen }: { screen: GuideScreen }) {
  const [failed, setFailed] = useState(false);

  return (
    <figure className="helpGuidePage__screen" aria-label={screen.alt}>
      <div className="helpGuidePage__screenHead">
        <span className="helpGuidePage__screenPill">{screen.label}</span>
        {screen.required ? <span className="helpGuidePage__screenMeta">実スクショ推奨</span> : null}
      </div>
      {failed ? (
        <div className="helpGuidePage__screenFallback" role="img" aria-label={`${screen.alt} のプレースホルダー`}>
          <div className="helpGuidePage__screenFallbackTitle">Screenshot Placeholder</div>
          <div className="helpGuidePage__screenFallbackPath">{screen.src}</div>
        </div>
      ) : (
        <img
          className="helpGuidePage__screenImage"
          src={screen.src}
          alt={screen.alt}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </figure>
  );
}

export default function HelpGuidePage() {
  const handleTocClick = (event: MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    event.preventDefault();
    const target = document.getElementById(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${sectionId}`);
  };

  return (
    <div className="page helpPage helpGuidePage">
      <section className="helpPage__hero helpGuidePage__hero">
        <div className="helpGuidePage__heroHead">
          <div className="helpPage__sectionIcon" aria-hidden="true">
            <GuideSectionIcon kind="start" />
          </div>
          <div className="helpPage__kicker">HOW TO USE</div>
        </div>
        <h1 className="helpPage__title helpGuidePage__title">Koelogsの使い方</h1>
        <p className="helpPage__sub helpGuidePage__lead">
          Koelogs は、ログ記録、練習、測定、振り返りをつなげて使うアプリです。このページでは、最初に触る順番と、各画面で何を見るかをまとめています。
        </p>
      </section>

      <section className="helpGuidePage__toc" aria-label="使い方の目次">
        <div className="helpGuidePage__tocHead">
          <h2 className="helpGuidePage__tocTitle">目次</h2>
          <p className="helpGuidePage__tocLead">項目をクリックすると、該当箇所へ移動します。</p>
        </div>
        <div className="helpGuidePage__tocList">
          {GUIDE_GROUPS.flatMap((group) => group.steps).map((step, index) => (
            <a
              key={step.id}
              href={`#${step.id}`}
              className="helpGuidePage__tocLink"
              onClick={(event) => handleTocClick(event, step.id)}
            >
              <span className="helpGuidePage__tocNumber">{index + 1}.</span>
              <span className="helpGuidePage__tocText">{step.title}</span>
            </a>
          ))}
        </div>
      </section>

      {GUIDE_GROUPS.map((group, groupIndex) => {
        const iconKind = group.id === "start" ? "start" : group.id === "training" ? "training" : "review";

        return (
          <div key={group.id} className={`helpGuidePage__band${groupIndex % 2 === 0 ? " is-tint" : ""}`}>
            <div className={`helpGuidePage__wave${groupIndex % 2 === 0 ? " is-tint" : ""}`} aria-hidden="true">
              <svg viewBox="0 0 100 16" preserveAspectRatio="none">
                <path d="M0 16V8C18 8 22 2 38 2C56 2 64 10 82 10C91 10 96 8 100 6V16Z" fill="currentColor" />
              </svg>
            </div>
            <div className={`helpGuidePage__inner${groupIndex % 2 === 0 ? " is-tint" : " is-white"}`}>
              <section className="helpGuidePage__group">
                <div className="helpGuidePage__groupHead">
                  <div className="helpPage__sectionIcon" aria-hidden="true">
                    <GuideSectionIcon kind={iconKind} />
                  </div>
                  <div className="helpGuidePage__groupLabels">
                    <div className="helpGuidePage__groupEnglish">{group.englishLabel}</div>
                    <h2 className="helpGuidePage__groupTitle">{group.title}</h2>
                  </div>
                </div>

                <div className="helpGuidePage__steps">
                  {group.steps.map((step, stepIndex) => (
                    <article key={step.id} className="helpGuidePage__step" id={step.id}>
                      <div className="helpGuidePage__stepHead">
                        <span className="helpGuidePage__stepNumber">{stepIndex + 1}</span>
                        <h3 className="helpGuidePage__stepTitle">{step.title}</h3>
                      </div>
                      <p className="helpGuidePage__stepLead">{step.description}</p>
                      <div className="helpGuidePage__stepBody">
                        <ul className="helpGuidePage__pointList">
                          {step.points.map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                        {step.screen ? <ScreenshotPreview screen={step.screen} /> : null}
                      </div>
                      {step.note ? <p className="helpGuidePage__stepNote">{step.note}</p> : null}
                    </article>
                  ))}
                </div>
              </section>
            </div>
            <div className={`helpGuidePage__wave helpGuidePage__wave--bottom${groupIndex % 2 === 0 ? " is-tint" : ""}`} aria-hidden="true">
              <svg viewBox="0 0 100 16" preserveAspectRatio="none">
                <path d="M0 16V8C18 8 22 2 38 2C56 2 64 10 82 10C91 10 96 8 100 6V16Z" fill="currentColor" />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}
