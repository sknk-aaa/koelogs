import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

type Screenshot = {
  src: string;
  alt: string;
  label?: string;
};

type Problem = {
  title: string;
  description: string;
  icon: ReactNode;
};

type FlowFeature = {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  screenshot: Screenshot;
};

type SupportFeature = {
  title: string;
  description: string;
  screenshot: Screenshot;
};

const heroScreenshot: Screenshot = {
  src: "/lp/hero.png",
  alt: "ログページのAIおすすめカード",
  label: "Log",
};

const flowScreenshots = {
  log: {
    src: "/lp/log.png",
    alt: "ログトップ画面",
    label: "Log",
  },
  training: {
    src: "/lp/training.png",
    alt: "測定中のTraining画面",
    label: "Training",
  },
  insights: {
    src: "/lp/insights.png",
    alt: "Insightsでの推移表示",
    label: "Insights",
  },
} satisfies Record<string, Screenshot>;

const supportScreenshots = {
  community: {
    src: "/lp/community.png",
    alt: "コミュニティ投稿一覧",
    label: "Community",
  },
  ai: {
    src: "/lp/ai-settings.png",
    alt: "AIカスタム指示画面",
    label: "AI Settings",
  },
} satisfies Record<string, Screenshot>;

function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="4.5" width="14" height="15" rx="3.5" />
      <path d="M8 9h8" />
      <path d="M8 12.5h8" />
      <path className="accent" d="M8 16h5" />
    </svg>
  );
}

function MeasureIcon() {
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

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 4.5 13.8 9l4.7 1.8-4.7 1.8L12 17l-1.8-4.4L5.5 10.8 10.2 9 12 4.5Z" />
      <path className="accent" d="M18 5.5v3" />
      <path className="accent" d="M16.5 7h3" />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="8" cy="9" r="2.5" />
      <circle cx="16" cy="8.5" r="2.5" />
      <path d="M4.8 18.5a4.1 4.1 0 0 1 6.4-3.2" />
      <path className="accent" d="M12.8 18.5a4.2 4.2 0 0 1 6.4-3.3" />
    </svg>
  );
}

const problems: Problem[] = [
  {
    title: "練習内容が流れて、昨日の続きが分からなくなる",
    description: "時間やメニュー、感覚を残していないと、次に何をやるかを毎回考え直すことになります。",
    icon: <NoteIcon />,
  },
  {
    title: "上達が感覚頼りで、小さな変化を拾いにくい",
    description: "測定と振り返りが別れていると、続けた結果が見えづらくなります。",
    icon: <MeasureIcon />,
  },
  {
    title: "今の状態に合う練習がすぐに決めにくい",
    description: "迷う時間が長いと、練習自体を始めるまでの負担も大きくなります。",
    icon: <SparkIcon />,
  },
];

const flowFeatures: FlowFeature[] = [
  {
    eyebrow: "STEP 1",
    title: "ログを残して、練習の土台をつくる",
    description: "その日の練習時間、メニュー、メモをまとめて記録します。まずはログを残すことが、次の練習を続けやすくする入口になります。",
    points: [
      "練習時間とメニューをひとつに残せる",
      "短いメモでも次回の判断材料になる",
      "AIおすすめの前提データにもつながる",
    ],
    screenshot: flowScreenshots.log,
  },
  {
    eyebrow: "STEP 2",
    title: "Trainingで練習しながら、必要な測定を行う",
    description: "音源再生と測定を同じ流れで進められます。別の画面へ行き来せず、その場で現在の状態を確認できます。",
    points: [
      "音源選択と再生を1ページで完結",
      "音域、ロングトーン、音量安定性、音程精度を測定できる",
      "結果はそのまま Insights の振り返りに使える",
    ],
    screenshot: flowScreenshots.training,
  },
  {
    eyebrow: "STEP 3",
    title: "Insightsで変化を振り返る",
    description: "最高記録や推移をまとめて見返せるので、感覚だけでは見えにくい変化も追いやすくなります。",
    points: [
      "最新値と推移をまとめて確認できる",
      "ヒートマップで継続状況を見られる",
      "詳細分析で履歴を深く追える",
    ],
    screenshot: flowScreenshots.insights,
  },
];

const supportFeatures: SupportFeature[] = [
  {
    title: "コミュニティの実践例も参考にできる",
    description: "公開投稿から、他の人がどんなメニューで効果を感じたかを見られます。コミュニティ投稿は AIおすすめの補助根拠にも使われます。",
    screenshot: supportScreenshots.community,
  },
  {
    title: "AIカスタム指示で提案の方向を調整できる",
    description: "改善したい項目や回答スタイル、長期プロフィールを設定して、自分に合う提案へ寄せられます。",
    screenshot: supportScreenshots.ai,
  },
];

function ScreenshotCard({ screenshot, className = "" }: { screenshot: Screenshot; className?: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`landingKoelogs__screen ${className}`.trim()}>
      {screenshot.label ? <div className="landingKoelogs__screenPill">{screenshot.label}</div> : null}
      {failed ? (
        <div className="landingKoelogs__screenFallback" role="img" aria-label={`${screenshot.alt} のプレースホルダー`}>
          <div className="landingKoelogs__screenFallbackTitle">Screenshot Placeholder</div>
          <div className="landingKoelogs__screenFallbackPath">{screenshot.src}</div>
        </div>
      ) : (
        <img
          className="landingKoelogs__screenImage"
          src={screenshot.src}
          alt={screenshot.alt}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function FlowRow({ feature, reverse = false }: { feature: FlowFeature; reverse?: boolean }) {
  return (
    <section className={`landingKoelogs__flowRow${reverse ? " is-reversed" : ""}`}>
      <div className="landingKoelogs__flowCopy">
        <div className="landingKoelogs__eyebrow">{feature.eyebrow}</div>
        <h3 className="landingKoelogs__sectionCardTitle">{feature.title}</h3>
        <p className="landingKoelogs__body">{feature.description}</p>
        <ul className="landingKoelogs__bulletList">
          {feature.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
      <ScreenshotCard screenshot={feature.screenshot} />
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="landingKoelogs">
      <header className="landingKoelogs__header">
        <div className="landingKoelogs__container landingKoelogs__headerInner">
          <Link to="/lp" className="landingKoelogs__brand">
            Koelogs
          </Link>
          <nav className="landingKoelogs__nav" aria-label="LP navigation">
            <Link to="/help/guide" className="landingKoelogs__navLink">
              使い方
            </Link>
            <Link to="/log" className="landingKoelogs__navLink">
              ゲストで試す
            </Link>
            <Link to="/login" className="landingKoelogs__navButton landingKoelogs__navButton--ghost">
              ログイン
            </Link>
            <Link to="/signup" className="landingKoelogs__navButton">
              新規登録
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="landingKoelogs__hero">
          <div className="landingKoelogs__container">
            <div className="landingKoelogs__heroInner">
              <div className="landingKoelogs__heroCopy">
                <div className="landingKoelogs__eyebrow">VOICE TRAINING SUPPORT APP</div>
                <h1 className="landingKoelogs__heroTitle">記録して、測って、振り返る流れを一つに。</h1>
                <p className="landingKoelogs__heroText">
                  Koelogs は、ボイトレの記録、測定、振り返り、AIサポートをつなげて、独学でも続けやすい流れを作るためのWebアプリです。
                </p>
                <div className="landingKoelogs__heroActions">
                  <Link to="/signup" className="landingKoelogs__button">
                    今すぐ使ってみる
                  </Link>
                  <Link to="/log" className="landingKoelogs__button landingKoelogs__button--ghost">
                    ゲストで試す
                  </Link>
                </div>
                <div className="landingKoelogs__heroNotes">
                  <div className="landingKoelogs__heroNote">
                    <div className="landingKoelogs__heroNoteTitle">記録</div>
                    <div className="landingKoelogs__heroNoteBody">練習内容を残して、次の練習につなげやすくする</div>
                  </div>
                  <div className="landingKoelogs__heroNote">
                    <div className="landingKoelogs__heroNoteTitle">振り返り</div>
                    <div className="landingKoelogs__heroNoteBody">測定と推移をまとめて見返し、小さな変化を追いやすくする</div>
                  </div>
                </div>
              </div>
              <div className="landingKoelogs__heroVisual">
                <ScreenshotCard screenshot={heroScreenshot} className="landingKoelogs__heroScreen" />
              </div>
            </div>
          </div>
        </section>

        <section className="landingKoelogs__band landingKoelogs__band--tint">
          <div className="landingKoelogs__wave is-tint" aria-hidden="true">
            <svg viewBox="0 0 100 16" preserveAspectRatio="none">
              <path d="M0 16V8C18 8 22 2 38 2C56 2 64 10 82 10C91 10 96 8 100 6V16Z" fill="currentColor" />
            </svg>
          </div>
          <div className="landingKoelogs__inner is-tint">
            <section className="landingKoelogs__container landingKoelogs__section">
              <div className="landingKoelogs__sectionHead landingKoelogs__sectionHead--center">
                <div className="landingKoelogs__eyebrow">WHY KOELOGS</div>
                <h2 className="landingKoelogs__sectionTitle">こういう迷いを減らすためのアプリです</h2>
                <p className="landingKoelogs__body">
                  ボイトレは、やることそのものよりも、続ける設計が難しいことがあります。Koelogs は、その流れをひとつにまとめるためのアプリです。
                </p>
              </div>
              <div className="landingKoelogs__problemList">
                {problems.map((problem) => (
                  <article key={problem.title} className="landingKoelogs__problemRow">
                    <div className="landingKoelogs__icon" aria-hidden="true">
                      {problem.icon}
                    </div>
                    <div className="landingKoelogs__problemBody">
                      <h3 className="landingKoelogs__sectionCardTitle">{problem.title}</h3>
                      <p className="landingKoelogs__body">{problem.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
          <div className="landingKoelogs__wave landingKoelogs__wave--bottom is-tint" aria-hidden="true">
            <svg viewBox="0 0 100 16" preserveAspectRatio="none">
              <path d="M0 16V8C18 8 22 2 38 2C56 2 64 10 82 10C91 10 96 8 100 6V16Z" fill="currentColor" />
            </svg>
          </div>
        </section>

        <section className="landingKoelogs__band">
          <div className="landingKoelogs__wave" aria-hidden="true">
            <svg viewBox="0 0 100 16" preserveAspectRatio="none">
              <path d="M0 16V8C18 8 22 2 38 2C56 2 64 10 82 10C91 10 96 8 100 6V16Z" fill="currentColor" />
            </svg>
          </div>
          <div className="landingKoelogs__inner is-white">
            <section className="landingKoelogs__container landingKoelogs__section">
              <div className="landingKoelogs__sectionHead">
                <div className="landingKoelogs__eyebrow">CORE FLOW</div>
                <h2 className="landingKoelogs__sectionTitle">使い方は、3つの流れでつながっています</h2>
              </div>
              <div className="landingKoelogs__flowStack">
                {flowFeatures.map((feature, index) => (
                  <FlowRow key={feature.title} feature={feature} reverse={index % 2 === 1} />
                ))}
              </div>
            </section>
          </div>
          <div className="landingKoelogs__wave landingKoelogs__wave--bottom" aria-hidden="true">
            <svg viewBox="0 0 100 16" preserveAspectRatio="none">
              <path d="M0 16V8C18 8 22 2 38 2C56 2 64 10 82 10C91 10 96 8 100 6V16Z" fill="currentColor" />
            </svg>
          </div>
        </section>

        <section className="landingKoelogs__band landingKoelogs__band--tint">
          <div className="landingKoelogs__wave is-tint" aria-hidden="true">
            <svg viewBox="0 0 100 16" preserveAspectRatio="none">
              <path d="M0 16V8C18 8 22 2 38 2C56 2 64 10 82 10C91 10 96 8 100 6V16Z" fill="currentColor" />
            </svg>
          </div>
          <div className="landingKoelogs__inner is-tint">
            <section className="landingKoelogs__container landingKoelogs__section">
              <div className="landingKoelogs__sectionHead">
                <div className="landingKoelogs__eyebrow">EXTRA SUPPORT</div>
                <h2 className="landingKoelogs__sectionTitle">続けにくい部分も、補助できるようにしています</h2>
                <p className="landingKoelogs__body">
                  主役は記録と振り返りですが、迷ったときの補助線としてコミュニティとAI設定も使えます。
                </p>
              </div>
              <div className="landingKoelogs__supportStack">
                {supportFeatures.map((feature) => (
                  <article key={feature.title} className="landingKoelogs__supportRow">
                    <div className="landingKoelogs__supportCopy">
                      <div className="landingKoelogs__icon landingKoelogs__icon--small" aria-hidden="true">
                        {feature.title.includes("コミュニティ") ? <CommunityIcon /> : <SparkIcon />}
                      </div>
                      <div>
                        <h3 className="landingKoelogs__sectionCardTitle">{feature.title}</h3>
                        <p className="landingKoelogs__body">{feature.description}</p>
                      </div>
                    </div>
                    <ScreenshotCard screenshot={feature.screenshot} className="landingKoelogs__supportScreen" />
                  </article>
                ))}
              </div>
            </section>
          </div>
          <div className="landingKoelogs__wave landingKoelogs__wave--bottom is-tint" aria-hidden="true">
            <svg viewBox="0 0 100 16" preserveAspectRatio="none">
              <path d="M0 16V8C18 8 22 2 38 2C56 2 64 10 82 10C91 10 96 8 100 6V16Z" fill="currentColor" />
            </svg>
          </div>
        </section>

        <section className="landingKoelogs__band">
          <div className="landingKoelogs__wave" aria-hidden="true">
            <svg viewBox="0 0 100 16" preserveAspectRatio="none">
              <path d="M0 16V8C18 8 22 2 38 2C56 2 64 10 82 10C91 10 96 8 100 6V16Z" fill="currentColor" />
            </svg>
          </div>
          <div className="landingKoelogs__inner is-white">
            <section className="landingKoelogs__container landingKoelogs__cta">
              <div className="landingKoelogs__eyebrow">GET STARTED</div>
              <h2 className="landingKoelogs__ctaTitle">最初は、ログを1回残すところから始められます。</h2>
              <p className="landingKoelogs__body landingKoelogs__ctaBody">
                まずはゲスト表示で流れを見ても構いません。使い方を確認してから、必要なら新規登録して続けられます。
              </p>
              <div className="landingKoelogs__heroActions landingKoelogs__heroActions--center">
                <Link to="/signup" className="landingKoelogs__button">
                  新規登録
                </Link>
                <Link to="/help/guide" className="landingKoelogs__button landingKoelogs__button--ghost">
                  使い方を見る
                </Link>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
