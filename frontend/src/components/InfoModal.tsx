import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import "./InfoModal.css";

type Props = {
  title: string;
  children: ReactNode;
  triggerClassName?: string;
  bodyClassName?: string;
  closeLabel?: string;
  triggerContent?: ReactNode;
  triggerAriaLabel?: string;
};

export default function InfoModal({
  title,
  children,
  triggerClassName,
  bodyClassName,
  closeLabel = "閉じる",
  triggerContent,
  triggerAriaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
        <div
          className="infoModal__overlay uiModalBackdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOpen(false)}
        >
          <section className="card infoModal__card uiModalPanel" onClick={(event) => event.stopPropagation()}>
            <div className="infoModal__head uiModalHeader">
              <h2 id={titleId} className="infoModal__title uiModalTitle">
                {title}
              </h2>
              <button type="button" className="infoModal__close uiButton uiButton--secondary" onClick={() => setOpen(false)}>
                {closeLabel}
              </button>
            </div>
            <div className={bodyClassName ? `infoModal__body ${bodyClassName}` : "infoModal__body"}>{children}</div>
          </section>
        </div>,
        document.body
      )
      : null;

  return (
    <>
      <button
        type="button"
        className={triggerClassName ? `infoModal__trigger ${triggerClassName}` : "infoModal__trigger"}
        onClick={() => setOpen(true)}
        aria-label={triggerAriaLabel ?? `${title}の説明を開く`}
      >
        {triggerContent ?? (
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <text x="12" y="12.45" className="infoModal__triggerText" textAnchor="middle" dominantBaseline="middle">
              i
            </text>
          </svg>
        )}
      </button>
      {modal}
    </>
  );
}
