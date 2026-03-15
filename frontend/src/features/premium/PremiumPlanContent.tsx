import { useState, type ReactNode } from "react";
import BrandLogo from "../../components/BrandLogo";
import WaveDivider from "./components/WaveDivider";
import "../../pages/PremiumPlanPage.css";

type Benefit = {
  icon: "trend" | "ai" | "compare" | "replay" | "csv" | "future";
  title: string;
  sub: string;
};

type CompareRow = {
  feature: string;
  free: string;
};

const BENEFITS: Benefit[] = [
  { icon: "trend", title: "分析を深く見る", sub: "長期推移や履歴をまとめて確認" },
  { icon: "ai", title: "AIを無制限で深掘り", sub: "おすすめを何度でも相談できる" },
  { icon: "compare", title: "全期間で伸びを比較", sub: "30/90/365日で変化が追える" },
  { icon: "replay", title: "録音で精度を上げる", sub: "音源と重ねて聞き直せる" },
  { icon: "csv", title: "CSV出力で検証する", sub: "必要な期間・指標だけをまとめて保存" },
  { icon: "future", title: "今後追加される新機能", sub: "アップデートを継続して提供" },
];

const COMPARE_ROWS: CompareRow[] = [
  { feature: "AI無制限相談", free: "1回/日" },
  { feature: "推移グラフの開放", free: "7日のみ" },
  { feature: "測定履歴の閲覧", free: "最新1件" },
  { feature: "録音重ね再生", free: "—" },
  { feature: "録音を保存", free: "—" },
  { feature: "CSV出力", free: "—" },
  { feature: "今後追加される新機能", free: "—" },
];

export type BillingCycle = "monthly" | "quarterly";

type Props = {
  mode?: "page" | "modal";
  onDismiss?: () => void;
  onPrimaryAction?: (cycle: BillingCycle) => void;
  ctaLabel?: string;
  ctaDisabled?: boolean;
};

function renderBenefitIcon(kind: Benefit["icon"]): ReactNode {
  if (kind === "trend") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M4 19V6" />
        <path d="M4 19H14" />
        <path d="M6 15l3-3 2 2 3-4" />
        <circle className="premiumPlanPage__benefitAccent" cx="17.5" cy="16.5" r="3" />
        <path className="premiumPlanPage__benefitAccent" d="M19.7 18.7L21 20" />
      </svg>
    );
  }
  if (kind === "ai") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M6 17l-2.5 2.5V7a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6z" />
        <path className="premiumPlanPage__benefitAccent" d="M16.5 6.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" />
        <path d="M7.5 11.5h6" />
      </svg>
    );
  }
  if (kind === "compare") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M6 19V12" />
        <path d="M10 19V9" />
        <path d="M14 19V14" />
        <path d="M18 19V7" />
        <path d="M4 19H20" />
        <path className="premiumPlanPage__benefitAccent" d="M8 6h8" />
        <path className="premiumPlanPage__benefitAccent" d="M14 4l2 2-2 2" />
      </svg>
    );
  }
  if (kind === "replay") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3z" />
        <path d="M7 11a5 5 0 0 0 10 0" />
        <path d="M12 16v3" />
        <path d="M9 19h6" />
        <path className="premiumPlanPage__benefitAccent" d="M18.5 10.5v3" />
        <path className="premiumPlanPage__benefitAccent" d="M20.5 9.5v5" />
      </svg>
    );
  }
  if (kind === "csv") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path className="premiumPlanPage__benefitAccent" d="M12 11v6" />
        <path className="premiumPlanPage__benefitAccent" d="M9.5 14.5L12 17l2.5-2.5" />
      </svg>
    );
  }
  if (kind === "future") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <rect x="4" y="4" width="6" height="6" rx="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1.5" />
        <rect className="premiumPlanPage__benefitAccent" x="14" y="14" width="6" height="6" rx="1.5" />
      </svg>
    );
  }
  return null;
}

export default function PremiumPlanContent({
  mode = "page",
  onDismiss,
  onPrimaryAction,
  ctaLabel = "プレミアムを開始",
  ctaDisabled = false,
}: Props) {
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>("quarterly");

  const handleSelectCycle = (cycle: BillingCycle) => {
    setSelectedCycle(cycle);
  };

  return (
    <div className={`premiumPlanPage${mode === "modal" ? " premiumPlanPage--modal" : ""}`}>
      <div className="premiumPlanPage__main">
        <section className="premiumPlanPage__heroZone">
          <div className="premiumPlanPage__hero" aria-label="プレミアムプラン概要">
            <div className="premiumPlanPage__badge">PREMIUM</div>
            <div className="premiumPlanPage__heroVisual" aria-hidden="true">
              <BrandLogo decorative className="premiumPlanPage__heroLogo" />
            </div>
            <h1 className="premiumPlanPage__heading">プレミアムプラン</h1>
            <p className="premiumPlanPage__heroSub">あなたに合った最適なトレーニングを見つける。</p>
          </div>
        </section>

        <WaveDivider
          topColor="var(--premium-wave-hero-top)"
          bottomColor="var(--premium-wave-hero-bottom)"
        />

        <section className="premiumPlanPage__whiteZone">
          <section className="premiumPlanPage__benefits" aria-label="ベネフィット一覧">
            <ul className="premiumPlanPage__benefitList">
              {BENEFITS.map((benefit) => (
                <li key={benefit.title} className="premiumPlanPage__benefitRow">
                  <div className="premiumPlanPage__benefitIcon" aria-hidden="true">
                    {renderBenefitIcon(benefit.icon)}
                  </div>
                  <div className="premiumPlanPage__benefitText">
                    <p className="premiumPlanPage__benefitTitle">{benefit.title}</p>
                    <p className="premiumPlanPage__benefitSub">{benefit.sub}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="premiumPlanPage__assurance" aria-label="安心情報">
            <span className="premiumPlanPage__assuranceIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M12 3 5.5 6v5.4c0 4.2 2.8 7.9 6.5 9.1 3.7-1.2 6.5-4.9 6.5-9.1V6z" />
                <path d="m9.2 12.6 1.9 1.9 3.7-3.7" />
              </svg>
            </span>
            <p className="premiumPlanPage__assuranceMain">いつでも解約できます</p>
            <p className="premiumPlanPage__assuranceSub">プラン変更後も、これまでのデータは保持されます。</p>
          </section>
        </section>

        <WaveDivider
          topColor="var(--premium-wave-mid-top)"
          bottomColor="var(--premium-wave-mid-bottom)"
          flipped
        />

        <section className="premiumPlanPage__blueZone">
          <section className="premiumPlanPage__compare" aria-label="無料とPremiumの比較">
            <h2 className="premiumPlanPage__compareHeading">プレミアムプランでできること</h2>
            <div className="premiumPlanPage__compareWrap">
              <table className="premiumPlanPage__compareTable">
                <colgroup>
                  <col className="premiumPlanPage__colFeature" />
                  <col className="premiumPlanPage__colFree" />
                  <col className="premiumPlanPage__colPremium" />
                </colgroup>
                <thead>
                  <tr>
                    <th aria-hidden="true" />
                    <th>無料</th>
                    <th>Premium</th>
                  </tr>
                </thead>
                <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row">{row.feature}</th>
                    <td className={`premiumPlanPage__freeCell${row.free === "—" ? "" : " is-value"}`}>{row.free}</td>
                    <td className="premiumPlanPage__premiumCell">✓</td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </section>

        </section>
      </div>

      <section className="premiumPlanPage__pricing" aria-label="料金プラン">
        <div className="premiumPlanPage__pricingGrid">
          <button
            type="button"
            className={`premiumPlanPage__planCard${selectedCycle === "monthly" ? " is-selected" : ""}`}
            aria-label="1か月プランを選択"
            onClick={() => handleSelectCycle("monthly")}
          >
            <div className="premiumPlanPage__planHead">1か月</div>
            <div className="premiumPlanPage__planPrice">
              ¥980
              <span>/月</span>
            </div>
            <div className="premiumPlanPage__planFoot">まずは短期で試す</div>
          </button>

          <button
            type="button"
            className={`premiumPlanPage__planCard premiumPlanPage__planCard--highlight${selectedCycle === "quarterly" ? " is-selected" : ""}`}
            aria-label="3か月プランを選択"
            onClick={() => handleSelectCycle("quarterly")}
          >
            <div className="premiumPlanPage__planBadge">15%OFF</div>
            <div className="premiumPlanPage__planHead">3か月</div>
            <div className="premiumPlanPage__planPrice">
              ¥2,499
              <span>/3か月</span>
            </div>
            <div className="premiumPlanPage__planSub">実質 ¥833/月</div>
            <div className="premiumPlanPage__planFoot">継続して試すならこちら</div>
          </button>
        </div>

        <div className="premiumPlanPage__actions">
          <button
            type="button"
            className="premiumPlanPage__cta"
            disabled={ctaDisabled}
            onClick={() => onPrimaryAction?.(selectedCycle)}
          >
            {ctaLabel}
          </button>
          {!!onDismiss && (
            <button type="button" className="premiumPlanPage__secondary" onClick={onDismiss}>
              あとで
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
