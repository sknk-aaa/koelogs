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

type Benefit = {
  title: string;
  description: string;
  icon: ReactNode;
};

type Feature = {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  screenshot: Screenshot;
};

const heroScreenshot: Screenshot = {
  src: "/lp/longtone-growth-pc.png",
  alt: "ロングトーンの最高記録と成長推移",
};

const featureScreenshots = {
  log: {
    src: "/lp/log-summary-pc.png",
    alt: "ログサマリー画面",
    label: "Log",
  },
  training: {
    src: "/lp/training-range-pc.png",
    alt: "トレーニングと測定画面",
    label: "Training",
  },
  insights: {
    src: "/lp/longtone-growth-pc.png",
    alt: "ロングトーンの最高記録と成長推移",
    label: "Insights",
  },
} satisfies Record<string, Screenshot>;

function StrokeDotIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="24" fill="rgba(79,124,255,0.14)" />
      <circle cx="32" cy="32" r="10" fill="#4f7cff" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect x="12" y="14" width="40" height="36" rx="14" fill="rgba(79,124,255,0.14)" />
      <path d="M24 23h16M24 31h16M24 39h10" stroke="#4f7cff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function GraphIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect x="10" y="12" width="44" height="40" rx="16" fill="rgba(79,124,255,0.14)" />
      <path d="M20 40l8-8 7 5 10-12" stroke="#4f7cff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="40" r="3" fill="#4f7cff" />
      <circle cx="28" cy="32" r="3" fill="#4f7cff" />
      <circle cx="35" cy="37" r="3" fill="#4f7cff" />
      <circle cx="45" cy="25" r="3" fill="#4f7cff" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect x="12" y="12" width="40" height="40" rx="16" fill="rgba(79,124,255,0.14)" />
      <path d="M32 18l3.8 9.2L45 31l-9.2 3.8L32 44l-3.8-9.2L19 31l9.2-3.8L32 18Z" fill="#4f7cff" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect x="10" y="12" width="44" height="32" rx="14" fill="rgba(79,124,255,0.14)" />
      <path d="M22 52l7-8h15" stroke="#4f7cff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="28" r="3" fill="#4f7cff" />
      <circle cx="32" cy="28" r="3" fill="#4f7cff" />
      <circle cx="40" cy="28" r="3" fill="#4f7cff" />
    </svg>
  );
}

const problems: Problem[] = [
  {
    title: "記録が続かず、何をやったか流れてしまう",
    description: "練習時間やメモが残らないと、昨日の延長で続ける感覚を作りにくくなります。",
    icon: <NoteIcon />,
  },
  {
    title: "上達しているのか感覚だけでは分かりにくい",
    description: "測定と振り返りが別だと、小さな変化を拾いづらくなります。",
    icon: <GraphIcon />,
  },
  {
    title: "次に何を練習するか毎回迷ってしまう",
    description: "その日の状態に合う方向性が見えると、練習を止めずに進めやすくなります。",
    icon: <SparkIcon />,
  },
];

const benefits: Benefit[] = [
  {
    title: "練習ログを残せる",
    description: "時間・メニュー・メモをまとめて記録して、日々の練習を流さず残せます。",
    icon: <NoteIcon />,
  },
  {
    title: "測定で状態を確認できる",
    description: "音域やロングトーンなどを測って、感覚だけでなく数字でも見返せます。",
    icon: <StrokeDotIcon />,
  },
  {
    title: "分析で変化を振り返れる",
    description: "蓄積した結果をまとめて見ながら、継続や伸びを確認できます。",
    icon: <GraphIcon />,
  },
  {
    title: "AIが次の一手を補助する",
    description: "直近ログや設定をもとに、次に何をやるか考える負担を軽くします。",
    icon: <ChatIcon />,
  },
];

const features: Feature[] = [
  {
    eyebrow: "Daily log",
    title: "練習を記録して、続ける土台をつくる",
    description: "その日の練習時間、メニュー、感覚をひとつにまとめて残せます。まずはログをつけるだけでも、次の練習が途切れにくくなります。",
    points: ["練習時間とメニューをまとめて保存", "短いメモでも振り返りの材料になる", "AI提案の土台になる"],
    screenshot: featureScreenshots.log,
  },
  {
    eyebrow: "Training",
    title: "再生と測定を、同じ流れで進められる",
    description: "音源を再生しながら練習し、その流れのまま測定へ進めます。別アプリに分かれず、確認まで一気に終えられます。",
    points: ["音源再生と測定を1ページで完結", "音域や発声状態を継続的に確認", "結果はそのまま分析へつながる"],
    screenshot: featureScreenshots.training,
  },
  {
    eyebrow: "Insights",
    title: "測定結果の変化を、ひと目で振り返れる",
    description: "最高記録と推移をまとめて見返せるので、感覚だけでは気づきにくい成長も追いやすくなります。",
    points: ["最高記録と最新差分をまとめて確認", "推移グラフで伸び方を見返せる", "続ける実感を数字で持ちやすい"],
    screenshot: featureScreenshots.insights,
  },
];

const supportCards: Benefit[] = [
  {
    title: "コミュニティで実践例を見られる",
    description: "他の人が効果を感じたメニューや工夫を見ながら、自分の練習の参考にできます。",
    icon: <SparkIcon />,
  },
  {
    title: "AIが次の練習を整理する",
    description: "直近ログや設定をもとに、次に何をやるかを考える負担を軽くします。",
    icon: <ChatIcon />,
  },
];

function ScreenshotCard({ screenshot, className = "" }: { screenshot: Screenshot; className?: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`landingAppco__screenCard ${className}`.trim()}>
      {screenshot.label ? <div className="landingAppco__screenPill">{screenshot.label}</div> : null}
      {failed ? (
        <div className="landingAppco__screenFallback" role="img" aria-label={`${screenshot.alt} のプレースホルダー`}>
          <div className="landingAppco__screenFallbackTitle">Image Placeholder</div>
          <div className="landingAppco__screenFallbackPath">{screenshot.src}</div>
        </div>
      ) : (
        <img
          className="landingAppco__screenImage"
          src={screenshot.src}
          alt={screenshot.alt}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function FeatureRow({ feature, reverse = false }: { feature: Feature; reverse?: boolean }) {
  return (
    <section className={`landingAppco__featureRow${reverse ? " is-reversed" : ""}`}>
      <div className="landingAppco__featureCopy">
        <div className="landingAppco__eyebrow">{feature.eyebrow}</div>
        <h3 className="landingAppco__featureTitle">{feature.title}</h3>
        <p className="landingAppco__body">{feature.description}</p>
        <ul className="landingAppco__bulletList">
          {feature.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
      <div className="landingAppco__featureVisual">
        <div className="landingAppco__visualShell">
          <div className="landingAppco__visualGlow" aria-hidden="true" />
          <ScreenshotCard screenshot={feature.screenshot} />
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="landingAppco">
      <header className="landingAppco__header">
        <div className="landingAppco__container landingAppco__headerInner">
          <Link to="/lp" className="landingAppco__brand">
            Koelogs<span>.</span>
          </Link>

          <nav className="landingAppco__nav" aria-label="LP navigation">
            <Link to="/help/guide" className="landingAppco__navLink">
              使い方
            </Link>
            <Link to="/log" className="landingAppco__navLink">
              ゲストで試す
            </Link>
            <Link to="/login" className="landingAppco__navButton landingAppco__navButton--ghost">
              ログイン
            </Link>
            <Link to="/signup" className="landingAppco__navButton">
              新規登録
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="landingAppco__hero">
          <div className="landingAppco__container landingAppco__heroInner">
            <div className="landingAppco__heroCopy">
              <div className="landingAppco__eyebrow">Voice training support app</div>
              <h1 className="landingAppco__heroTitle">毎日のボイトレを、続けやすい流れに変える。</h1>
              <p className="landingAppco__heroText">
                Koelogsは、練習の記録・測定・振り返り・AIサポートをつなげて、独学のボイトレを積み上げやすくするWebアプリです。
              </p>

              <div className="landingAppco__heroActions">
                <Link to="/signup" className="landingAppco__button">
                  今すぐ使ってみる
                </Link>
                <a href="#lp-benefits" className="landingAppco__button landingAppco__button--ghost">
                  できることを見る
                </a>
              </div>

              <div className="landingAppco__heroMetrics">
                <div className="landingAppco__metricCard">
                  <div className="landingAppco__metricValue">Record</div>
                  <div className="landingAppco__metricLabel">練習内容を残して、次の練習につなげやすくする</div>
                </div>
                <div className="landingAppco__metricCard">
                  <div className="landingAppco__metricValue">Review</div>
                  <div className="landingAppco__metricLabel">測定と推移で、小さな変化を振り返りやすくする</div>
                </div>
              </div>
            </div>

            <div className="landingAppco__heroVisual">
              <div className="landingAppco__heroArt" aria-hidden="true">
                <div className="landingAppco__heroBlob landingAppco__heroBlob--one" />
                <div className="landingAppco__heroBlob landingAppco__heroBlob--two" />
                <div className="landingAppco__heroBlob landingAppco__heroBlob--three" />
              </div>

              <div className="landingAppco__heroStack">
                <div className="landingAppco__floatingBadge landingAppco__floatingBadge--left">
                  記録が残る
                </div>
                <div className="landingAppco__floatingBadge landingAppco__floatingBadge--right">
                  伸びが見える
                </div>
                <ScreenshotCard screenshot={heroScreenshot} className="landingAppco__heroScreen" />
                <ScreenshotCard screenshot={featureScreenshots.log} className="landingAppco__heroScreen landingAppco__heroScreen--mini" />
              </div>
            </div>
          </div>
        </section>

        <section className="landingAppco__section landingAppco__section--problems">
          <div className="landingAppco__container">
            <div className="landingAppco__sectionHead landingAppco__sectionHead--center">
              <div className="landingAppco__eyebrow">Why Koelogs</div>
              <h2 className="landingAppco__sectionTitle">こんな悩みありませんか</h2>
              <p className="landingAppco__body">
                ボイトレは、やること自体よりも「続ける設計」が難しいことがあります。Koelogs はその流れを整えるためのアプリです。
              </p>
            </div>

            <div className="landingAppco__problemGrid">
              {problems.map((problem) => (
                <article key={problem.title} className="landingAppco__problemCard">
                  <div className="landingAppco__iconBadge">{problem.icon}</div>
                  <h3 className="landingAppco__cardTitle">{problem.title}</h3>
                  <p className="landingAppco__body">{problem.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="lp-benefits" className="landingAppco__section landingAppco__section--benefits">
          <div className="landingAppco__container">
            <div className="landingAppco__sectionHead landingAppco__sectionHead--center">
              <div className="landingAppco__eyebrow">What you can do</div>
              <h2 className="landingAppco__sectionTitle">Koelogsでできること</h2>
              <p className="landingAppco__body">
                まずは記録から始めて、必要に応じて測定し、あとから振り返る。複雑に見せず、流れとして使えることを重視しています。
              </p>
            </div>

            <div className="landingAppco__benefitGrid">
              {benefits.map((benefit) => (
                <article key={benefit.title} className="landingAppco__benefitCard">
                  <div className="landingAppco__iconBadge landingAppco__iconBadge--small">{benefit.icon}</div>
                  <h3 className="landingAppco__cardTitle">{benefit.title}</h3>
                  <p className="landingAppco__body">{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landingAppco__section landingAppco__section--features">
          <div className="landingAppco__container">
            <div className="landingAppco__sectionHead">
              <div className="landingAppco__eyebrow">Core flow</div>
              <h2 className="landingAppco__sectionTitle">3つの画面で、使い方の流れが分かる</h2>
            </div>

            <div className="landingAppco__featureStack">
              {features.map((feature, index) => (
                <FeatureRow key={feature.title} feature={feature} reverse={index % 2 === 1} />
              ))}
            </div>
          </div>
        </section>

        <section className="landingAppco__section landingAppco__section--soft">
          <div className="landingAppco__container">
            <div className="landingAppco__miniCta">
              <div>
                <div className="landingAppco__eyebrow">Start simple</div>
                <h2 className="landingAppco__miniCtaTitle">最初は、ログを1回残すだけで十分です。</h2>
              </div>
              <div className="landingAppco__heroActions">
                <Link to="/log" className="landingAppco__button">
                  ゲストで試す
                </Link>
                <Link to="/signup" className="landingAppco__button landingAppco__button--ghost">
                  新規登録
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="landingAppco__section landingAppco__section--secondary">
          <div className="landingAppco__container">
            <div className="landingAppco__supportPanel">
              <div className="landingAppco__sectionHead">
                <div className="landingAppco__eyebrow">Extra support</div>
                <h2 className="landingAppco__sectionTitle">一人で続けにくい部分も補助できる</h2>
                <p className="landingAppco__body">
                  主役は記録と振り返りですが、迷ったときに使える補助線も用意しています。ここは実画面を詰め込まず、価値が伝わる形で整理しています。
                </p>
              </div>

              <div className="landingAppco__supportGrid">
                {supportCards.map((card) => (
                  <article key={card.title} className="landingAppco__supportCard">
                    <div className="landingAppco__iconBadge landingAppco__iconBadge--small">{card.icon}</div>
                    <h3 className="landingAppco__cardTitle">{card.title}</h3>
                    <p className="landingAppco__body">{card.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="landingAppco__cta">
          <div className="landingAppco__container landingAppco__ctaInner">
            <div className="landingAppco__eyebrow landingAppco__eyebrow--light">Get started</div>
            <h2 className="landingAppco__ctaTitle">記録して、振り返って、少しずつ続ける。</h2>
            <p className="landingAppco__ctaText">
              Koelogsは、ボイトレを頑張りたい人のために、続ける流れそのものを整えるアプリです。
            </p>
            <div className="landingAppco__heroActions landingAppco__heroActions--center">
              <Link to="/signup" className="landingAppco__button landingAppco__button--light">
                今すぐ使ってみる
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
