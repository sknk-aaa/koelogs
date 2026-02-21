import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchInsights } from "../api/insights";
import type { InsightsData, MeasurementPoint } from "../types/insights";
import { useAuth } from "../features/auth/useAuth";
import { makeMockInsights } from "../features/insights/mockInsights";
import NotePitchChart from "../features/insights/components/NotePitchChart";
import MetronomeLoader from "../components/MetronomeLoader";
import "./InsightsPages.css";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: InsightsData };

const PERIODS = [30, 90, 365] as const;
const NOTE_TYPES = [
  { key: "falsetto", label: "裏声" },
  { key: "chest", label: "地声" },
] as const;
const METRIC_TABS = [
  { key: "range", label: "音域(半音)" },
  { key: "long_tone", label: "ロングトーン秒数" },
  { key: "pitch_accuracy", label: "音程正確性" },
  { key: "volume_stability", label: "音量安定性" },
] as const;

function formatDateSlash(iso: string | null): string {
  if (!iso) return "—";
  return iso.replace(/-/g, "/");
}

export default function InsightsNotesPage() {
  const { me, isLoading: authLoading } = useAuth();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [noteType, setNoteType] = useState<(typeof NOTE_TYPES)[number]["key"]>("falsetto");
  const [metricTab, setMetricTab] = useState<(typeof METRIC_TABS)[number]["key"]>("range");
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const guestMode = !authLoading && !me;
  const guestData = useMemo(() => (guestMode ? makeMockInsights(days) : null), [guestMode, days]);

  useEffect(() => {
    if (authLoading || guestMode) return;

    let cancelled = false;
    (async () => {
      setState({ kind: "loading" });
      const res = await fetchInsights(days);
      if (cancelled) return;

      if ("error" in res && res.error) {
        setState({ kind: "error", message: res.error });
        return;
      }
      if (!res.data) {
        setState({ kind: "error", message: "No data" });
        return;
      }
      setState({ kind: "ready", data: res.data });
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, days, guestMode]);

  const data = guestData ?? (state.kind === "ready" ? state.data : null);
  const metricPoints = (data?.measurement_series?.[metricTab] ?? []) as MeasurementPoint[];
  const metricLatest = useMemo(() => {
    for (let i = metricPoints.length - 1; i >= 0; i -= 1) {
      if (metricPoints[i].value != null) return metricPoints[i].value;
    }
    return null;
  }, [metricPoints]);
  const metricBest = useMemo(() => {
    const values = metricPoints.map((p) => p.value).filter((v): v is number => v != null);
    if (values.length === 0) return null;
    return Math.max(...values);
  }, [metricPoints]);

  return (
    <div className="page insightsPage">
      <div className="insightsPage__bg" aria-hidden="true" />

      <section className="card insightsHero">
        <div className="insightsHero__head">
          <div>
            <div className="insightsHero__kicker">Insights</div>
            <h1 className="insightsHero__title">最高音の推移（詳細）</h1>
            <p className="insightsHero__sub">裏声と地声の最高音を日次で確認できます。</p>
          </div>
          <Link to="/insights" className="insightsBack">
            戻る
          </Link>
        </div>

        <div className="insightsSegment">
          {PERIODS.map((p) => {
            const active = p === days;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setDays(p)}
                className={`insightsSegment__btn${active ? " is-active" : ""}`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </section>

      {guestMode && (
        <section className="card insightsGuest">
          <div className="insightsGuest__title">ゲスト表示中</div>
          <div className="insightsGuest__text">
            分析画面の構成は確認できます。個人の練習履歴に基づく詳細データはログイン後に表示されます。
          </div>
        </section>
      )}

      {!guestData && state.kind === "loading" && <MetronomeLoader label="読み込み中..." />}
      {!guestData && state.kind === "error" && <div className="insightsError">取得に失敗しました: {state.message}</div>}

      {data && (
        <div className="insightsStack">
          <section className="insightsCard">
            <div className="insightsCard__head">
              <div className="insightsCard__title">日次推移（{noteType === "falsetto" ? "裏声" : "地声"}）</div>
            </div>
            <div className="insightsSegment" style={{ marginBottom: 10 }}>
              {NOTE_TYPES.map((type) => {
                const active = type.key === noteType;
                return (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => setNoteType(type.key)}
                    className={`insightsSegment__btn${active ? " is-active" : ""}`}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
            <NotePitchChart
              falsetto={data.note_series.falsetto}
              chest={data.note_series.chest}
              showXAxis
              variant={noteType}
            />
            <div className="insightsMuted">欠損日は線をつないで表示し、点のみ省略します。</div>
          </section>

          <section className="insightsCard">
            <div className="insightsCard__head">
              <div className="insightsCard__title">測定成長（トレーニングページ測定）</div>
            </div>
            <div className="insightsSegment" style={{ marginBottom: 10 }}>
              {METRIC_TABS.map((tab) => {
                const active = tab.key === metricTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setMetricTab(tab.key)}
                    className={`insightsSegment__btn${active ? " is-active" : ""}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <SimpleTrendChart points={metricPoints} />
            <div className="insightsSummaryRow" style={{ marginTop: 10 }}>
              <div className="insightsBadge">最新: {formatMetricValue(metricLatest, metricTab)}</div>
              <div className="insightsBadge">最高: {formatMetricValue(metricBest, metricTab)}</div>
            </div>
          </section>

          <section className="insightsCard">
            <div className="insightsCard__head">
              <div className="insightsCard__title">全期間の最高到達音</div>
            </div>
            <div className="insightsKeyValue">
              <div className="insightsKeyValue__k">裏声</div>
              <div className="insightsKeyValue__v">
                {data.top_notes.falsetto.note ?? "—"}
                <span className="insightsKeyValue__sub">（{formatDateSlash(data.top_notes.falsetto.date)}）</span>
              </div>
            </div>
            <div className="insightsKeyValue" style={{ marginTop: 8 }}>
              <div className="insightsKeyValue__k">地声</div>
              <div className="insightsKeyValue__v">
                {data.top_notes.chest.note ?? "—"}
                <span className="insightsKeyValue__sub">（{formatDateSlash(data.top_notes.chest.date)}）</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function formatMetricValue(v: number | null, key: (typeof METRIC_TABS)[number]["key"]) {
  if (v == null) return "—";
  if (key === "range") return `${Math.round(v)}半音`;
  if (key === "long_tone") return `${Number(v).toFixed(1)}秒`;
  return `${Math.round(v)}点`;
}

function SimpleTrendChart({ points }: { points: MeasurementPoint[] }) {
  const width = 760;
  const height = 180;
  const pad = 18;
  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  const max = values.length ? Math.max(...values) : 1;
  const min = values.length ? Math.min(...values) : 0;
  const range = Math.max(1, max - min);
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;

  let d = "";
  points.forEach((p, i) => {
    if (p.value == null) return;
    const x = pad + step * i;
    const y = height - pad - ((p.value - min) / range) * (height - pad * 2);
    d += d.length === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", minWidth: 520, height: 190 }} aria-hidden="true">
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="rgba(0,0,0,0.2)" />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="rgba(0,0,0,0.2)" />
        <path d={d} fill="none" stroke="color-mix(in srgb, var(--accent) 42%, #121212)" strokeWidth="3" />
      </svg>
    </div>
  );
}
