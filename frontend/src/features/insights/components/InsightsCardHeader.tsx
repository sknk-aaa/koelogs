import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  hintText?: ReactNode;
  hintSub?: ReactNode;
  withChevron?: boolean;
  right?: ReactNode;
};

export default function InsightsCardHeader({
  title,
  eyebrow,
  icon,
  hintText,
  hintSub,
  withChevron = false,
  right,
}: Props) {
  const hasHint = hintText != null || hintSub != null;
  return (
    <div className="insightsCard__head">
      <div className="insightsCard__headMain">
        {eyebrow != null ? (
          <div className="insightsCard__eyebrowRow">
            {icon != null ? (
              <span className="insightsCard__eyebrowIcon" aria-hidden="true">
                {icon}
              </span>
            ) : null}
            <div className="insightsCard__eyebrow">{eyebrow}</div>
          </div>
        ) : null}
        <div className="insightsCard__titleRow">
          {eyebrow == null && icon != null ? (
            <span className="insightsCard__titleIcon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <div className="insightsCard__title">{title}</div>
        </div>
      </div>
      {right ?? (hasHint && (
        <div className="insightsCard__hintBlock">
          {hintText != null && (
            <div className="insightsCard__hint">
              <span className="insightsCard__hintText">{hintText}</span>
              {withChevron && <ChevronRight />}
            </div>
          )}
          {hintSub != null && <div className="insightsCard__hintSub">{hintSub}</div>}
        </div>
      ))}
    </div>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M7.5 4.5L12.8 10L7.5 15.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}
