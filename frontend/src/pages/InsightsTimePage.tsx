import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { fetchInsights } from "../api/insights";
import type { InsightsData } from "../types/insights";
import DurationHeatmapCalendar from "../features/insights/components/DurationHeatmapCalendar";
import MetronomeLoader from "../components/MetronomeLoader";
import { useAuth } from "../features/auth/useAuth";
import { makeMockInsights } from "../features/insights/mockInsights";
import "./InsightsPages.css";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: InsightsData };

const PERIODS = [30, 90] as const;
const HEATMAP_DAYS = 90;

function formatRange(from: string, to: string) {
  return `${from} 〜 ${to}`;
}

function sumTotalMinutes(data: InsightsData) {
  return data.daily_durations.reduce((sum, p) => sum + (p.duration_min || 0), 0);
}

function maxDailyMinutes(data: InsightsData) {
  let m = 0;
  for (const p of data.daily_durations) m = Math.max(m, p.duration_min || 0);
  return m;
}

export default function InsightsTimePage() {
  const location = useLocation();
  const { me, isLoading: authLoading } = useAuth();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [summaryState, setSummaryState] = useState<LoadState>({ kind: "loading" });
  const [heatmapState, setHeatmapState] = useState<LoadState>({ kind: "loading" });
  const guestMode = !authLoading && !me;
  const guestSummaryData = useMemo(
    () => (guestMode ? makeMockInsights(days) : null),
    [guestMode, days]
  );
  const guestHeatmapData = useMemo(
    () => (guestMode ? makeMockInsights(HEATMAP_DAYS) : null),
    [guestMode]
  );

  useEffect(() => {
    if (authLoading || guestMode) return;

    let cancelled = false;
    (async () => {
      setSummaryState({ kind: "loading" });
      const res = await fetchInsights(days);
      if (cancelled) return;

      if ("error" in res && res.error) {
        setSummaryState({ kind: "error", message: res.error });
        return;
      }
      if (!res.data) {
        setSummaryState({ kind: "error", message: "No data" });
        return;
      }
      setSummaryState({ kind: "ready", data: res.data });
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, days, guestMode]);

  useEffect(() => {
    if (authLoading || guestMode) return;

    let cancelled = false;
    (async () => {
      setHeatmapState({ kind: "loading" });
      const res = await fetchInsights(HEATMAP_DAYS);
      if (cancelled) return;

      if ("error" in res && res.error) {
        setHeatmapState({ kind: "error", message: res.error });
        return;
      }
      if (!res.data) {
        setHeatmapState({ kind: "error", message: "No data" });
        return;
      }
      setHeatmapState({ kind: "ready", data: res.data });
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, guestMode]);

  const summaryData = guestSummaryData ?? (summaryState.kind === "ready" ? summaryState.data : null);
  const heatmapData = guestHeatmapData ?? (heatmapState.kind === "ready" ? heatmapState.data : null);
  const backTo = ((location.state as { fromPath?: string } | null)?.fromPath) || "/insights";

  const total = useMemo(() => (summaryData ? sumTotalMinutes(summaryData) : 0), [summaryData]);
  const max = useMemo(() => (summaryData ? maxDailyMinutes(summaryData) : 0), [summaryData]);

  const avgPerDay = useMemo(() => {
    if (!summaryData) return 0;
    const denom = Math.max(1, summaryData.range.days);
    return Math.round((total / denom) * 10) / 10;
  }, [summaryData, total]);

  return (
    <div className="page insightsPage insightsTimePage">
      <section className="insightsTimePage__hero">
        <div className="insightsTimePage__heroHead">
          <div className="insightsTimePage__heroCopy">
            <p className="insightsTimePage__sub">期間を切り替えて、練習時間の流れと集計を確認できます。</p>
          </div>
          <Link to={backTo} className="insightsBack">
            戻る
          </Link>
        </div>

        <div className="insightsSegment insightsTimePage__segment">
          {PERIODS.map((p) => {
            const active = p === days;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setDays(p)}
                className={`insightsSegment__btn${active ? " is-active" : ""}`}
              >
                {p} DAYS
              </button>
            );
          })}
        </div>
      </section>

      {guestMode && (
        <section className="insightsTimePage__guest">
          <div className="insightsTimePage__guestTitle">GUEST VIEW</div>
          <div className="insightsTimePage__guestText">
            分析画面の構成は確認できます。個人の練習履歴に基づく詳細データはログイン後に表示されます。
          </div>
        </section>
      )}

      {!guestSummaryData && (summaryState.kind === "loading" || heatmapState.kind === "loading") && (
        <MetronomeLoader label="読み込み中..." />
      )}
      {!guestSummaryData && summaryState.kind === "error" && (
        <div className="insightsError">取得に失敗しました: {summaryState.message}</div>
      )}
      {!guestSummaryData && heatmapState.kind === "error" && (
        <div className="insightsError">取得に失敗しました: {heatmapState.message}</div>
      )}

      {summaryData && heatmapData && (
        <div className="insightsTimePage__stack">
          <section className="insightsTimePage__section">
            <div className="insightsTimePage__sectionHead">
              <div className="insightsTimePage__sectionHeadMain">
                <span className="insightsTimePage__sectionIcon" aria-hidden="true">
                  <SummaryIcon />
                </span>
                <div className="insightsTimePage__sectionEyebrow">SUMMARY</div>
              </div>
            </div>

            <div className="insightsStats insightsTimePage__stats">
              <Stat label="合計" value={`${total} 分`} />
              <Stat label="平均（分/日）" value={`${avgPerDay}`} />
              <Stat label="最大" value={`${max} 分`} />
              <Stat label="練習日数" value={`${summaryData.practice_days_count} 日`} />
            </div>

            <div className="insightsMuted insightsTimePage__muted">
              期間: {formatRange(summaryData.range.from, summaryData.range.to)}
            </div>
          </section>

          <section className="insightsTimePage__section">
            <div className="insightsTimePage__sectionHead">
              <div className="insightsTimePage__sectionHeadMain">
                <span className="insightsTimePage__sectionIcon" aria-hidden="true">
                  <CalendarIcon />
                </span>
                <div className="insightsTimePage__sectionEyebrow">CALENDAR</div>
              </div>
            </div>

            <div className="insightsTimePage__calendarShell">
              <DurationHeatmapCalendar points={heatmapData.daily_durations} />
            </div>
            <div className="insightsMuted insightsTimePage__muted">
              色分けカレンダーは直近 {HEATMAP_DAYS} 日固定表示です
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="insightsStat">
      <div className="insightsStat__label">{label}</div>
      <div className="insightsStat__value">{value}</div>
    </div>
  );
}

function SummaryIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <path className="accent" d="M8 10H16" />
      <path d="M8 14H12" />
      <path d="M15.5 14L17 15.5L19 12.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="5.5" width="16" height="14" rx="3" />
      <path className="accent" d="M8 3.5V7.5" />
      <path className="accent" d="M16 3.5V7.5" />
      <path d="M4 9.5H20" />
      <path d="M8 13H10" />
      <path d="M12 13H14" />
      <path d="M8 16H10" />
      <path d="M12 16H14" />
    </svg>
  );
}
