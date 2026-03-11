import { useEffect } from "react";
import "./welcomeGuideModal.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onStartRecord: () => void;
  onOpenGuide: () => void;
};

function isEsc(e: KeyboardEvent) {
  return e.key === "Escape";
}

export default function WelcomeGuideModal({ open, onClose, onStartRecord, onOpenGuide }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (isEsc(e)) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="wgm__overlay" role="dialog" aria-modal="true" aria-label="welcome guide">
      <button className="wgm__backdrop uiModalBackdrop" onClick={onClose} aria-label="close guide" />
      <section className="wgm__panel uiModalPanel">
        <div className="wgm__title">voice-appへようこそ！</div>
        <p className="wgm__lead">まずは現在の最高音や声の状態を記録してみましょう。</p>
        <p className="wgm__sub">記録をもとに、AIが今週のおすすめトレーニングを提案します。</p>

        <div className="wgm__actions">
          <button type="button" className="wgm__btn uiButton uiButton--secondary" onClick={onClose}>
            あとで見る
          </button>
          <button type="button" className="wgm__btn wgm__btn--primary uiButton uiButton--primary" onClick={onStartRecord}>
            記録する
          </button>
        </div>
        <button type="button" className="wgm__helpLink" onClick={onOpenGuide}>
          使い方を見る（1分）
        </button>
      </section>
    </div>
  );
}
