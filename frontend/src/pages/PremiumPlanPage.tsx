import { useNavigate } from "react-router-dom";
import PremiumPlanContent from "../features/premium/PremiumPlanContent";
import "./PremiumPlanPage.css";

export default function PremiumPlanPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/log");
  };

  return (
    <div className="premiumPlanShell">
      <header className="premiumPlanHeader">
        <button type="button" className="premiumPlanHeader__back" aria-label="戻る" onClick={handleBack}>
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <h1 className="premiumPlanHeader__title">プレミアムプラン</h1>
      </header>
      <PremiumPlanContent mode="page" />
    </div>
  );
}
