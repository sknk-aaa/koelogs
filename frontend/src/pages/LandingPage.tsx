import { Link } from "react-router-dom";

import "./LandingPage.css";

export default function LandingPage() {
  return (
    <div className="landingPage">
      <div className="landingPage__bg" aria-hidden="true" />

      <main className="landingPage__shell">
        <section className="landingHero card">
          <div className="landingHero__left">
            <p className="landingHero__eyebrow">VOICE TRAINING WORKSPACE</p>
            <h1 className="landingHero__title">練習の質を、記録で上げる。</h1>
            <p className="landingHero__lead">
              voice-app は、ボイトレの「記録」「再生」「分析」を1つにまとめた継続支援アプリです。
              何をどれだけやったかが見えるから、次の一手が迷わなくなります。
            </p>

            <div className="landingHero__cta">
              <Link to="/signup" className="landingBtn landingBtn--primary">
                無料で始める
              </Link>
              <Link to="/login" className="landingBtn landingBtn--ghost">
                ログイン
              </Link>
            </div>

            <div className="landingHero__meta">
              <span className="landingMeta">記録は日付ごとに整理</span>
              <span className="landingMeta">AIおすすめ対応</span>
              <span className="landingMeta">モバイル最適化</span>
            </div>
          </div>

          <div className="landingHero__right" aria-hidden="true">
            <div className="landingMock landingMock--main">
              <div className="landingMock__top">
                <span>Log</span>
                <span>Today</span>
              </div>
              <div className="landingMock__body">
                <div className="landingMock__line is-xl" />
                <div className="landingMock__line" />
                <div className="landingMock__chips">
                  <span>地声</span>
                  <span>裏声</span>
                  <span>ミックス</span>
                </div>
                <div className="landingMock__chart">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
            <div className="landingMock landingMock--sub">
              <div className="landingMock__top">
                <span>Training</span>
                <span>120 bpm</span>
              </div>
              <div className="landingMock__body">
                <div className="landingMock__meter">
                  <div className="landingMock__meterFill" />
                </div>
                <div className="landingMock__button">再生 / 停止</div>
              </div>
            </div>
          </div>
        </section>

        <section className="landingProof card">
          <div className="landingProof__item">
            <div className="landingProof__value">01</div>
            <div className="landingProof__label">練習ログを自動整理</div>
          </div>
          <div className="landingProof__item">
            <div className="landingProof__value">02</div>
            <div className="landingProof__label">トレーニング再生を即開始</div>
          </div>
          <div className="landingProof__item">
            <div className="landingProof__value">03</div>
            <div className="landingProof__label">継続傾向を可視化</div>
          </div>
        </section>

        <section className="landingSection">
          <header className="landingSection__head">
            <p className="landingSection__kicker">What You Can Do</p>
            <h2 className="landingSection__title">機能がつながっているから、改善しやすい</h2>
          </header>

          <div className="landingFeatureGrid">
            <article className="landingFeature card">
              <h3 className="landingFeature__title">Log</h3>
              <p className="landingFeature__text">メニュー、時間、最高音、メモを日単位で保存。後から比較しやすい。</p>
            </article>
            <article className="landingFeature card">
              <h3 className="landingFeature__title">Training</h3>
              <p className="landingFeature__text">スケールとテンポを選ぶだけで再生開始。反復しやすい設計。</p>
            </article>
            <article className="landingFeature card">
              <h3 className="landingFeature__title">Insights</h3>
              <p className="landingFeature__text">練習時間とメニュー頻度を見える化。次の重点を決めやすい。</p>
            </article>
          </div>
        </section>

        <section className="landingPreview card">
          <div className="landingPreview__head">
            <h2 className="landingSection__title">実際の画面プレビュー</h2>
            <p className="landingSection__desc">ログイン後の主要画面の雰囲気を確認できます。</p>
          </div>

          <div className="landingPreview__grid" aria-hidden="true">
            <article className="landingScreen">
              <div className="landingScreen__title">ログ</div>
              <div className="landingScreen__line is-lg" />
              <div className="landingScreen__line" />
              <div className="landingScreen__line is-sm" />
            </article>
            <article className="landingScreen">
              <div className="landingScreen__title">トレーニング</div>
              <div className="landingScreen__meter"><span /></div>
              <div className="landingScreen__button" />
              <div className="landingScreen__line is-sm" />
            </article>
            <article className="landingScreen">
              <div className="landingScreen__title">分析</div>
              <div className="landingScreen__bars">
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="landingScreen__line" />
            </article>
          </div>
        </section>

        <section className="landingFinal card">
          <h2 className="landingSection__title">まずは1週間、毎日1ログ。</h2>
          <p className="landingSection__desc">小さく続けるほど、声の変化が見えてきます。</p>
          <Link to="/signup" className="landingBtn landingBtn--primary landingFinal__btn">
            新規登録して始める
          </Link>
        </section>
      </main>
    </div>
  );
}
