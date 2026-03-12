import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./TutorialModal.css";

type Props = {
  open: boolean;
  badge?: string;
  title: string;
  paragraphs: string[];
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose?: () => void;
};

export default function TutorialModal({
  open,
  badge = "TUTORIAL",
  title,
  paragraphs,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="tutorialModal__overlay" role="dialog" aria-modal="true" aria-label="チュートリアル">
      <button
        type="button"
        className="tutorialModal__backdrop uiModalBackdrop"
        onClick={() => onClose?.()}
        aria-label="モーダルを閉じる"
      />
      <section className="tutorialModal__card uiModalPanel">
        <div className="tutorialModal__badge">{badge}</div>
        <h2 className="tutorialModal__title uiModalTitle">{title}</h2>
        <div className="tutorialModal__body">
          {paragraphs.map((line, idx) => (
            <p key={`${line}-${idx}`} className="tutorialModal__paragraph">
              {line}
            </p>
          ))}
        </div>
        <div className="tutorialModal__actions">
          <button type="button" className="tutorialModal__btn tutorialModal__btn--primary uiButton uiButton--primary" onClick={onPrimary}>
            {primaryLabel}
          </button>
          {secondaryLabel && (
            <button type="button" className="tutorialModal__btn tutorialModal__btn--sub uiButton uiButton--secondary" onClick={onSecondary}>
              {secondaryLabel}
            </button>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
}
