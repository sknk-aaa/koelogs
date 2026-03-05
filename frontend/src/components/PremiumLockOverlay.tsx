import "./PremiumLockOverlay.css";

type Props = {
  onClick?: () => void;
  message?: string;
  subMessage?: string;
  className?: string;
};

export default function PremiumLockOverlay({
  onClick,
  message = "プレミアムプランで解放されます",
  subMessage = "タップして詳細を見る",
  className,
}: Props) {
  return (
    <button
      type="button"
      className={`premiumLock ${className ? ` ${className}` : ""}`}
      onClick={onClick}
    >
      <div className="premiumLock__mosaic" aria-hidden="true" />
      <div className="premiumLock__content">
        <div className="premiumLock__title">{message}</div>
        <div className="premiumLock__sub">{subMessage}</div>
      </div>
    </button>
  );
}
