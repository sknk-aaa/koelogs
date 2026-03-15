import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBillingPortalSession, refreshBillingSubscription, type BillingCycle } from "../api/billing";
import { useAuth } from "../features/auth/useAuth";
import "./PlanPage.css";

const BILLING_CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: "Premium 1か月プラン",
  quarterly: "Premium 3か月プラン",
};

const BILLING_CYCLE_NAME: Record<BillingCycle, string> = {
  monthly: "1か月プラン",
  quarterly: "3か月プラン",
};

function renderPlanSectionIcon(kind: "status" | "manage"): React.ReactNode {
  if (kind === "status") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
        <path d="M3.5 10h17" />
        <path className="accent" d="M7 14h4" />
        <path className="accent" d="M14 14h3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-1.9-3.2-2.4 1a7.7 7.7 0 0 0-1.9-1.1l-.3-2.5h-3.8l-.3 2.5a7.7 7.7 0 0 0-1.9 1.1l-2.4-1-1.9 3.2 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.1l-2 1.5 1.9 3.2 2.4-1a7.7 7.7 0 0 0 1.9 1.1l.3 2.5h3.8l.3-2.5a7.7 7.7 0 0 0 1.9-1.1l2.4 1 1.9-3.2-2-1.5c.1-.3.1-.7.1-1.1Z" />
    </svg>
  );
}

function formatBillingDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
}

export default function PlanPage() {
  const navigate = useNavigate();
  const { me, refresh } = useAuth();
  const [notice, setNotice] = useState<{ tone: "error" | "info"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!me) {
    return (
      <div className="page planPage">
        <section className="planPage__section">
          <p className="planPage__sub">ログインしてください。</p>
        </section>
      </div>
    );
  }

  const hasPremiumPlan = me.plan_tier === "premium";
  const isCanceling = hasPremiumPlan && Boolean(me.stripe_cancel_at_period_end);
  const currentPlanName =
    hasPremiumPlan && (me.billing_cycle === "monthly" || me.billing_cycle === "quarterly")
      ? BILLING_CYCLE_NAME[me.billing_cycle]
      : "無料プラン";
  const currentPlanLabel =
    hasPremiumPlan && (me.billing_cycle === "monthly" || me.billing_cycle === "quarterly")
      ? BILLING_CYCLE_LABEL[me.billing_cycle]
      : "Free";
  const currentPeriodEndLabel = formatBillingDate(me.stripe_current_period_end);

  const handlePrimaryAction = async () => {
    if (!hasPremiumPlan) {
      navigate("/premium");
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const url = await createBillingPortalSession();
      window.location.assign(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "契約管理ページの起動に失敗しました。";
      setNotice({ tone: "error", message });
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setIsSubmitting(true);
    setNotice(null);

    try {
      await refreshBillingSubscription();
      await refresh();
      setNotice({ tone: "info", message: "契約状態を更新しました。" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "契約状態の更新に失敗しました。";
      setNotice({ tone: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page planPage">
      <section className="planPage__hero">
        <h1 className="planPage__heroTitle">{hasPremiumPlan ? "プラン管理" : "プレミアムプラン"}</h1>
        <p className="planPage__heroSub">
          {hasPremiumPlan
            ? "現在の契約状態を確認し、解約や支払い情報の変更はStripeの管理画面から行えます。"
            : "現在はFreeプランです。Premiumに加入すると、制限中の機能をすぐに使えます。"}
        </p>
      </section>

      {notice ? <div className={`planPage__notice planPage__notice--${notice.tone}`}>{notice.message}</div> : null}

      <section className="planPage__card planPage__card--status">
        <div className="planPage__cardHeader">
          <div className="planPage__cardLabelRow">
            <span className="planPage__sectionLabelIcon" aria-hidden="true">
              {renderPlanSectionIcon("status")}
            </span>
            <div className="planPage__sectionLabel">現在のプラン</div>
          </div>
          {isCanceling ? <div className="planPage__summaryBadge is-canceling">解約予定</div> : null}
        </div>

        <div className={`planPage__summary${hasPremiumPlan ? " is-active" : ""}`}>
          <div className="planPage__summaryTop">
            <div className="planPage__summaryPlan">{hasPremiumPlan ? "Premium" : "Free"}</div>
            <div className="planPage__summaryName">{currentPlanName}</div>
          </div>

          <div className="planPage__fieldBlock">
            <div className="planPage__key">{hasPremiumPlan ? (isCanceling ? "有効期限" : "次回更新日") : "現在のプラン"}</div>
            <div className={`planPage__value${hasPremiumPlan && currentPeriodEndLabel ? " is-date" : ""}`}>
              {hasPremiumPlan ? (currentPeriodEndLabel ?? "未設定") : currentPlanLabel}
            </div>
          </div>

          <p className="planPage__detail">
            {hasPremiumPlan
              ? isCanceling
                ? `${currentPeriodEndLabel ?? "契約期間終了日"} まではPremiumを利用できます。以降は無料プランへ切り替わります。`
                : "現在ご利用中です。プラン変更、解約、支払い情報の変更は契約管理から行えます。"
              : "現在はFreeプランです。Premiumに加入すると、制限中の機能をすぐに使えます。"}
          </p>
        </div>
      </section>

      <section className="planPage__card planPage__card--manage">
        <div className="planPage__cardHeader">
          <div className="planPage__cardLabelRow">
            <span className="planPage__sectionLabelIcon" aria-hidden="true">
              {renderPlanSectionIcon("manage")}
            </span>
            <div className="planPage__sectionLabel">管理</div>
          </div>
        </div>

        <div className="planPage__actions">
          <button type="button" className="planPage__button" onClick={handlePrimaryAction} disabled={isSubmitting}>
            {isSubmitting ? "処理中..." : hasPremiumPlan ? "契約を管理" : "プレミアムプランを見る"}
          </button>
          {hasPremiumPlan ? (
            <button type="button" className="planPage__button planPage__button--ghost" onClick={handleRefresh} disabled={isSubmitting}>
              状態を更新
            </button>
          ) : null}
          {hasPremiumPlan ? (
            <button type="button" className="planPage__button planPage__button--ghost" onClick={() => navigate("/premium")}>
              プラン詳細を見る
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
