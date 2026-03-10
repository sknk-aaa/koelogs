import type { ReactNode, Ref } from "react";

import type { MissionItem } from "../../../types/missions";

import "./BeginnerMissionGuide.css";

type MissionGroupKind = "beginner" | "completed" | "daily";

export function renderMissionGroupIcon(kind: MissionGroupKind): ReactNode {
  if (kind === "beginner") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M7 20V4.5" />
        <path className="accent" d="M8 5.5h8l-2.2 3L16 11.5H8Z" />
      </svg>
    );
  }
  if (kind === "daily") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <rect x="5" y="6.5" width="14" height="12" rx="2.2" />
        <path d="M8 4.8v3" />
        <path d="M16 4.8v3" />
        <path className="accent" d="M8.2 11.3h7.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path className="accent" d="m8.5 12.2 2.2 2.2 4.8-5.2" />
    </svg>
  );
}

type BeginnerMissionGuideCardProps = {
  doneCount: number;
  totalCount: number;
  progressPercent: number;
  onClick: () => void;
  expanded?: boolean;
  className?: string;
  buttonRef?: Ref<HTMLButtonElement>;
  title?: string;
  label?: string | null;
  description?: string | null;
};

export function BeginnerMissionGuideCard({
  doneCount,
  totalCount,
  progressPercent,
  onClick,
  expanded,
  className,
  buttonRef,
  title = "ミッションをクリアしよう",
  label = "ビギナーミッション",
  description = null,
}: BeginnerMissionGuideCardProps): ReactNode {
  return (
    <button
      type="button"
      ref={buttonRef}
      className={`beginnerMissionGuide__card ${className ?? ""}`.trim()}
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={expanded}
    >
      <div className="beginnerMissionGuide__title">{title}</div>
      {description ? <div className="beginnerMissionGuide__description">{description}</div> : null}
      <div className="beginnerMissionGuide__metaRow">
        {label ? <span className="beginnerMissionGuide__label">{label}</span> : null}
        <span className="beginnerMissionGuide__count">
          {doneCount} / {totalCount}
        </span>
        <span className="beginnerMissionGuide__arrow" aria-hidden="true">
          ›
        </span>
      </div>
      <span className="beginnerMissionGuide__progressTrack" aria-hidden="true">
        <span className="beginnerMissionGuide__progressFill" style={{ width: `${progressPercent}%` }} />
      </span>
    </button>
  );
}

type BeginnerMissionModalProps = {
  open: boolean;
  onClose: () => void;
  pendingMissions: MissionItem[];
  doneMissions: MissionItem[];
  pendingStatusLabel: string;
  renderPendingAction: (mission: MissionItem) => ReactNode;
  doneLabel?: string;
  ariaLabel?: string;
  closeLabel?: string;
  overlayClassName?: string;
  cardClassName?: string;
  cardBodyClassName?: string;
  closeButtonHidden?: boolean;
  cardOverlay?: ReactNode;
  topContent?: ReactNode;
  extraSections?: ReactNode;
};

export function BeginnerMissionModal({
  open,
  onClose,
  pendingMissions,
  doneMissions,
  pendingStatusLabel,
  renderPendingAction,
  doneLabel = "達成",
  ariaLabel = "ミッション一覧",
  closeLabel = "閉じる",
  overlayClassName,
  cardClassName,
  cardBodyClassName,
  closeButtonHidden = false,
  cardOverlay,
  topContent,
  extraSections,
}: BeginnerMissionModalProps): ReactNode {
  if (!open) return null;

  return (
    <div
      className={`beginnerMissionModal__overlay ${overlayClassName ?? ""}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
    >
      <section
        className={`beginnerMissionModal__card ${cardClassName ?? ""}`.trim()}
        onClick={(event) => event.stopPropagation()}
      >
        {cardOverlay}
        <div className="beginnerMissionModal__head">
          <div className="beginnerMissionModal__headMain">
            <span className="beginnerMissionModal__sectionIcon" aria-hidden="true">
              {renderMissionGroupIcon("beginner")}
            </span>
            <div className="beginnerMissionModal__title">MISSIONS</div>
          </div>
          {!closeButtonHidden && (
            <button type="button" className="beginnerMissionModal__close" onClick={onClose}>
              {closeLabel}
            </button>
          )}
        </div>
        {topContent}
        <div className={`beginnerMissionModal__list ${cardBodyClassName ?? ""}`.trim()}>
          <section className="beginnerMissionModal__group">
            <div className="beginnerMissionModal__groupHead">
              <div className="beginnerMissionModal__groupTitleRow">
                <span className="beginnerMissionModal__groupIcon" aria-hidden="true">
                  {renderMissionGroupIcon("beginner")}
                </span>
                <div className="beginnerMissionModal__groupTitle">BEGINNER</div>
              </div>
              <span className={`beginnerMissionModal__status ${pendingMissions.length === 0 ? "is-done" : "is-pending"}`}>
                {pendingMissions.length === 0 ? "完了" : pendingStatusLabel}
              </span>
            </div>
            {pendingMissions.map((mission) => (
              <article key={mission.key} className="beginnerMissionModal__item">
                <div className="beginnerMissionModal__itemTop">
                  <div className="beginnerMissionModal__itemTitle">{mission.title}</div>
                  <div className="beginnerMissionModal__actionWrap">{renderPendingAction(mission)}</div>
                </div>
              </article>
            ))}
            {doneMissions.length > 0 && (
              <div className="beginnerMissionModal__subgroupRow">
                <span className="beginnerMissionModal__groupIcon" aria-hidden="true">
                  {renderMissionGroupIcon("completed")}
                </span>
                <div className="beginnerMissionModal__subgroupLabel">COMPLETED</div>
              </div>
            )}
            {doneMissions.map((mission) => (
              <article key={mission.key} className="beginnerMissionModal__item is-done">
                <div className="beginnerMissionModal__itemTop">
                  <div className="beginnerMissionModal__itemTitle">{mission.title}</div>
                  <span className="beginnerMissionModal__status is-done">{doneLabel}</span>
                </div>
              </article>
            ))}
          </section>
          {extraSections}
        </div>
      </section>
    </div>
  );
}
