import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import "./LandingPage.css";

type Screenshot = {
  src: string;
  alt: string;
  label?: string;
};

type ShowcaseSlide = {
  eyebrow: string;
  title: string;
  description: string;
  screenshot?: Screenshot;
  icon: ReactNode;
};

const showcaseSlides: ShowcaseSlide[] = [
  {
    eyebrow: "LOG",
    title: "ログと測定結果を蓄積する",
    description:
      "その日の練習時間、メニュー、メモ、測定結果をひとつの流れで残し、自分の変化を振り返るための土台をつくれます。",
    screenshot: {
      src: "/lp/log-top.png",
      alt: "ログトップ画面",
      label: "Log",
    },
    icon: <LogIcon />,
  },
  {
    eyebrow: "COMMUNITY",
    title: "投稿から実践知を参照する",
    description:
      "効果のあった練習や自由投稿から、どの工夫がどの改善につながったかを確認できます。投稿データは AI 提案の補助根拠にもなります。",
    screenshot: {
      src: "/lp/community-top.png",
      alt: "コミュニティトップ画面",
      label: "Community",
    },
    icon: <CommunityIcon />,
  },
  {
    eyebrow: "AI CHAT",
    title: "両方のデータを使って AI に相談する",
    description:
      "個人の記録とコミュニティ投稿を踏まえて、次の練習や考え方を AI チャットで相談できます。",
    screenshot: {
      src: "/lp/ai-chat.png",
      alt: "AIチャットの会話画面",
      label: "AI Chat",
    },
    icon: <ChatIcon />,
  },
];

function LogIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5.5" y="4.5" width="13" height="15" rx="2.5" />
      <path className="accent" d="M9 9h6" />
      <path className="accent" d="M9 12h6" />
      <path className="accent" d="M9 15h4" />
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

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5.5 7.5a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H11l-3.8 3v-3H8.5a3 3 0 0 1-3-3Z" />
      <path className="accent" d="M9 9.5h6" />
      <path className="accent" d="M9 12.5h4" />
    </svg>
  );
}

function ScreenshotCard({
  screenshot,
  className = "",
  showLabel = true,
}: {
  screenshot: Screenshot;
  className?: string;
  showLabel?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`landingKoelogs__screen ${className}`.trim()}>
      {showLabel && screenshot.label ? <div className="landingKoelogs__screenPill">{screenshot.label}</div> : null}
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
          draggable={false}
          onError={() => setFailed(true)}
          onDragStart={(event) => event.preventDefault()}
        />
      )}
    </div>
  );
}

export default function LandingPage() {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeSlide = showcaseSlides[activeSlideIndex];
  const dragStartXRef = useRef<number | null>(null);
  const dragDeltaXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const resetDrag = () => {
    dragStartXRef.current = null;
    dragDeltaXRef.current = 0;
    isDraggingRef.current = false;
    setDragOffset(0);
  };

  const commitDrag = () => {
    const threshold = 80;
    if (dragDeltaXRef.current <= -threshold && activeSlideIndex < showcaseSlides.length - 1) {
      setActiveSlideIndex((currentIndex) => currentIndex + 1);
    } else if (dragDeltaXRef.current >= threshold && activeSlideIndex > 0) {
      setActiveSlideIndex((currentIndex) => currentIndex - 1);
    }
    resetDrag();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStartXRef.current = event.clientX;
    dragDeltaXRef.current = 0;
    isDraggingRef.current = true;
    setDragOffset(0);

    const handleWindowPointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current || dragStartXRef.current === null) return;
      const delta = moveEvent.clientX - dragStartXRef.current;
      dragDeltaXRef.current = delta;
      setDragOffset(delta);
    };

    const handleWindowPointerUp = () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
      commitDrag();
    };

    const handleWindowPointerCancel = () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
      resetDrag();
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerCancel);
  };

  return (
    <div className="landingKoelogs">
      <header className="landingKoelogs__header">
        <div className="landingKoelogs__shell landingKoelogs__headerInner">
          <Link to="/lp" className="landingKoelogs__brand" onClick={() => setMobileMenuOpen(false)}>
            <BrandLogo alt="Koelogs" className="landingKoelogs__brandImage" />
          </Link>
          <nav className="landingKoelogs__nav landingKoelogs__nav--desktop" aria-label="LP navigation">
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

          <button
            type="button"
            className="landingKoelogs__menuButton"
            aria-label={mobileMenuOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="landingKoelogs__mobileMenu">
            <nav className="landingKoelogs__mobileNav" aria-label="LP navigation mobile">
              <Link to="/help/guide" className="landingKoelogs__mobileNavLink" onClick={() => setMobileMenuOpen(false)}>
                使い方
              </Link>
              <Link to="/log" className="landingKoelogs__mobileNavLink" onClick={() => setMobileMenuOpen(false)}>
                ゲストで試す
              </Link>
              <Link to="/login" className="landingKoelogs__mobileNavLink" onClick={() => setMobileMenuOpen(false)}>
                ログイン
              </Link>
              <Link to="/signup" className="landingKoelogs__mobileNavLink" onClick={() => setMobileMenuOpen(false)}>
                新規登録
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="landingKoelogs__main">
        <section className="landingKoelogs__heroBand">
          <div className="landingKoelogs__heroBandInner">
            <section className="landingKoelogs__hero">
              <div className="landingKoelogs__heroCopy">
                <div className="landingKoelogs__eyebrow">APP OVERVIEW</div>
                <h1 className="landingKoelogs__heroTitle">ボイトレの記録を、AIで活かす</h1>
                <p className="landingKoelogs__heroText">
                  投稿から蓄積された練習データをAIが根拠として活用し、自分の記録や測定結果も踏まえて相談できるボイストレーニング支援アプリです。
                </p>
              </div>
            </section>
            <section className="landingKoelogs__showcase" aria-label="主要機能の紹介">
              <div className="landingKoelogs__showcaseViewport">
                <div
                  className={`landingKoelogs__showcaseViewportInner${dragOffset !== 0 ? " is-dragging" : ""}`}
                  onPointerDown={handlePointerDown}
                >
                  <div
                    className="landingKoelogs__showcaseTrack"
                    style={
                      {
                        "--slide-index": activeSlideIndex,
                        "--drag-offset": `${dragOffset}px`,
                      } as CSSProperties
                    }
                  >
                    {showcaseSlides.map((slide) => (
                      <div
                        key={slide.title}
                        className={`landingKoelogs__showcaseSlide${slide.title === activeSlide.title ? " is-active" : ""}`}
                        aria-hidden={slide.title !== activeSlide.title}
                      >
                        {slide.screenshot ? (
                          <ScreenshotCard screenshot={slide.screenshot} className="landingKoelogs__showcaseScreen" showLabel={false} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="landingKoelogs__showcaseCopy" aria-live="polite">
                <div className="landingKoelogs__showcaseHead">
                  <span className="landingKoelogs__icon" aria-hidden="true">
                    {activeSlide.icon}
                  </span>
                  <span className="landingKoelogs__eyebrow">{activeSlide.eyebrow}</span>
                </div>
                <h2 className="landingKoelogs__showcaseTitle">{activeSlide.title}</h2>
                <p className="landingKoelogs__body landingKoelogs__showcaseBody">{activeSlide.description}</p>
              </div>

              <div className="landingKoelogs__showcaseDots" role="tablist" aria-label="紹介スライドの切り替え">
                {showcaseSlides.map((slide, index) => (
                  <button
                    key={slide.title}
                    type="button"
                    className={`landingKoelogs__showcaseDot${index === activeSlideIndex ? " is-active" : ""}`}
                    onClick={() => setActiveSlideIndex(index)}
                    role="tab"
                    aria-selected={index === activeSlideIndex}
                    aria-label={`${slide.eyebrow} を表示`}
                  />
                ))}
              </div>

              <div className="landingKoelogs__showcaseActions">
                <h3 className="landingKoelogs__showcaseActionTitle">まずはアプリを試してみてください</h3>
                <p className="landingKoelogs__showcaseActionLead">ログイン不要で、実際の画面を体験できます。</p>
                <Link to="/log" className="landingKoelogs__button landingKoelogs__showcasePrimaryButton">
                  ゲストで試す
                </Link>
                <div className="landingKoelogs__showcaseActionLinks">
                  <Link to="/login" className="landingKoelogs__showcaseActionLink">
                    ログイン
                  </Link>
                  <span className="landingKoelogs__showcaseActionDivider" aria-hidden="true">
                    /
                  </span>
                  <Link to="/signup" className="landingKoelogs__showcaseActionLink">
                    新規登録
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
