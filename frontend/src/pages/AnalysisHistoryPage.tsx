import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { deleteAnalysisSession, fetchAnalysisSessionsPage } from "../api/analysisSessions";
import { fetchAnalysisMenus } from "../api/analysisMenus";
import type { AnalysisMenu } from "../types/analysisMenu";
import type { AnalysisSession } from "../types/analysisSession";
import AnalysisFeedbackPanel from "../features/analysis/components/AnalysisFeedbackPanel";

import "./AnalysisHistoryPage.css";

type PeriodKey = "7" | "30" | "90" | "all";

export default function AnalysisHistoryPage() {
  const [params, setParams] = useSearchParams();
  const menuIdParam = Number.parseInt(params.get("menu_id") ?? "", 10);
  const [menus, setMenus] = useState<AnalysisMenu[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [reloadTick, setReloadTick] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fetchedMenus = await fetchAnalysisMenus(false);
        if (cancelled) return;
        setMenus(fetchedMenus);
      } catch (e) {
        if (!cancelled) setError(errorMessage(e, "メニュー情報の取得に失敗しました"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (menus.length === 0) {
      setSelectedMenuId(null);
      return;
    }
    if (Number.isFinite(menuIdParam) && menus.some((m) => m.id === menuIdParam)) {
      setSelectedMenuId(menuIdParam);
      return;
    }
    setSelectedMenuId((prev) => (prev && menus.some((m) => m.id === prev) ? prev : menus[0]?.id ?? null));
  }, [menus, menuIdParam]);

  useEffect(() => {
    if (!selectedMenuId) return;
    const current = Number.parseInt(params.get("menu_id") ?? "", 10);
    if (current === selectedMenuId) return;
    const next = new URLSearchParams(params);
    next.set("menu_id", String(selectedMenuId));
    setParams(next, { replace: true });
  }, [selectedMenuId, params, setParams]);

  useEffect(() => {
    if (!selectedMenuId) {
      setSessions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchAnalysisSessionsPage({
          analysis_menu_id: selectedMenuId,
          days: period === "all" ? undefined : Number.parseInt(period, 10),
          sort_by: "created_at",
          sort_dir: "desc",
          page,
          per_page: perPage,
        });
        if (cancelled) return;
        setSessions(res.data);
        setPage(res.meta.page);
        setPerPage(res.meta.per_page);
        setTotalPages(res.meta.total_pages);
        setSelectedId((prev) => (res.data.some((s) => s.id === prev) ? prev : (res.data[0]?.id ?? null)));
      } catch (e) {
        if (!cancelled) setError(errorMessage(e, "履歴の取得に失敗しました"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedMenuId, period, page, perPage, reloadTick]);

  const menu = useMemo(() => menus.find((m) => m.id === selectedMenuId) ?? null, [menus, selectedMenuId]);

  const selected = useMemo(() => sessions.find((s) => s.id === selectedId) ?? sessions[0] ?? null, [sessions, selectedId]);

  const onDelete = async (id: number) => {
    try {
      await deleteAnalysisSession(id);
      setSessions((prevRows) => {
        const next = prevRows.filter((r) => r.id !== id);
        if (selectedId === id) setSelectedId(next[0]?.id ?? null);
        return next;
      });
      if (sessions.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        setReloadTick((t) => t + 1);
      }
    } catch (e) {
      setError(errorMessage(e, "履歴の削除に失敗しました"));
    }
  };

  return (
    <div className="page analysisHistory">
      <section className="card analysisHistory__hero">
        <div>
          <div className="analysisHistory__kicker">AI Analysis History</div>
          <h1 className="analysisHistory__title">{menu?.name ?? "分析履歴"}</h1>
          {menu && (
            <div className="analysisHistory__meta">
              比較条件:
              {menu.compare_by_scale ? ` スケール${menu.fixed_scale_type ? `(${menu.fixed_scale_type})` : ""}` : " なし"}
              {menu.compare_by_tempo ? ` / テンポ${menu.fixed_tempo ? `(${menu.fixed_tempo} bpm)` : ""}` : ""}
            </div>
          )}
        </div>
        <div className="analysisHistory__actions">
          <Link to="/training" className="analysisHistory__back">トレーニングへ戻る</Link>
        </div>
      </section>

      <section className="card analysisHistory__filters">
        <div className="analysisHistory__filterLabel">メニュー</div>
        <div className="analysisHistory__menuRow">
          <select
            className="analysisHistory__select"
            value={selectedMenuId ?? ""}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value, 10);
              setSelectedMenuId(Number.isNaN(v) ? null : v);
              setPage(1);
            }}
            disabled={menus.length === 0}
          >
            {menus.length === 0 && <option value="">メニューがありません</option>}
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="analysisHistory__filterLabel">期間</div>
        <div className="analysisHistory__filterRow">
          {(["7", "30", "90", "all"] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`analysisHistory__chip ${period === key ? "is-active" : ""}`}
              onClick={() => {
                setPeriod(key);
                setPage(1);
              }}
            >
              {key === "all" ? "全件" : `${key}日`}
            </button>
          ))}
        </div>
        <div className="analysisHistory__pageSizeRow">
          <select
            className="analysisHistory__select"
            value={perPage}
            onChange={(e) => {
              setPerPage(Number.parseInt(e.target.value, 10));
              setPage(1);
            }}
          >
            <option value={10}>10件</option>
            <option value={20}>20件</option>
            <option value={50}>50件</option>
          </select>
        </div>
      </section>

      {loading && <div className="analysisHistory__muted">読み込み中…</div>}
      {error && <div className="analysisHistory__error">{error}</div>}

      {!loading && sessions.length > 0 && (
        <>
          <section className="card analysisHistory__charts">
            <TrendChart title="安定度" rows={sessions} field="pitch_stability_score" max={100} />
            <TrendChart title="発声継続" rows={sessions} field="voice_consistency_score" max={100} />
            <TrendChart
              title="音域幅"
              rows={sessions}
              field="range_semitones"
              max={Math.max(12, ...sessions.map((s) => s.range_semitones ?? 0))}
            />
          </section>

          <section className="card analysisHistory__tableWrap">
            <table className="analysisHistory__table">
              <thead>
                <tr>
                  <th>日時</th>
                  <th>スケール</th>
                  <th>テンポ</th>
                  <th>安定度</th>
                  <th>発声継続</th>
                  <th>音域幅</th>
                  <th>最高音</th>
                  <th>録音</th>
                  <th>前回比</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map((row, idx) => {
                  const prevRow = findPreviousComparableSession(
                    sessions,
                    idx,
                    Boolean(menu?.compare_by_scale),
                    Boolean(menu?.compare_by_tempo),
                    menu?.fixed_scale_type ?? null,
                    menu?.fixed_tempo ?? null
                  );
                  return (
                    <tr
                      key={row.id}
                      className={selected?.id === row.id ? "is-selected" : ""}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td>{formatDateTime(row.created_at)}</td>
                      <td>{row.recorded_scale_type ?? "-"}</td>
                      <td>{row.recorded_tempo ? `${row.recorded_tempo}` : "-"}</td>
                      <td>{row.pitch_stability_score ?? 0}</td>
                      <td>{row.voice_consistency_score ?? 0}</td>
                      <td>{row.range_semitones ?? 0}</td>
                      <td>{row.peak_note ?? "-"}</td>
                      <td>
                        {row.audio_url ? (
                          <audio controls preload="none" src={row.audio_url} className="analysisHistory__audio" />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>{prevRow ? formatDiff(row.pitch_stability_score, prevRow.pitch_stability_score) : "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="analysisHistory__delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onDelete(row.id);
                          }}
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="analysisHistory__pagination">
              <button
                type="button"
                className="analysisHistory__pagerBtn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                前へ
              </button>
              <div className="analysisHistory__pagerMeta">
                {page} / {Math.max(1, totalPages)}
              </div>
              <button
                type="button"
                className="analysisHistory__pagerBtn"
                onClick={() => setPage((p) => Math.min(Math.max(1, totalPages), p + 1))}
                disabled={page >= totalPages}
              >
                次へ
              </button>
            </div>
          </section>

          {selected && (
            <section className="card analysisHistory__detail">
              <div className="analysisHistory__detailTitle">詳細</div>
              <div className="analysisHistory__detailGrid">
                <span>日時: {formatDateTime(selected.created_at)}</span>
                <span>録音秒数: {selected.duration_sec} 秒</span>
                <span>最高音: {selected.peak_note ?? "-"}</span>
                <span>安定度: {selected.pitch_stability_score ?? 0}</span>
                <span>発声継続: {selected.voice_consistency_score ?? 0}</span>
                <span>音域幅: {selected.range_semitones ?? 0} 半音</span>
              </div>
              {selected.audio_url && (
                <audio controls preload="none" src={selected.audio_url} className="analysisHistory__audio analysisHistory__audio--detail" />
              )}
              {(selected.ai_feedback || selected.feedback_text) && (
                <AnalysisFeedbackPanel
                  className="analysisHistory__feedback"
                  feedback={selected.ai_feedback}
                  fallbackText={selected.feedback_text}
                />
              )}
            </section>
          )}
        </>
      )}

      {!loading && !error && menus.length === 0 && (
        <div className="analysisHistory__muted">分析メニューがありません。トレーニングページで作成してください。</div>
      )}

      {!loading && !error && menus.length > 0 && sessions.length === 0 && (
        <div className="analysisHistory__muted">該当条件に履歴がありません。</div>
      )}
    </div>
  );
}

function TrendChart({
  title,
  rows,
  field,
  max,
}: {
  title: string;
  rows: AnalysisSession[];
  field: "pitch_stability_score" | "voice_consistency_score" | "range_semitones";
  max: number;
}) {
  const chartRows = [...rows].reverse();
  const w = 520;
  const h = 190;
  const padL = 40;
  const padR = 12;
  const padT = 12;
  const padB = 30;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const d = chartRows
    .map((r, i) => {
      const v = r[field] ?? 0;
      const x = padL + (innerW * i) / Math.max(1, chartRows.length - 1);
      const y = padT + innerH - (innerH * v) / Math.max(1, max);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const yTicks = [max, Math.round(max / 2), 0];
  const xTickIndices = [0, Math.floor((chartRows.length - 1) / 2), Math.max(0, chartRows.length - 1)];
  return (
    <div className="analysisHistory__chart">
      <div className="analysisHistory__chartTitle">{title}</div>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
        {yTicks.map((tick) => {
          const y = padT + innerH - (innerH * tick) / Math.max(1, max);
          return (
            <g key={tick}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} className="analysisHistory__grid" />
              <text x={padL - 6} y={y + 4} className="analysisHistory__axisText">{tick}</text>
            </g>
          );
        })}
        <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} className="analysisHistory__axis" />
        <line x1={padL} y1={padT} x2={padL} y2={h - padB} className="analysisHistory__axis" />
        <path d={d} className="analysisHistory__line" />
        {xTickIndices.map((idx, i) => {
          const row = chartRows[idx];
          if (!row) return null;
          const x = padL + (innerW * idx) / Math.max(1, chartRows.length - 1);
          const y = h - padB + 14;
          return <text key={`${idx}-${i}`} x={x} y={y} className="analysisHistory__axisText analysisHistory__axisText--x">{formatDateLabel(row.created_at)}</text>;
        })}
      </svg>
    </div>
  );
}

function findPreviousComparableSession(
  sessions: AnalysisSession[],
  currentIndex: number,
  compareByScale: boolean,
  compareByTempo: boolean,
  compareScale: string | null,
  compareTempo: number | null
) {
  if (!compareByScale && !compareByTempo) return sessions[currentIndex + 1];
  const current = sessions[currentIndex];
  if (!current) return undefined;
  for (let i = currentIndex + 1; i < sessions.length; i += 1) {
    const c = sessions[i];
    if (!c) continue;
    if (compareByScale) {
      const s = normalizeScale(compareScale ?? current.recorded_scale_type);
      if (normalizeScale(c.recorded_scale_type) !== s) continue;
    }
    if (compareByTempo) {
      const t = compareTempo ?? current.recorded_tempo;
      if (c.recorded_tempo !== t) continue;
    }
    return c;
  }
  return undefined;
}

function normalizeScale(v?: string | null) {
  return (v ?? "").toLowerCase().replace(/\s+/g, "");
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDiff(curr?: number | null, prev?: number | null) {
  const d = (curr ?? 0) - (prev ?? 0);
  if (d === 0) return "±0";
  return `${d > 0 ? "+" : ""}${d}`;
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" });
}

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}
