import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  confirmCheckoutSession,
  createBillingPortalSession,
  createCheckoutSession,
  refreshBillingSubscription,
  type BillingCycle,
} from "../api/billing";
import PremiumPlanContent from "../features/premium/PremiumPlanContent";
import { useAuth } from "../features/auth/useAuth";
import "./PremiumPlanPage.css";

const BILLING_CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: "1か月プラン",
  quarterly: "3か月プラン",
};

export default function PremiumPlanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { me, isLoading, refresh } = useAuth();
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handledSessionIdRef = useRef<string | null>(null);
  const refreshedStatusRef = useRef(false);

  const handleBack = () => {
    navigate("/log");
  };

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");

    if (checkout === "cancelled") {
      setNotice({ tone: "info", message: "決済はキャンセルされました。" });
      navigate("/premium", { replace: true });
      return;
    }

    if (checkout !== "success" || !sessionId || handledSessionIdRef.current === sessionId) return;

    handledSessionIdRef.current = sessionId;
    setIsSubmitting(true);

    void (async () => {
      try {
        await confirmCheckoutSession(sessionId);
        await refresh();
        setNotice({ tone: "success", message: "プレミアムプランを開始しました。" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "購入結果の反映に失敗しました。";
        setNotice({ tone: "error", message });
      } finally {
        setIsSubmitting(false);
        navigate("/premium", { replace: true });
      }
    })();
  }, [navigate, refresh, searchParams]);

  useEffect(() => {
    if (isLoading || !me || refreshedStatusRef.current) return;
    if (me.plan_tier !== "premium" && !me.stripe_subscription_status) return;

    refreshedStatusRef.current = true;
    void (async () => {
      try {
        await refreshBillingSubscription();
        await refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "契約状態の更新に失敗しました。";
        setNotice((prev) => prev ?? { tone: "error", message });
      }
    })();
  }, [isLoading, me, refresh]);

  const handlePrimaryAction = async (billingCycle: BillingCycle) => {
    if (!me) {
      navigate("/login");
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const url =
        me.plan_tier === "premium"
          ? await createBillingPortalSession()
          : await createCheckoutSession(billingCycle);
      window.location.assign(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "決済ページの起動に失敗しました。";
      setNotice({ tone: "error", message });
      setIsSubmitting(false);
    }
  };

  const ctaLabel =
    isLoading || isSubmitting
      ? "処理中..."
      : me?.plan_tier === "premium"
        ? "契約を管理"
        : me
          ? "プレミアムを開始"
          : "ログインして開始";
  const isPremiumActive = me?.premium_access_active ?? false;
  const currentPlanLabel =
    me?.billing_cycle === "monthly" || me?.billing_cycle === "quarterly"
      ? BILLING_CYCLE_LABEL[me.billing_cycle]
      : null;
  const currentPeriodEndLabel = formatPeriodEnd(me?.stripe_current_period_end ?? null);
  const statusTitle = isPremiumActive
    ? me?.stripe_cancel_at_period_end
      ? "解約予定があります"
      : "プレミアム利用中"
    : "無料プラン";
  const statusBody = isPremiumActive
    ? me?.stripe_cancel_at_period_end
      ? `${currentPeriodEndLabel ?? "次回更新日"} までPremiumを利用できます。以降は無料プランへ切り替わります。`
      : `${currentPeriodEndLabel ?? "次回更新日未取得"} に自動更新されます。プラン変更や解約は契約管理から行えます。`
    : "Premiumを開始すると、月ログ比較やCSV出力などの制限機能をすぐに解放できます。";

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
      <div className="premiumPlanPageWrap">
        {notice ? (
          <div className={`premiumPlanNotice premiumPlanNotice--${notice.tone}`}>
            {notice.message}
          </div>
        ) : null}
        <section className={`premiumPlanStatus${isPremiumActive ? " is-active" : ""}${me?.stripe_cancel_at_period_end ? " is-canceling" : ""}`}>
          <div className="premiumPlanStatus__eyebrow">
            {currentPlanLabel ?? "PLAN STATUS"}
          </div>
          <div className="premiumPlanStatus__title">{statusTitle}</div>
          <div className="premiumPlanStatus__body">{statusBody}</div>
          {isPremiumActive && currentPeriodEndLabel ? (
            <div className="premiumPlanStatus__meta">
              {me?.stripe_cancel_at_period_end ? "利用終了予定日" : "次回更新日"}: {currentPeriodEndLabel}
            </div>
          ) : null}
        </section>
        <PremiumPlanContent
          mode="page"
          onPrimaryAction={handlePrimaryAction}
          ctaLabel={ctaLabel}
          ctaDisabled={isLoading || isSubmitting}
        />
      </div>
    </div>
  );
}

function formatPeriodEnd(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
}
