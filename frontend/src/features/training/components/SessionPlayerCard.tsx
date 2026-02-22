import type { ReactNode } from "react";

type SessionPlayerCardProps = {
  art: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  beforeTransport?: ReactNode;
  transport: ReactNode;
  footer?: ReactNode;
  className?: string;
  active?: boolean;
  showWave?: boolean;
};

export default function SessionPlayerCard({
  art,
  title,
  subtitle,
  description,
  error,
  beforeTransport,
  transport,
  footer,
  className,
  active = false,
  showWave = true,
}: SessionPlayerCardProps) {
  const rootClass = [
    "trainingPage__measurementPlayer",
    active ? "is-recording" : "",
    className ?? "",
  ]
    .join(" ")
    .trim();

  return (
    <div className={rootClass}>
      <div className="trainingPage__measurementPlayerArt">{art}</div>

      <div className="trainingPage__measurementPlayerMeta">
        {title != null && <div className="trainingPage__measurementPlayerName">{title}</div>}
        {subtitle && <div className="trainingPage__measurementPlayerSub">{subtitle}</div>}
        {description && <div className="trainingPage__measurementPlayerDesc">{description}</div>}
      </div>

      {error}

      {beforeTransport}

      <div className="trainingPage__measurementPlayerTransport">{transport}</div>

      {showWave && (
        <div className={`trainingPage__sessionWave${active ? " is-active" : ""}`} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      )}

      {footer && <div className="trainingPage__measurementRecorderSub">{footer}</div>}
    </div>
  );
}
