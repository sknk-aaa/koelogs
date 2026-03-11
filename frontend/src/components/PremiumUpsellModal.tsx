import { useEffect, type CSSProperties } from "react";
import "./PremiumUpsellModal.css";

type GrowthTone = "up" | "down" | "flat";
type GrowthItem = {
  label: string;
  before: string;
  after: string;
  delta: string;
  tone?: GrowthTone;
};
type FlowStep = {
  title: string;
  sub: string;
  pill?: string;
};

type Props = {
  open: boolean;
  kicker?: string;
  title?: string;
  description?: string;
  valueLine?: string;
  note?: string;
  noteVariant?: "default" | "quote";
  footerNote?: string;
  benefits?: string[];
  benefitsPanel?: boolean;
  ambientArtSrc?: string;
  ambientArtOpacity?: number;
  growthTitle?: string;
  growthItems?: GrowthItem[];
  statsTitle?: string;
  statsLines?: string[];
  flowTitle?: string;
  flowSteps?: FlowStep[];
  flowBackgroundImageSrc?: string;
  flowBackgroundOpacity?: number;
  previewImageSrc?: string;
  previewImageAlt?: string;
  previewCaption?: string;
  previewMode?: "default" | "screenshot";
  variant?: "default" | "lp";
  ctaLabel?: string;
  onClose: () => void;
  onCta?: () => void;
};

export default function PremiumUpsellModal({
  open,
  kicker = "PREMIUM",
  title = "プレミアムプランで解放されます",
  description = "この機能はプレミアムプランで利用できます。",
  valueLine,
  note,
  noteVariant = "default",
  footerNote,
  benefits,
  benefitsPanel = false,
  ambientArtSrc,
  ambientArtOpacity,
  growthTitle,
  growthItems,
  statsTitle,
  statsLines,
  flowTitle,
  flowSteps,
  flowBackgroundImageSrc,
  flowBackgroundOpacity,
  previewImageSrc,
  previewImageAlt = "",
  previewCaption,
  previewMode = "default",
  variant = "default",
  ctaLabel = "プランを見る",
  onClose,
  onCta,
}: Props) {
  const flowSectionStyle: CSSProperties | undefined = flowBackgroundImageSrc
    ? ({
        "--premium-flow-bg": `url("${flowBackgroundImageSrc}")`,
        "--premium-flow-opacity": String(flowBackgroundOpacity ?? 0.18),
      } as CSSProperties)
    : undefined;
  const cardStyle: CSSProperties | undefined = ambientArtSrc
    ? ({
        "--premium-ambient-art": `url("${ambientArtSrc}")`,
        "--premium-ambient-opacity": String(ambientArtOpacity ?? 0.08),
      } as CSSProperties)
    : undefined;

  useEffect(() => {
    document.body.classList.toggle("premiumModal--open", open);
    return () => {
      document.body.classList.remove("premiumModal--open");
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="premiumModal__overlay uiModalBackdrop" role="presentation" onClick={onClose}>
      <section
        className={`premiumModal__card uiModalPanel ${variant === "lp" ? "is-lp" : ""}${ambientArtSrc ? " premiumModal__card--ambient" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="プレミアムプランの案内"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {!!previewImageSrc && (
          <div className={`premiumModal__preview ${previewMode === "screenshot" ? "is-screenshot" : ""}`}>
            <img src={previewImageSrc} alt={previewImageAlt} className="premiumModal__previewImg" />
            {!!previewCaption && <div className="premiumModal__previewCaption">{previewCaption}</div>}
          </div>
        )}
        <div className="premiumModal__kicker">{kicker}</div>
        <div className="premiumModal__title">{title}</div>
        <div className="premiumModal__desc">{description}</div>
        {!!valueLine && <div className="premiumModal__valueLine">{valueLine}</div>}
        {(variant === "lp" && (growthTitle || (growthItems && growthItems.length > 0))) && (
          <section className="premiumModal__lpSection">
            {!!growthTitle && <div className="premiumModal__lpSectionTitle">{growthTitle}</div>}
            {!!growthItems?.length && (
              <ul className="premiumModal__lpGrowthList">
                {growthItems.slice(0, 4).map((item) => (
                  <li key={`${item.label}-${item.before}-${item.after}`} className="premiumModal__lpGrowthItem">
                    <span className={`premiumModal__lpGrowthStatus is-${item.tone ?? "up"}`}>
                      {item.tone === "down" ? "要確認" : item.tone === "flat" ? "維持" : "改善"}
                    </span>
                    <div className="premiumModal__lpGrowthLabel">{item.label}</div>
                    <div className="premiumModal__lpGrowthValues">
                      <span className="premiumModal__lpGrowthBefore">{item.before}</span>
                      <span className="premiumModal__lpGrowthArrow" aria-hidden="true">→</span>
                      <span className="premiumModal__lpGrowthAfter">{item.after}</span>
                    </div>
                    <div className={`premiumModal__lpGrowthDelta is-${item.tone ?? "up"}`}>{item.delta}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {(variant === "lp" && (statsTitle || (statsLines && statsLines.length > 0)) && !growthItems?.length) && (
          <section className="premiumModal__lpSection">
            {!!statsTitle && <div className="premiumModal__lpSectionTitle">{statsTitle}</div>}
            {!!statsLines?.length && (
              <ul className="premiumModal__lpStats">
                {statsLines.slice(0, 4).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </section>
        )}
        {(variant === "lp" && flowSteps?.length) && (
          <section
            className={`premiumModal__lpSection premiumModal__lpSection--features${!flowTitle ? " premiumModal__lpSection--noTitle" : ""}`}
            style={flowSectionStyle}
          >
            {!!flowTitle && <div className="premiumModal__lpSectionTitle">{flowTitle}</div>}
            <ol className="premiumModal__lpFlow" aria-label="Premiumで起きること">
              {flowSteps.slice(0, 3).map((step, index) => (
                <li key={`${step.title}-${step.sub}`} className="premiumModal__lpFlowItem">
                  <span className="premiumModal__lpFlowIndex" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="premiumModal__lpFlowBody">
                    <div className="premiumModal__lpFlowHead">
                      <div className="premiumModal__lpFlowTitle">{step.title}</div>
                      {!!step.pill && <span className="premiumModal__lpFlowPill">{step.pill}</span>}
                    </div>
                    <div className="premiumModal__lpFlowSub">{step.sub}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
        {!!note && <div className={`premiumModal__note ${noteVariant === "quote" ? "is-quote" : ""}`}>{note}</div>}
        {!!benefits?.length && (
          <div className={`premiumModal__benefitsWrap${benefitsPanel ? " premiumModal__benefitsWrap--panel" : ""}`}>
            <ul className="premiumModal__benefits">
              {benefits.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="premiumModal__actions">
          <button type="button" className="premiumModal__btn premiumModal__btn--primary uiButton uiButton--primary" onClick={onCta}>
            {ctaLabel}
          </button>
          <button type="button" className="premiumModal__btn uiButton uiButton--secondary" onClick={onClose}>
            あとで
          </button>
        </div>
        {!!footerNote && <div className="premiumModal__footerNote">{footerNote}</div>}
      </section>
    </div>
  );
}
