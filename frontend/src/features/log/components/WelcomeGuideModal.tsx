import { useEffect } from "react";
import "./welcomeGuideModal.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onStartRecord: () => void;
};

function isEsc(e: KeyboardEvent) {
  return e.key === "Escape";
}

export default function WelcomeGuideModal({ open, onClose, onStartRecord }: Props) {
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
      <button className="wgm__backdrop" onClick={onClose} aria-label="close guide" />
      <section className="wgm__panel">
        <div className="wgm__title">voice-appへようこそ！</div>
        <p className="wgm__lead">まずは現在の最高音や声の状態を記録してみましょう。</p>
        <p className="wgm__sub">記録をもとに、AIが今日のおすすめトレーニングを提案します。</p>

        <div className="wgm__actions">
          <button type="button" className="wgm__btn" onClick={onClose}>
            あとで見る
          </button>
          <button type="button" className="wgm__btn wgm__btn--primary" onClick={onStartRecord}>
            記録する
          </button>
        </div>
      </section>
    </div>
  );
}
