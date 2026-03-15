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

const HERO_CHIPS = ["ログ記録", "測定", "振り返り", "AI活用", "コミュニティ"];

const GUIDE_GROUPS: GuideGroup[] = [
  {
    id: "log",
    englishLabel: "LOG",
    title: "まずはログから使い始める",
    steps: [
      {
        id: "guide-log-top",
        title: "ログトップで今日の状態を見る",
        description:
          "Koelogs は /log を起点に使います。その日の記録状況、今週のAIおすすめ、月ログ、今月のまとめをここから確認できます。",
        points: [
          "その日の状態と記録状況をまとめて確認できます",
          "今週のAIおすすめや目標設定の導線が集まっています",
          "月ログと今月のまとめも同じ画面で振り返れます",
        ],
        screen: {
          src: "/guide/log-top.png",
          alt: "ログトップのサマリー表示",
          label: "Log",
        },
      },
    ],
  },
  {
    id: "training",
    englishLabel: "TRAINING",
    title: "音源再生と測定を進める",
    steps: [
      {
        id: "guide-training-player",
        title: "音源を選んで練習を始める",
        description:
          "/training では、スケール種別と音域帯を選んで音源を再生できます。練習用の音源を流しながら、そのまま測定にも進めます。",
        points: [
          "音源再生と練習を1ページで進められます",
          "スケール種別と low / mid / high を選べます",
          "練習の流れを止めずに測定へ移れます",
        ],
        screen: {
          src: "/guide/training-player.png",
          alt: "Trainingページの音源選択と再生UI",
          label: "Training",
        },
      },
      {
        id: "guide-training-measure",
        title: "測定中UIで今の声の状態を確認する",
        description:
          "音域、ロングトーン、音量安定性、音程精度の4種類を測定できます。測定中は専用の可視化UIが表示され、結果はあとで振り返りに使えます。",
        points: [
          "測定中は専用の可視化UIが表示されます",
          "必要な値が取れない場合は保存前に止まります",
          "録音ファイル自体は保存しません",
        ],
        screen: {
          src: "/guide/raining-measurement.png",
          alt: "Trainingページの測定中UI",
          label: "Measurement UI",
        },
      },
    ],
  },
  {
    id: "insights",
    englishLabel: "INSIGHTS",
    title: "変化を見返して傾向をつかむ",
    steps: [
      {
        id: "guide-insights-detail",
        title: "分析詳細で履歴を深く確認する",
        description:
          "分析詳細ページでは、期間を切り替えながら推移や履歴を確認できます。全体の変化だけでなく、各指標の細かな推移も追えます。",
        points: [
          "期間を切り替えながら推移を見られます",
          "測定履歴をまとめて確認できます",
          "分析トップから詳細ページへつなげて使えます",
          "CSV出力にも対応しています",
        ],
        screen: {
          src: "/guide/insights-detail.png",
          alt: "Insights詳細画面",
          label: "Insights Detail",
        },
      },
    ],
  },
  {
    id: "ai",
    englishLabel: "AI",
    title: "おすすめと対話を自分向けに使う",
    steps: [
      {
        id: "guide-ai-chat",
        title: "AIチャットで練習の進め方を相談する",
        description:
          "/chat では、練習方法や考え方を会話しながら整理できます。ログや測定、過去の会話を前提にしながら、自分向けに相談を進められます。",
        points: [
          "会話形式で練習方法を相談できます",
          "履歴を見返しながら継続して使えます",
          "ログに戻りながら使う導線も用意されています",
        ],
        screen: {
          src: "/guide/ai-chat.png",
          alt: "AIチャットの会話画面",
          label: "AI Chat",
        },
      },
      {
        id: "guide-ai-settings",
        title: "AIカスタム指示で提案の方向を調整する",
        description:
          "/settings/ai では、改善したい項目や回答スタイル、長期プロフィールを設定できます。AIおすすめやAIチャットの前提をここで調整します。",
        points: [
          "改善したい項目を指定できます",
          "回答スタイルを調整できます",
          "長期プロフィールを保存できます",
        ],
        screen: {
          src: "/guide/ai-settings.png",
          alt: "AIカスタム指示画面",
          label: "AI Settings",
        },
      },
    ],
  },
  {
    id: "community",
    englishLabel: "COMMUNITY",
    title: "他の人の実践を参考にする",
    steps: [
      {
        id: "guide-community",
        title: "コミュニティで実践例と会話を見られる",
        description:
          "/community では、効果のあった練習とコミュニティ投稿を切り替えながら、他の人の実践や相談内容を見られます。公開投稿はAIおすすめの補助根拠にも使われます。",
        points: [
          "効果のあった練習とコミュニティ投稿を切り替えて見られます",
          "参考になった投稿を保存できます",
          "コミュニティ投稿では詳細ページでコメントできます",
        ],
        screen: {
          src: "/guide/community-top.png",
          alt: "コミュニティトップ画面",
          label: "Community",
        },
      },
    ],
  },
];

function GuideSectionIcon({ kind }: { kind: "log" | "training" | "insights" | "ai" | "community" }) {
  if (kind === "log") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 10.6 12 4l8 6.6V19a1 1 0 0 1-1 1h-5.4v-5.3a1 1 0 0 0-1-1h-1.2a1 1 0 0 0-1 1V20H5a1 1 0 0 1-1-1Z" />
        <path className="accent" d="M8.5 12.5h7" />
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
  if (kind === "insights") {
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
  if (kind === "ai") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5.4 7.1a2 2 0 0 1 2-2h9.2a2 2 0 0 1 2 2v6.2a2 2 0 0 1-2 2h-5.1l-3.6 2.8v-2.8H7.4a2 2 0 0 1-2-2Z" />
        <path className="accent" d="M10 8.8h4M10 11.9h2.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="9.2" cy="8.2" r="2.5" />
      <path d="M4.8 16.9c0-2.2 1.9-4 4.4-4s4.4 1.8 4.4 4" />
      <circle className="accent" cx="16.3" cy="9.1" r="2" />
      <path className="accent" d="M14 16.9c.1-1.8 1.5-3.2 3.4-3.2 1 0 1.9.4 2.5 1.1" />
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
            <GuideSectionIcon kind="log" />
          </div>
          <div className="helpPage__kicker">HOW TO USE</div>
        </div>
        <h1 className="helpPage__title helpGuidePage__title">Koelogsの使い方</h1>
        <p className="helpPage__sub helpGuidePage__lead">
          Koelogs は、ログ記録、練習、測定、振り返り、AI活用をひとつの流れで使えるボイストレーニング支援アプリです。このページでは、各画面で何ができるかを順番にまとめています。
        </p>
        <div className="helpGuidePage__heroChips" aria-label="使い方の要点">
          {HERO_CHIPS.map((chip) => (
            <span key={chip} className="helpGuidePage__heroChip">
              {chip}
            </span>
          ))}
        </div>
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
        const iconKind = group.id as "log" | "training" | "insights" | "ai" | "community";

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
