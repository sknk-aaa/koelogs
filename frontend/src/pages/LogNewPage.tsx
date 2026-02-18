import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { upsertTrainingLog, type UpsertTrainingLogInput } from "../api/trainingLogs";
import { fetchTrainingLogByDate } from "../api/trainingLogs";
import type { TrainingLog } from "../types/trainingLog";
import { fetchTrainingMenus, createTrainingMenu, updateTrainingMenu } from "../api/trainingMenus";
import type { TrainingMenu } from "../types/trainingMenu";
import ColoredTag from "../components/ColoredTag";

import "./LogNewPage.css";

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// 最小パレット（背景向けの薄め色）
const MENU_COLOR_PALETTE: { name: string; color: string }[] = [
  { name: "Sky", color: "#E0F2FE" },
  { name: "Mint", color: "#D1FAE5" },
  { name: "Lime", color: "#ECFCCB" },
  { name: "Yellow", color: "#FEF9C3" },
  { name: "Orange", color: "#FFEDD5" },
  { name: "Red", color: "#FFE4E6" },
  { name: "Pink", color: "#FCE7F3" },
  { name: "Purple", color: "#EDE9FE" },
  { name: "Gray", color: "#E5E7EB" },
  { name: "Blue", color: "#DBEAFE" },
];
const PEAK_CONFIRM_FRAMES = 4;

type PitchTarget = "falsetto" | "chest";

function autoCorrelate(buf: Float32Array, sampleRate: number): number | null {
  const size = buf.length;
  let rms = 0;
  for (let i = 0; i < size; i += 1) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) return null;

  let r1 = 0;
  let r2 = size - 1;
  const threshold = 0.2;
  for (let i = 0; i < size / 2; i += 1) {
    if (Math.abs(buf[i]) < threshold) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < size / 2; i += 1) {
    if (Math.abs(buf[size - i]) < threshold) {
      r2 = size - i;
      break;
    }
  }

  const sliced = buf.slice(r1, r2);
  const n = sliced.length;
  if (n < 2) return null;

  const c = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n - i; j += 1) c[i] += sliced[j] * sliced[j + i];
  }

  let d = 0;
  while (d + 1 < n && c[d] > c[d + 1]) d += 1;

  let maxPos = -1;
  let maxVal = -1;
  for (let i = d; i < n; i += 1) {
    if (c[i] > maxVal) {
      maxVal = c[i];
      maxPos = i;
    }
  }
  if (maxPos <= 0) return null;

  const x1 = c[maxPos - 1] ?? c[maxPos];
  const x2 = c[maxPos];
  const x3 = c[maxPos + 1] ?? c[maxPos];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  const shift = a === 0 ? 0 : -b / (2 * a);
  const period = maxPos + shift;
  if (!Number.isFinite(period) || period <= 0) return null;

  const freq = sampleRate / period;
  if (!Number.isFinite(freq) || freq < 50 || freq > 1800) return null;
  return freq;
}

function midiToNote(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const note = names[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

export default function LogNewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const navState = location.state as { quickFromWelcome?: boolean } | null;
  const quickMode = navState?.quickFromWelcome === true;

  // /log/new?date=YYYY-MM-DD で来たらそれを優先
  const initialDate = params.get("date") || todayISO();

  const [practicedOn, setPracticedOn] = useState(initialDate);
  const [durationMin, setDurationMin] = useState("");
  const [notes, setNotes] = useState("");

  // メニュー管理：DB由来（追加/論理削除 + 複数選択）
  const [menuCatalog, setMenuCatalog] = useState<TrainingMenu[]>([]);
  const [menuToAdd, setMenuToAdd] = useState("");
  const [selectedMenuIds, setSelectedMenuIds] = useState<Set<number>>(() => new Set());

  // 追加時の色
  const [menuColorToAdd, setMenuColorToAdd] = useState(MENU_COLOR_PALETTE[0].color);

  const [falsettoEnabled, setFalsettoEnabled] = useState(false);
  const [falsettoTopNote, setFalsettoTopNote] = useState("");
  const [chestEnabled, setChestEnabled] = useState(false);
  const [chestTopNote, setChestTopNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [pitchRecording, setPitchRecording] = useState<PitchTarget | null>(null);
  const [pitchCurrent, setPitchCurrent] = useState<string | null>(null);
  const [pitchPeak, setPitchPeak] = useState<string | null>(null);
  const [pitchMessage, setPitchMessage] = useState<string | null>(null);
  const [pitchCents, setPitchCents] = useState<number | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const maxFreqRef = useRef<number>(0);
  const peakCandidateMidiRef = useRef<number | null>(null);
  const peakCandidateCountRef = useRef<number>(0);
  const peakCandidateFreqRef = useRef<number>(0);
  const currentTargetRef = useRef<PitchTarget | null>(null);
  const peakNoteRef = useRef<string | null>(null);
  const uiUpdateAtRef = useRef<number>(0);

  const selectedMenuIdsArray = useMemo(() => Array.from(selectedMenuIds), [selectedMenuIds]);

  // 初期ロード：メニュー一覧を取得（archived=falseのみ）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const menus = await fetchTrainingMenus(false);
        if (!cancelled) setMenuCatalog(menus);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 初期表示で既存ログを読み込み、あればフォームに反映
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInitialLoading(true);
      const res = await fetchTrainingLogByDate(practicedOn);
      if (cancelled) return;

      if ("error" in res && res.error) {
        setErrors([`既存ログの取得に失敗しました: ${res.error}`]);
        setInitialLoading(false);
        return;
      }

      const existing = res.data as TrainingLog | null;
      if (!existing) {
        setInitialLoading(false);
        return;
      }

      setDurationMin(existing.duration_min == null ? "" : String(existing.duration_min));
      setNotes(existing.notes ?? "");

      const ids =
        existing.menu_ids && existing.menu_ids.length ? existing.menu_ids : (existing.menus ?? []).map((m) => m.id);

      setSelectedMenuIds(new Set(ids));

      const f = existing.falsetto_top_note;
      setFalsettoEnabled(f != null);
      setFalsettoTopNote(f ?? "");

      const c = existing.chest_top_note;
      setChestEnabled(c != null);
      setChestTopNote(c ?? "");

      setInitialLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [practicedOn]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      if (sourceRef.current) sourceRef.current.disconnect();
      if (analyserRef.current) analyserRef.current.disconnect();
      if (audioContextRef.current) void audioContextRef.current.close();
    };
  }, []);

  const stopPitchCapture = async (applyPeak: boolean) => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        // no-op
      }
      sourceRef.current = null;
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {
        // no-op
      }
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch {
        // no-op
      }
      audioContextRef.current = null;
    }

    const target = currentTargetRef.current;
    const peak = peakNoteRef.current;

    setPitchRecording(null);
    currentTargetRef.current = null;
    setPitchCurrent(null);
    setPitchCents(null);

    if (applyPeak && peak && target) {
      if (target === "falsetto") {
        setFalsettoEnabled(true);
        setFalsettoTopNote(peak);
      } else {
        setChestEnabled(true);
        setChestTopNote(peak);
      }
      setPitchMessage(`最高音候補 ${peak} を入力しました`);
      return;
    }

    if (applyPeak && !peak) {
      setPitchMessage("有効な音高を検出できませんでした。静かな環境で再試行してください。");
    }
  };

  const startPitchCapture = async (target: PitchTarget) => {
    if (pitchRecording) {
      await stopPitchCapture(false);
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setPitchMessage("このブラウザでは録音に対応していません。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: false,
          autoGainControl: false,
          echoCancellation: false,
        },
      });

      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) {
        stream.getTracks().forEach((t) => t.stop());
        setPitchMessage("AudioContext が利用できません。");
        return;
      }

      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.05;
      source.connect(analyser);

      audioContextRef.current = ctx;
      sourceRef.current = source;
      analyserRef.current = analyser;
      mediaStreamRef.current = stream;
      currentTargetRef.current = target;
      setPitchRecording(target);
      setPitchMessage("録音中…もう一度押すと確定します");
      setPitchCurrent(null);
      setPitchPeak(null);
      setPitchCents(null);
      peakNoteRef.current = null;
      maxFreqRef.current = 0;
      peakCandidateMidiRef.current = null;
      peakCandidateCountRef.current = 0;
      peakCandidateFreqRef.current = 0;
      uiUpdateAtRef.current = 0;

      const data = new Float32Array(analyser.fftSize);

      const tick = () => {
        const an = analyserRef.current;
        const ac = audioContextRef.current;
        if (!an || !ac) return;

        an.getFloatTimeDomainData(data);
        const freq = autoCorrelate(data, ac.sampleRate);
        const now = performance.now();
        const shouldSyncUi = now - uiUpdateAtRef.current >= 50;
        if (freq) {
          const midiFloat = 69 + 12 * Math.log2(freq / 440);
          const midiNearest = Math.round(midiFloat);
          const current = midiToNote(midiNearest);
          if (shouldSyncUi) {
            setPitchCurrent(current);
            setPitchCents((midiFloat - midiNearest) * 100);
            uiUpdateAtRef.current = now;
          }

          if (freq > maxFreqRef.current) {
            const candidateMidi = peakCandidateMidiRef.current;
            const isNearCandidate =
              candidateMidi != null && Math.abs(candidateMidi - midiNearest) <= 1;

            if (!isNearCandidate) {
              peakCandidateMidiRef.current = midiNearest;
              peakCandidateCountRef.current = 1;
              peakCandidateFreqRef.current = freq;
            } else {
              peakCandidateCountRef.current += 1;
              if (freq > peakCandidateFreqRef.current) peakCandidateFreqRef.current = freq;
            }

            if (peakCandidateCountRef.current >= PEAK_CONFIRM_FRAMES) {
              maxFreqRef.current = peakCandidateFreqRef.current;
              const confirmedNote = midiToNote(peakCandidateMidiRef.current ?? midiNearest);
              setPitchPeak(confirmedNote);
              peakNoteRef.current = confirmedNote;
              peakCandidateMidiRef.current = null;
              peakCandidateCountRef.current = 0;
              peakCandidateFreqRef.current = 0;
            }
          } else {
            peakCandidateMidiRef.current = null;
            peakCandidateCountRef.current = 0;
            peakCandidateFreqRef.current = 0;
          }
        } else if (shouldSyncUi) {
          setPitchCurrent(null);
          setPitchCents(null);
          uiUpdateAtRef.current = now;
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setPitchMessage(`録音を開始できませんでした: ${errorMessage(e, "permission denied")}`);
      void stopPitchCapture(false);
    }
  };

  const toggleMenu = (id: number) => {
    setSelectedMenuIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addMenu = async () => {
    const v = menuToAdd.trim();
    if (!v) return;

    try {
      const created = await createTrainingMenu({ name: v, color: menuColorToAdd });
      setMenuCatalog((prev) => [...prev, created]);
      setMenuToAdd("");
      setMenuColorToAdd(MENU_COLOR_PALETTE[0].color);
    } catch (e) {
      setErrors([errorMessage(e, "メニュー追加に失敗しました")]);
    }
  };

  const removeMenuFromCatalog = async (menu: TrainingMenu) => {
    try {
      await updateTrainingMenu(menu.id, { archived: true });
      setMenuCatalog((prev) => prev.filter((m) => m.id !== menu.id));
      setSelectedMenuIds((prev) => {
        const next = new Set(prev);
        next.delete(menu.id);
        return next;
      });
    } catch (e) {
      setErrors([errorMessage(e, "メニュー削除に失敗しました")]);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const localErrors: string[] = [];
    if (!quickMode) {
      if (falsettoEnabled && !falsettoTopNote.trim()) localErrors.push("裏声最高音が未入力です");
      if (chestEnabled && !chestTopNote.trim()) localErrors.push("地声最高音が未入力です");
    }

    if (localErrors.length) {
      setErrors(localErrors);
      setSubmitting(false);
      return;
    }

    const quickFalsettoEnabled = falsettoTopNote.trim().length > 0;
    const quickChestEnabled = chestTopNote.trim().length > 0;
    const effectiveFalsettoEnabled = quickMode ? quickFalsettoEnabled : falsettoEnabled;
    const effectiveChestEnabled = quickMode ? quickChestEnabled : chestEnabled;
    const parsedDuration = durationMin.trim() === "" ? null : Number.parseInt(durationMin.trim(), 10);

    const payload: UpsertTrainingLogInput = {
      practiced_on: practicedOn,
      duration_min: Number.isNaN(parsedDuration as number) ? null : parsedDuration,
      menu_ids: quickMode ? [] : selectedMenuIdsArray,
      notes: notes.trim() === "" ? null : notes,

      falsetto_enabled: effectiveFalsettoEnabled,
      falsetto_top_note: effectiveFalsettoEnabled ? falsettoTopNote.trim() : null,
      chest_enabled: effectiveChestEnabled,
      chest_top_note: effectiveChestEnabled ? chestTopNote.trim() : null,
    };

    const result = await upsertTrainingLog(payload);
    setSubmitting(false);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    navigate(`/log?date=${encodeURIComponent(practicedOn)}`, { replace: true });
  };

  const onCancel = () => {
    navigate(`/log?date=${encodeURIComponent(practicedOn)}`);
  };

  const tunerNeedle = useMemo(() => {
    if (pitchCents == null) return null;
    const bounded = Math.max(-50, Math.min(50, pitchCents));
    return `${bounded}%`;
  }, [pitchCents]);
  const pitchCentsLabel = useMemo(() => {
    if (pitchCents == null) return "音を検出中…";
    const rounded = Math.round(pitchCents);
    if (rounded === 0) return "in tune";
    return `${rounded < 0 ? "♭" : "#"} ${Math.abs(rounded)} cents`;
  }, [pitchCents]);

  return (
    <div className="page logNew">
      <form id="log-new-form" onSubmit={onSubmit} className="logNew__form">
        {initialLoading && <div className="logNew__loading">既存ログを読み込み中…</div>}

        {!quickMode && (
          <section className="card logNew__section">
            <div className="logNew__sectionTitle">基本情報</div>

            <div className="logNew__field">
              <label className="logNew__label" htmlFor="practicedOn">日付</label>
              <input
                id="practicedOn"
                type="date"
                value={practicedOn}
                onChange={(e) => setPracticedOn(e.target.value)}
                className="logNew__input"
              />
            </div>

            <div className="logNew__field">
              <label className="logNew__label" htmlFor="durationMin">練習時間（分）</label>
              <input
                id="durationMin"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                placeholder="例: 30"
                className="logNew__input"
              />
            </div>
          </section>
        )}

        {!quickMode && (
          <section className="card logNew__section">
            <div className="logNew__sectionTitle">練習メニュー（複数選択）</div>

          <div className="logNew__panel">
            <div className="logNew__subLabel">メニュー名</div>
            <input
              value={menuToAdd}
              onChange={(e) => setMenuToAdd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  void addMenu();
                }
              }}
              placeholder="メニューを追加（例: 裏声リップロール）"
              className="logNew__input"
            />

            <div className="logNew__subLabel">追加する色</div>
            <div className="logNew__palette">
              {MENU_COLOR_PALETTE.map((p) => {
                const active = p.color === menuColorToAdd;
                return (
                  <button
                    key={p.color}
                    type="button"
                    onClick={() => setMenuColorToAdd(p.color)}
                    title={`この色で追加: ${p.name}`}
                    aria-label={`この色で追加: ${p.name}`}
                    className={`logNew__swatch ${active ? "is-active" : ""}`}
                    style={{ background: p.color }}
                  >
                    {active && <span className="logNew__swatchCheck">✓</span>}
                  </button>
                );
              })}
            </div>

            <div className="logNew__previewRow">
              <div className="logNew__subLabel">プレビュー</div>
              <ColoredTag text="タグ表示" color={menuColorToAdd} />
            </div>

            <div className="logNew__panelActions">
              <button type="button" onClick={addMenu} disabled={!menuToAdd.trim()} className="logNew__btn logNew__btn--ghost">
                この色で追加
              </button>
              <div className="logNew__muted">※ 選んだ色はメニュータグとして保存されます</div>
            </div>
          </div>

          <div className="logNew__menuList">
            {menuCatalog.map((menu) => {
              const checked = selectedMenuIds.has(menu.id);

              return (
                <div
                  key={menu.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleMenu(menu.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleMenu(menu.id);
                    }
                  }}
                  aria-pressed={checked}
                  className={`logNew__menuRow ${checked ? "is-checked" : ""}`}
                >
                  <span className="logNew__check" aria-hidden="true">✓</span>

                  <ColoredTag text={menu.name} color={menu.color} />

                  {checked && <span className="logNew__selectedText">選択中</span>}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeMenuFromCatalog(menu);
                    }}
                    className="logNew__removeBtn"
                    title="カタログから削除（archived=true）"
                  >
                    削除
                  </button>
                </div>
              );
            })}

            {menuCatalog.length === 0 && (
              <div className="logNew__muted">メニューがありません。上の入力から追加してください。</div>
            )}
          </div>

          <div className="logNew__field">
            <div className="logNew__subLabel">選択中メニュー</div>
            <div className="logNew__selectedTags">
              {selectedMenuIdsArray.length ? (
                selectedMenuIdsArray.map((id) => {
                  const m = menuCatalog.find((x) => x.id === id);
                  return <ColoredTag key={id} text={m?.name ?? `#${id}`} color={m?.color ?? "#E5E7EB"} />;
                })
              ) : (
                <span className="logNew__muted">なし</span>
              )}
            </div>
          </div>
          </section>
        )}

        <section className="card logNew__section">
          <div className="logNew__sectionTitle">{quickMode ? "最高音を記録" : "音域メモ"}</div>

          {quickMode && (
            <div className="logNew__muted">
              日付: {practicedOn}
            </div>
          )}

          {quickMode ? (
            <>
              <div className="logNew__field">
                <label className="logNew__label">裏声最高音</label>
                <input
                  value={falsettoTopNote}
                  onChange={(e) => setFalsettoTopNote(e.target.value)}
                  placeholder="例: G5, F#5 など"
                  className="logNew__input"
                />
                <div className="logNew__pitchRow">
                  <button
                    type="button"
                    className={`logNew__btn ${pitchRecording === "falsetto" ? "logNew__btn--recording" : "logNew__btn--ghost"}`}
                    onClick={() => {
                      if (pitchRecording === "falsetto") void stopPitchCapture(true);
                      else void startPitchCapture("falsetto");
                    }}
                  >
                    {pitchRecording === "falsetto" ? "録音停止して入力" : "録音して自動入力"}
                  </button>
                </div>
              </div>

              <div className="logNew__field">
                <label className="logNew__label">地声最高音</label>
                <input
                  value={chestTopNote}
                  onChange={(e) => setChestTopNote(e.target.value)}
                  placeholder="例: G4, F#4 など"
                  className="logNew__input"
                />
                <div className="logNew__pitchRow">
                  <button
                    type="button"
                    className={`logNew__btn ${pitchRecording === "chest" ? "logNew__btn--recording" : "logNew__btn--ghost"}`}
                    onClick={() => {
                      if (pitchRecording === "chest") void stopPitchCapture(true);
                      else void startPitchCapture("chest");
                    }}
                  >
                    {pitchRecording === "chest" ? "録音停止して入力" : "録音して自動入力"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>

          <div className="logNew__field">
            <label className="logNew__checkRow">
              <input type="checkbox" checked={falsettoEnabled} onChange={(e) => setFalsettoEnabled(e.target.checked)} />
              裏声最高音を記録する
            </label>
            <input
              value={falsettoTopNote}
              onChange={(e) => setFalsettoTopNote(e.target.value)}
              placeholder="例: G5, F#5 など"
              disabled={!falsettoEnabled}
              className="logNew__input"
            />
            <div className="logNew__pitchRow">
              <button
                type="button"
                className={`logNew__btn ${pitchRecording === "falsetto" ? "logNew__btn--recording" : "logNew__btn--ghost"}`}
                onClick={() => {
                  if (pitchRecording === "falsetto") void stopPitchCapture(true);
                  else void startPitchCapture("falsetto");
                }}
              >
                {pitchRecording === "falsetto" ? "録音停止して入力" : "録音して自動入力"}
              </button>
              <div className="logNew__muted">
                {pitchRecording === "falsetto" && (pitchCurrent || pitchPeak)
                  ? `検出: ${pitchCurrent ?? "—"} / 最高: ${pitchPeak ?? "—"}`
                  : "高めの母音を安定して発声すると検出しやすいです"}
              </div>
              {pitchRecording === "falsetto" && (
                <div className="logNew__pitchViz">
                  <div className="logNew__pitchNote">{pitchCurrent ?? "—"}</div>
                  <div className="logNew__pitchTuner">
                    <div className="logNew__pitchTunerScale">
                      <span>♭</span>
                      <span />
                      <span>#</span>
                    </div>
                    <div className="logNew__pitchTunerRail">
                      <span className="logNew__pitchTunerCenter" />
                      {tunerNeedle && <span className="logNew__pitchTunerNeedle" style={{ left: `calc(50% + ${tunerNeedle})` }} />}
                    </div>
                    <div className="logNew__muted">
                      {pitchCentsLabel}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="logNew__field">
            <label className="logNew__checkRow">
              <input type="checkbox" checked={chestEnabled} onChange={(e) => setChestEnabled(e.target.checked)} />
              地声最高音を記録する
            </label>
            <input
              value={chestTopNote}
              onChange={(e) => setChestTopNote(e.target.value)}
              placeholder="例: G4, F#4 など"
              disabled={!chestEnabled}
              className="logNew__input"
            />
            <div className="logNew__pitchRow">
              <button
                type="button"
                className={`logNew__btn ${pitchRecording === "chest" ? "logNew__btn--recording" : "logNew__btn--ghost"}`}
                onClick={() => {
                  if (pitchRecording === "chest") void stopPitchCapture(true);
                  else void startPitchCapture("chest");
                }}
              >
                {pitchRecording === "chest" ? "録音停止して入力" : "録音して自動入力"}
              </button>
              <div className="logNew__muted">
                {pitchRecording === "chest" && (pitchCurrent || pitchPeak)
                  ? `検出: ${pitchCurrent ?? "—"} / 最高: ${pitchPeak ?? "—"}`
                  : "裏声と分けて測ると精度が上がります"}
              </div>
              {pitchRecording === "chest" && (
                <div className="logNew__pitchViz">
                  <div className="logNew__pitchNote">{pitchCurrent ?? "—"}</div>
                  <div className="logNew__pitchTuner">
                    <div className="logNew__pitchTunerScale">
                      <span>♭</span>
                      <span />
                      <span>#</span>
                    </div>
                    <div className="logNew__pitchTunerRail">
                      <span className="logNew__pitchTunerCenter" />
                      {tunerNeedle && <span className="logNew__pitchTunerNeedle" style={{ left: `calc(50% + ${tunerNeedle})` }} />}
                    </div>
                    <div className="logNew__muted">
                      {pitchCentsLabel}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {pitchMessage && <div className="logNew__muted">{pitchMessage}</div>}
            </>
          )}

          {quickMode && pitchMessage && <div className="logNew__muted">{pitchMessage}</div>}
        </section>

        <section className="card logNew__section">
          <div className="logNew__sectionTitle">{quickMode ? "現在の声の状況を教えてください" : "自由記述"}</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder={quickMode ? "いまの声の状態・気づき（任意）" : "メモ（任意）"}
            className="logNew__textarea"
          />
        </section>

        {errors.length > 0 && (
          <section className="logNew__errorBox">
            <div className="logNew__errorTitle">保存できませんでした</div>
            <ul className="logNew__errorList">
              {errors.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </section>
        )}
      </form>

      <div className="logNew__stickyBar">
        <div className="logNew__stickyInner">
          <button type="button" onClick={onCancel} disabled={submitting} className="logNew__btn logNew__btn--ghost">
            キャンセル
          </button>

          <button
            type="button"
            onClick={() => {
              const form = document.getElementById("log-new-form") as HTMLFormElement | null;
              form?.requestSubmit();
            }}
            disabled={submitting}
            className="logNew__btn logNew__btn--primary"
          >
            {submitting ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
