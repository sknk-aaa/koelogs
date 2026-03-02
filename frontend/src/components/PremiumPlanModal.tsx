import { useEffect } from "react";
import PremiumPlanContent from "../features/premium/PremiumPlanContent";
import "./PremiumPlanModal.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function PremiumPlanModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.classList.add("premiumPlanModal--open");
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("premiumPlanModal--open");
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="premiumPlanModal" role="presentation" onClick={onClose}>
      <section
        className="premiumPlanModal__card"
        role="dialog"
        aria-modal="true"
        aria-label="プレミアムプラン詳細"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="premiumPlanModal__header">
          <div className="premiumPlanModal__title">プレミアムプラン</div>
          <button type="button" className="premiumPlanModal__close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>
        <div className="premiumPlanModal__body">
          <PremiumPlanContent mode="modal" onDismiss={onClose} />
        </div>
      </section>
    </div>
  );
}
