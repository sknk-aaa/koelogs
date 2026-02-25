// frontend/src/pages/TrainingPage.tsx
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ScaleTrack, ScaleType, Tempo } from "../api/scaleTracks";
import { SCALE_TYPES, TEMPOS } from "../features/training/constants";
import { useScaleTracks } from "../features/training/hooks/useScaleTracks";
import { useAudioPlayer } from "../features/training/hooks/useAudioPlayer";
import AudioPlayer from "../features/training/components/AudioPlayer";
import SessionPlayerCard from "../features/training/components/SessionPlayerCard";
import MiniPreview, { type MeasurementPreviewKind } from "../features/measurement/components/MiniPreview";
import { useSettings } from "../features/settings/useSettings";
import { useAuth } from "../features/auth/useAuth";
import { createMeasurement, fetchMeasurements, updateMeasurement, type MeasurementRun } from "../api/measurements";
import { emitGamificationRewards } from "../features/gamification/rewardBus";
import type { SaveRewards } from "../types/gamification";
import ProcessingOverlay from "../components/ProcessingOverlay";
import { RANGE_MISSION_FLAG } from "../features/missions/constants";

import "./TrainingPage.css";

type MeasurementSystemKey = "range" | "long_tone" | "volume_stability" | "pitch_accuracy";
type RangePhase = "chest" | "falsetto";
type PitchGuideRange = "low" | "mid" | "high";
type PitchJudgeTone = "inactive" | "green" | "yellow" | "red";
type PitchPoint = { t: number; midi: number };
type PitchGuideSegment = { startSec: number; endSec: number; midi: number };
type PitchGuide = {
  bpm: number;
  totalSec: number;
  countInSec: number;
  segments: PitchGuideSegment[];
};
const PITCH_GUIDE_OPTIONS = [
  { key: "low", label: "Low", detail: "5tone / 音域: E3〜E4" },
  { key: "mid", label: "Mid", detail: "5tone / 音域: G3〜G4" },
  { key: "high", label: "High", detail: "5tone / 音域: C4〜C5" },
] as const;
type MeasurementInstantResult = {
  runId: number;
  measurementKey: MeasurementSystemKey;
  includeInInsights: boolean;
  source: "file" | "recording";
  title: string;
  lines: string[];
  measuredAt: string;
  rangeSemitones?: number | null;
  rangeOctaves?: number | null;
  lowestNote?: string | null;
  highestNote?: string | null;
  chestTopNote?: string | null;
  falsettoTopNote?: string | null;
  chestLowestNote?: string | null;
  falsettoLowestNote?: string | null;
  overlapHighestNote?: string | null;
  overlapLowestNote?: string | null;
  longToneSec?: number | null;
  sustainNote?: string | null;
  avgLoudnessDb?: number | null;
  minLoudnessDb?: number | null;
  maxLoudnessDb?: number | null;
  loudnessRangeDb?: number | null;
  loudnessRangePct?: number | null;
  loudnessTimeline?: number[];
  pitchAccuracyScore?: number | null;
  pitchAccuracyAvgCents?: number | null;
  pitchAccuracyNoteCount?: number | null;
  replayPitchPoints?: PitchPoint[];
  replayDbValues?: number[];
  replayDurationSec?: number;
  replayGuideRange?: PitchGuideRange | null;
};
const DEFAULT_NOISE_DB_THRESHOLD = -70;
const VOLUME_NOISE_DB_THRESHOLD = -60;
const MIN_VOICED_STREAK_FRAMES = 3;
const PITCH_JUMP_SEMITONE_LIMIT = 10;
const YIN_THRESHOLD = 0.32;
const YIN_FALLBACK_ACCEPT_MAX = 0.75;
const PITCH_GUIDE_BPM = 100;
const PITCH_GUIDE_COUNT_IN_BEATS = 4;
const PITCH_GUIDE_NOTE_DURATION_BEATS = 0.5;
const PITCH_GUIDE_BAR_BEATS = 4;
const PITCH_GUIDE_INTERVALS = [0, 2, 4, 5, 7, 5, 4, 2] as const;
const PITCH_GUIDE_ASC_TRANSPOSE = [0, 1, 2, 3, 4, 5] as const;
const PITCH_GUIDE_DESC_TRANSPOSE = [4, 3, 2, 1, 0] as const;
const PITCH_JUDGE_GREEN_CENTS = 10;
const PITCH_JUDGE_YELLOW_CENTS = 25;
const PITCH_LINE_GAP_SEC = 0.25;
const PITCH_AXIS_BY_RANGE: Record<PitchGuideRange, { minMidi: number; maxMidi: number }> = {
  low: { minMidi: noteToMidi("C3") ?? 48, maxMidi: noteToMidi("G4") ?? 67 },
  mid: { minMidi: noteToMidi("E3") ?? 52, maxMidi: noteToMidi("A4") ?? 69 },
  high: { minMidi: noteToMidi("A3") ?? 57, maxMidi: noteToMidi("E5") ?? 76 },
};
const PITCH_SCROLL_WINDOW_SEC = 9;

const MEASUREMENT_SHORTCUTS: Array<{
  title: string;
  systemKey: MeasurementSystemKey;
  note: string;
  selectedSummary: string;
}> = [
  {
    title: "音域",
    systemKey: "range",
    note: "最低音〜最高音の幅を確認",
    selectedSummary: "最低音 / 最高音 / 音域（半音・オクターブ）",
  },
  {
    title: "ロングトーン秒数",
    systemKey: "long_tone",
    note: "発声持続の推移を確認",
    selectedSummary: "ロングトーン秒数 / 発声音程",
  },
  {
    title: "音量安定性",
    systemKey: "volume_stability",
    note: "平均音量の±3dB以内で発声できた割合を確認",
    selectedSummary: "許容幅内率（平均±3dB）% / 平均音量 / 最小音量 / 最大音量",
  },
  {
    title: "音程精度",
    systemKey: "pitch_accuracy",
    note: "発声した音程のズレ量を確認",
    selectedSummary: "平均ズレ（cent） / 精度スコア / 発声音数",
  },
];

const PRESET_INFO: Array<{
  title: string;
  description: string;
  savedItems: string[];
  condition?: string;
}> = [
  {
    title: "音域（最高音−最低音）",
    description: "地声と裏声それぞれで、最低音から最高音までの幅を測定します。",
    savedItems: ["最低音", "最高音", "音域（半音数・オクターブ換算）"],
  },
  {
    title: "ロングトーン",
    description: "同じ音程をどれだけ安定して伸ばせるかを、秒数で測定します。",
    savedItems: ["維持秒数", "発声した音程"],
  },
  {
    title: "音量安定性",
    description:
      "発声中の平均音量を基準に、±3dB以内で発声できた割合（%）を測定します。",
    savedItems: ["許容幅内率（平均±3dB, %）", "平均音量", "最小音量", "最大音量"],
  },
  {
    title: "音程精度",
    description: "発声した音程が目標に対してどれだけ正確かを、ズレ量（半音を1とする）で評価します。",
    savedItems: ["平均ズレ（n半音）", "平均ズレ（cent）", "発声音数"],
  },
];

export default function TrainingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tracks, loading, error } = useScaleTracks();
  const { settings } = useSettings();
  const { me, isLoading: authLoading } = useAuth();

  const [scaleType, setScaleType] = useState<ScaleType>("5tone");
  const [tempo, setTempo] = useState<Tempo>(120);
  const [activeMeasurementKey, setActiveMeasurementKey] = useState<MeasurementSystemKey>("range");
  const [measurementMetricInfoOpen, setMeasurementMetricInfoOpen] = useState(false);
  const [measurementError, setMeasurementError] = useState<string | null>(null);
  const [measurementSessionSaving, setMeasurementSessionSaving] = useState(false);
  const [measurementFileAnalyzing, setMeasurementFileAnalyzing] = useState(false);
  const [measurementUseTrainingTrack, setMeasurementUseTrainingTrack] = useState(false);
  const [measurementRecording, setMeasurementRecording] = useState(false);
  const [pitchGuideRange, setPitchGuideRange] = useState<PitchGuideRange | null>(null);
  const [measurementElapsedSec, setMeasurementElapsedSec] = useState(0);
  const [, setMeasurementCurrentNote] = useState<string | null>(null);
  const [measurementCurrentMidi, setMeasurementCurrentMidi] = useState<number | null>(null);
  const [measurementCurrentDb, setMeasurementCurrentDb] = useState<number | null>(null);
  const [measurementRealtimePitchPoints, setMeasurementRealtimePitchPoints] = useState<PitchPoint[]>([]);
  const [measurementRealtimeDbPoints, setMeasurementRealtimeDbPoints] = useState<number[]>([]);
  const [measurementInstantResult, setMeasurementInstantResult] = useState<MeasurementInstantResult | null>(null);
  const [measurementResultModalOpen, setMeasurementResultModalOpen] = useState(false);
  const [measurementResultSaving, setMeasurementResultSaving] = useState(false);
  const [measurementRecordedAudioBlob, setMeasurementRecordedAudioBlob] = useState<Blob | null>(null);
  const [measurementRecordedAudioUrl, setMeasurementRecordedAudioUrl] = useState<string | null>(null);
  const [measurementReplayPlaying, setMeasurementReplayPlaying] = useState(false);
  const [measurementReplayElapsedSec, setMeasurementReplayElapsedSec] = useState(0);
  const [measurementWavConverting, setMeasurementWavConverting] = useState(false);
  const [measurementReplayPanelOpen, setMeasurementReplayPanelOpen] = useState(false);
  const [longToneCompare, setLongToneCompare] = useState<{ previousSec: number | null; bestSec: number | null }>({
    previousSec: null,
    bestSec: null,
  });
  const [rangePhase, setRangePhase] = useState<RangePhase | null>(null);
  const [missionRangeAutoInclude, setMissionRangeAutoInclude] = useState(false);

  const measurementAudioContextRef = useStateRef<AudioContext | null>(null);
  const measurementAnalyserRef = useStateRef<AnalyserNode | null>(null);
  const measurementMediaStreamRef = useStateRef<MediaStream | null>(null);
  const measurementSourceRef = useStateRef<MediaStreamAudioSourceNode | null>(null);
  const measurementRafRef = useStateRef<number | null>(null);
  const measurementStartedAtRef = useStateRef<number>(0);
  const measurementMidiSamplesRef = useStateRef<number[]>([]);
  const measurementPitchSampleTimesRef = useStateRef<number[]>([]);
  const measurementLoudnessSamplesRef = useStateRef<number[]>([]);
  const measurementVoicedFramesRef = useStateRef<number>(0);
  const measurementFramesRef = useStateRef<number>(0);
  const measurementTrackEndHandlerRef = useStateRef<(() => void) | null>(null);
  const measurementPitchGuideRef = useStateRef<PitchGuide | null>(null);
  const measurementPitchGuideAudioRef = useStateRef<HTMLAudioElement | null>(null);
  const measurementPitchGuideEndedHandlerRef = useStateRef<(() => void) | null>(null);
  const measurementRecorderRef = useStateRef<MediaRecorder | null>(null);
  const measurementRecorderChunksRef = useStateRef<BlobPart[]>([]);
  const measurementAutoPlaybackRef = useStateRef<boolean>(false);
  const measurementPrevMidiRef = useStateRef<number | null>(null);
  const measurementSmoothedMidiRef = useStateRef<number | null>(null);
  const measurementUnvoicedFramesRef = useStateRef<number>(0);
  const measurementVoicedStreakRef = useStateRef<number>(0);
  const measurementRangePhaseRef = useStateRef<RangePhase | null>(null);
  const measurementRangeChestMidiRef = useStateRef<number[]>([]);
  const measurementRangeFalsettoMidiRef = useStateRef<number[]>([]);
  const bodyOverflowBackupRef = useStateRef<string | null>(null);
  const measurementSaveBtnRef = useRef<HTMLButtonElement | null>(null);
  const measurementReplaySectionRef = useRef<HTMLDivElement | null>(null);
  const replayAudioRef = useStateRef<HTMLAudioElement | null>(null);
  const replayRafRef = useStateRef<number | null>(null);

  const selected: ScaleTrack | null = useMemo(() => {
    return tracks.find((t) => t.scale_type === scaleType && t.tempo === tempo) ?? null;
  }, [tracks, scaleType, tempo]);
  const activeMeasurement = useMemo(
    () => MEASUREMENT_SHORTCUTS.find((v) => v.systemKey === activeMeasurementKey) ?? null,
    [activeMeasurementKey]
  );
  const effectivePitchGuideRange: PitchGuideRange = pitchGuideRange ?? "mid";
  const pitchGuide = useMemo(() => buildPitchGuide(effectivePitchGuideRange), [effectivePitchGuideRange]);
  const selectedPitchGuideOption = useMemo(
    () => PITCH_GUIDE_OPTIONS.find((v) => v.key === pitchGuideRange) ?? null,
    [pitchGuideRange]
  );
  const sessionCopy = sessionCopyFor(activeMeasurementKey);
  const activeMeasurementIndex = MEASUREMENT_SHORTCUTS.findIndex((v) => v.systemKey === activeMeasurementKey);

  const { audioRef, isPlaying, togglePlay, onPlay, onPause, onEnded } = useAudioPlayer(
    selected?.id ?? null,
    {
      defaultVolume: settings.defaultVolume,
      loopEnabled: settings.loopEnabled,
    }
  );

  const disabled = loading || !!error || !selected;
  const isMdUp = useMediaQuery("(min-width: 641px)");
  const mobileStepParam = searchParams.get("measureStep");
  const mobileStep: "select" | "execute" = mobileStepParam === "execute" ? "execute" : "select";
  const showSelectPane = isMdUp || mobileStep === "select";
  const showExecutePane = isMdUp || mobileStep === "execute";
  const supportsTrainingTrackToggle = activeMeasurementKey === "volume_stability";
  const shouldUseTrainingTrack = supportsTrainingTrackToggle && measurementUseTrainingTrack;
  const recordButtonDisabled =
    measurementSessionSaving ||
    measurementFileAnalyzing ||
    (activeMeasurementKey === "pitch_accuracy" && !measurementRecording && !pitchGuideRange) ||
    (measurementRecording && activeMeasurementKey === "range") ||
    (shouldUseTrainingTrack && !selected?.file_path);
  const transportSwitchDisabled = measurementRecording || measurementSessionSaving || measurementFileAnalyzing;
  const playerRecordLabel = measurementRecording
    ? activeMeasurementKey === "range"
      ? "● 録音中（モニターで操作）"
      : "■ 停止"
    : measurementSessionSaving
      ? "保存中…"
      : activeMeasurementKey === "pitch_accuracy" && !pitchGuideRange
        ? "スケールを選択してください"
      : "▶ 録音開始";

  const setMobileMeasureStep = (step: "select" | "execute") => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (step === "execute") next.set("measureStep", "execute");
      else next.delete("measureStep");
      return next;
    });
  };

  const guestMode = !authLoading && !me;
  const goLogin = () => {
    navigate("/login", { state: { fromPath: "/training" } });
  };

  const stopPitchGuideAudio = useCallback(() => {
    const audio = measurementPitchGuideAudioRef.current;
    const endedHandler = measurementPitchGuideEndedHandlerRef.current;
    if (audio && endedHandler) {
      audio.removeEventListener("ended", endedHandler);
    }
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // no-op
      }
    }
    measurementPitchGuideEndedHandlerRef.current = null;
    measurementPitchGuideAudioRef.current = null;
  }, [measurementPitchGuideAudioRef, measurementPitchGuideEndedHandlerRef]);

  const stopReplayAudio = useCallback(() => {
    const audio = replayAudioRef.current;
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // no-op
      }
    }
    if (replayRafRef.current != null) {
      cancelAnimationFrame(replayRafRef.current);
      replayRafRef.current = null;
    }
    setMeasurementReplayPlaying(false);
    setMeasurementReplayElapsedSec(0);
    replayAudioRef.current = null;
  }, [replayAudioRef, replayRafRef]);

  const clearRecordedAudio = useCallback(() => {
    stopReplayAudio();
    if (measurementRecordedAudioUrl) {
      URL.revokeObjectURL(measurementRecordedAudioUrl);
    }
    setMeasurementRecordedAudioUrl(null);
    setMeasurementRecordedAudioBlob(null);
  }, [measurementRecordedAudioUrl, stopReplayAudio]);

  const stopMeasurementAudioCapture = useCallback(async (): Promise<Blob | null> => {
    const recorder = measurementRecorderRef.current;
    if (!recorder) return null;

    const chunks = measurementRecorderChunksRef.current;
    const mimeType = recorder.mimeType || "audio/webm";
    const finalize = () => {
      const blob = chunks.length > 0 ? new Blob(chunks, { type: mimeType }) : null;
      measurementRecorderChunksRef.current = [];
      measurementRecorderRef.current = null;
      return blob;
    };

    if (recorder.state === "inactive") {
      await new Promise((resolve) => setTimeout(resolve, 120));
      return finalize();
    }

    return await new Promise<Blob | null>((resolve) => {
      const handleStop = () => {
        window.setTimeout(() => resolve(finalize()), 120);
      };
      const handleError = () => resolve(finalize());
      recorder.addEventListener("stop", handleStop, { once: true });
      recorder.addEventListener("error", handleError, { once: true });
      try {
        if (typeof recorder.requestData === "function") {
          recorder.requestData();
        }
        recorder.stop();
      } catch {
        resolve(finalize());
      }
    });
  }, [measurementRecorderChunksRef, measurementRecorderRef]);

  const createAudioRecorder = useCallback((stream: MediaStream): MediaRecorder | null => {
    if (typeof MediaRecorder === "undefined") return null;

    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];

    for (const mimeType of candidates) {
      try {
        if (typeof MediaRecorder.isTypeSupported === "function" && !MediaRecorder.isTypeSupported(mimeType)) {
          continue;
        }
        return new MediaRecorder(stream, { mimeType });
      } catch {
        // try next
      }
    }

    try {
      return new MediaRecorder(stream);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const missionParam = searchParams.get("mission");
    if (missionParam === "range") {
      setActiveMeasurementKey("range");
      setMissionRangeAutoInclude(true);
      const next = new URLSearchParams(searchParams);
      next.delete("mission");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    return () => {
      void stopMeasurementRecording(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const modalOpen = measurementRecording || measurementMetricInfoOpen || measurementResultModalOpen;
    if (modalOpen) {
      if (bodyOverflowBackupRef.current == null) {
        bodyOverflowBackupRef.current = document.body.style.overflow;
      }
      document.body.style.overflow = "hidden";
      document.body.dataset.hideChrome = "true";
    } else {
      if (bodyOverflowBackupRef.current != null) {
        document.body.style.overflow = bodyOverflowBackupRef.current;
        bodyOverflowBackupRef.current = null;
      } else {
        document.body.style.overflow = "";
      }
      delete document.body.dataset.hideChrome;
    }

    return () => {
      if (bodyOverflowBackupRef.current != null) {
        document.body.style.overflow = bodyOverflowBackupRef.current;
        bodyOverflowBackupRef.current = null;
      } else {
        document.body.style.overflow = "";
      }
      delete document.body.dataset.hideChrome;
    };
  }, [measurementMetricInfoOpen, measurementRecording, measurementResultModalOpen, bodyOverflowBackupRef]);

  useEffect(() => {
    if (!measurementResultModalOpen || !measurementInstantResult) return;
    const raf = requestAnimationFrame(() => {
      if (!measurementInstantResult.includeInInsights) {
        measurementSaveBtnRef.current?.focus();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [measurementResultModalOpen, measurementInstantResult]);

  useEffect(() => {
    let cancelled = false;
    if (!measurementResultModalOpen || !measurementInstantResult || measurementInstantResult.title !== "ロングトーン") {
      setLongToneCompare({ previousSec: null, bestSec: null });
      return;
    }
    (async () => {
      try {
        const runs = await fetchMeasurements({ measurement_type: "long_tone", days: 365, limit: 100 });
        if (cancelled) return;
        const normalized = runs
          .map((run) => ({ run, sec: longToneSecFromResult(run.result) }))
          .filter((v) => v.sec != null) as Array<{ run: MeasurementRun; sec: number }>;
        const sorted = normalized.sort((a, b) => b.run.recorded_at.localeCompare(a.run.recorded_at));
        const currentId = measurementInstantResult.runId;
        const previous = sorted.find((v) => v.run.id !== currentId) ?? null;
        const best = sorted.reduce<number | null>((acc, cur) => (acc == null || cur.sec > acc ? cur.sec : acc), null);
        setLongToneCompare({ previousSec: previous?.sec ?? null, bestSec: best });
      } catch {
        if (cancelled) return;
        setLongToneCompare({ previousSec: null, bestSec: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [measurementResultModalOpen, measurementInstantResult]);

  useEffect(() => {
    if (!measurementResultModalOpen || !measurementInstantResult) return;
    setMeasurementReplayPanelOpen(false);
  }, [measurementResultModalOpen, measurementInstantResult?.runId]);

  const startMeasurementRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMeasurementError("このブラウザは録音に対応していません");
      return;
    }
    if (activeMeasurementKey === "pitch_accuracy" && !pitchGuideRange) {
      setMeasurementError("先にスケールを選択してください");
      return;
    }
    setMeasurementError(null);
    setMeasurementResultModalOpen(false);
    clearRecordedAudio();
    if (shouldUseTrainingTrack && (!selected?.file_path || !audioRef.current)) {
      setMeasurementError("同時再生モードには再生可能なトレーニング音源が必要です");
      return;
    }

    try {
      const noiseDbThreshold = noiseDbThresholdFor(activeMeasurementKey);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: false, autoGainControl: false, echoCancellation: false },
      });
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) {
        stream.getTracks().forEach((t) => t.stop());
        setMeasurementError("AudioContext が利用できません");
        return;
      }

      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.05;
      source.connect(analyser);

      measurementAudioContextRef.current = ctx;
      measurementSourceRef.current = source;
      measurementAnalyserRef.current = analyser;
      measurementMediaStreamRef.current = stream;
      measurementStartedAtRef.current = performance.now();
      measurementMidiSamplesRef.current = [];
      measurementPitchSampleTimesRef.current = [];
      measurementLoudnessSamplesRef.current = [];
      measurementVoicedFramesRef.current = 0;
      measurementFramesRef.current = 0;
      measurementPrevMidiRef.current = null;
      measurementSmoothedMidiRef.current = null;
      measurementUnvoicedFramesRef.current = 0;
      measurementVoicedStreakRef.current = 0;
      setMeasurementCurrentNote(null);
      setMeasurementCurrentMidi(null);
      setMeasurementCurrentDb(null);
      setMeasurementRealtimePitchPoints([]);
      setMeasurementElapsedSec(0);
      setMeasurementRealtimeDbPoints([]);
      measurementPitchGuideRef.current = activeMeasurementKey === "pitch_accuracy" ? pitchGuide : null;
      if (activeMeasurementKey === "range") {
        setRangePhase("chest");
        measurementRangePhaseRef.current = "chest";
        measurementRangeChestMidiRef.current = [];
        measurementRangeFalsettoMidiRef.current = [];
      } else {
        setRangePhase(null);
        measurementRangePhaseRef.current = null;
      }
      setMeasurementRecording(true);
      measurementAutoPlaybackRef.current = false;
      {
        const recorder = createAudioRecorder(stream);
        if (recorder) {
          measurementRecorderChunksRef.current = [];
          recorder.addEventListener("dataavailable", (ev) => {
            if (ev.data && ev.data.size > 0) {
              measurementRecorderChunksRef.current.push(ev.data);
            }
          });
          try {
            recorder.start();
            measurementRecorderRef.current = recorder;
          } catch {
            measurementRecorderChunksRef.current = [];
            measurementRecorderRef.current = null;
          }
        } else {
          measurementRecorderChunksRef.current = [];
          measurementRecorderRef.current = null;
        }
      }

      if (activeMeasurementKey === "pitch_accuracy") {
        stopPitchGuideAudio();
        const guideAudio = new Audio(`/scales/pitch_accuracy-${effectivePitchGuideRange}.mp3`);
        guideAudio.preload = "auto";
        guideAudio.currentTime = 0;
        const onEnded = () => {
          void stopMeasurementRecording(true);
        };
        measurementPitchGuideEndedHandlerRef.current = onEnded;
        guideAudio.addEventListener("ended", onEnded);
        measurementPitchGuideAudioRef.current = guideAudio;
        await guideAudio.play();
      } else if (shouldUseTrainingTrack && audioRef.current) {
        const audio = audioRef.current;
        if (measurementTrackEndHandlerRef.current) {
          audio.removeEventListener("ended", measurementTrackEndHandlerRef.current);
          measurementTrackEndHandlerRef.current = null;
        }
        const onEnded = () => {
          void stopMeasurementRecording(true);
        };
        measurementTrackEndHandlerRef.current = onEnded;
        audio.addEventListener("ended", onEnded);
        audio.currentTime = 0;
        await audio.play();
        measurementAutoPlaybackRef.current = true;
      }

      const data = new Float32Array(analyser.fftSize);
      const tick = () => {
        const ac = measurementAudioContextRef.current;
        const an = measurementAnalyserRef.current;
        if (!ac || !an) return;

        an.getFloatTimeDomainData(data);
        const frameRms = calcRms(data);
        const frameDb = rmsToDb(frameRms);
        setMeasurementCurrentDb(frameDb);
        if (frameDb > noiseDbThreshold && measurementFramesRef.current % 2 === 0) {
          setMeasurementRealtimeDbPoints((prev) => [...prev.slice(-179), frameDb]);
          measurementLoudnessSamplesRef.current.push(frameDb);
        }
        const yinFreq = autoCorrelate(data, ac.sampleRate);
        const freq = frameDb > noiseDbThreshold ? yinFreq : null;
        const guideElapsedSec = measurementPitchGuideAudioRef.current?.currentTime;
        const elapsed =
          activeMeasurementKey === "pitch_accuracy" && Number.isFinite(guideElapsedSec)
            ? Math.max(0, guideElapsedSec ?? 0)
            : (performance.now() - measurementStartedAtRef.current) / 1000;
        setMeasurementElapsedSec(elapsed);
        measurementFramesRef.current += 1;
        if (freq && frameDb > noiseDbThreshold) {
          const midi = 69 + 12 * Math.log2(freq / 440);
          const prevMidi = measurementPrevMidiRef.current;
          if (prevMidi != null && Math.abs(midi - prevMidi) > PITCH_JUMP_SEMITONE_LIMIT) {
            measurementRafRef.current = requestAnimationFrame(tick);
            return;
          }
          measurementVoicedStreakRef.current += 1;
          if (measurementVoicedStreakRef.current < MIN_VOICED_STREAK_FRAMES) {
            measurementRafRef.current = requestAnimationFrame(tick);
            return;
          }
          measurementUnvoicedFramesRef.current = 0;
          measurementVoicedFramesRef.current += 1;
          measurementPrevMidiRef.current = midi;
          measurementMidiSamplesRef.current.push(midi);
          measurementPitchSampleTimesRef.current.push(elapsed);
          if (activeMeasurementKey === "range") {
            if (measurementRangePhaseRef.current === "chest") measurementRangeChestMidiRef.current.push(midi);
            if (measurementRangePhaseRef.current === "falsetto") measurementRangeFalsettoMidiRef.current.push(midi);
          }
          if (measurementFramesRef.current % 2 === 0) {
            setMeasurementRealtimePitchPoints((prev) => [...prev.slice(-1399), { t: elapsed, midi }]);
          }
          const prevSmoothed = measurementSmoothedMidiRef.current;
          const smoothed = prevSmoothed == null ? midi : prevSmoothed + (midi - prevSmoothed) * 0.22;
          measurementSmoothedMidiRef.current = smoothed;
          setMeasurementCurrentMidi(smoothed);
          setMeasurementCurrentNote(midiToNote(Math.round(smoothed)));
        } else {
          measurementVoicedStreakRef.current = 0;
          measurementUnvoicedFramesRef.current += 1;
          if (measurementUnvoicedFramesRef.current > 6) {
            measurementSmoothedMidiRef.current = null;
            setMeasurementCurrentMidi(null);
            setMeasurementCurrentNote(null);
          }
        }
        measurementRafRef.current = requestAnimationFrame(tick);
      };
      measurementRafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setMeasurementError(errorMessage(e, "録音開始に失敗しました"));
    }
  };

  const stopMeasurementRecording = async (save: boolean) => {
    const guideElapsedSec = measurementPitchGuideAudioRef.current?.currentTime;
    const elapsedAtStopSec =
      activeMeasurementKey === "pitch_accuracy" && Number.isFinite(guideElapsedSec)
        ? Math.max(0, guideElapsedSec ?? 0)
        : (performance.now() - measurementStartedAtRef.current) / 1000;
    stopPitchGuideAudio();
    if (measurementTrackEndHandlerRef.current && audioRef.current) {
      audioRef.current.removeEventListener("ended", measurementTrackEndHandlerRef.current);
      measurementTrackEndHandlerRef.current = null;
    }
    if (measurementAutoPlaybackRef.current && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      measurementAutoPlaybackRef.current = false;
    }

    const recordedBlob = await stopMeasurementAudioCapture();
    if (recordedBlob && save) {
      const nextUrl = URL.createObjectURL(recordedBlob);
      setMeasurementRecordedAudioBlob(recordedBlob);
      setMeasurementRecordedAudioUrl(nextUrl);
    } else if (!save) {
      clearRecordedAudio();
    }

    if (measurementRafRef.current != null) {
      cancelAnimationFrame(measurementRafRef.current);
      measurementRafRef.current = null;
    }
    if (measurementMediaStreamRef.current) {
      measurementMediaStreamRef.current.getTracks().forEach((t) => t.stop());
      measurementMediaStreamRef.current = null;
    }
    if (measurementSourceRef.current) {
      try {
        measurementSourceRef.current.disconnect();
      } catch {
        // no-op
      }
      measurementSourceRef.current = null;
    }
    if (measurementAnalyserRef.current) {
      try {
        measurementAnalyserRef.current.disconnect();
      } catch {
        // no-op
      }
      measurementAnalyserRef.current = null;
    }
    if (measurementAudioContextRef.current) {
      try {
        await measurementAudioContextRef.current.close();
      } catch {
        // no-op
      }
      measurementAudioContextRef.current = null;
    }

    setMeasurementRecording(false);
    setMeasurementCurrentMidi(null);
    setMeasurementCurrentNote(null);
    setMeasurementCurrentDb(null);
    setMeasurementElapsedSec(0);
    setRangePhase(null);
    measurementRangePhaseRef.current = null;
    measurementPitchGuideRef.current = null;

    if (!save) return;

    const mids = measurementMidiSamplesRef.current;
    const sampleTimesSec = measurementPitchSampleTimesRef.current;
    const loudnessDbSamples = measurementLoudnessSamplesRef.current;
    const elapsedSec = Math.max(1, Math.round(elapsedAtStopSec));
    const created = await saveMeasurementSessionFromMetrics({
      mids,
      sampleTimesSec,
      loudnessDbSamples,
      rangeChestMids: measurementRangeChestMidiRef.current,
      rangeFalsettoMids: measurementRangeFalsettoMidiRef.current,
      elapsedSec,
      voicedFrames: measurementVoicedFramesRef.current,
      frames: measurementFramesRef.current,
    });
    if (!created) return;
    setMeasurementInstantResult(created);
    setMeasurementResultModalOpen(true);
  };

  const onUploadMeasurementFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;

    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      setMeasurementError("AudioContext が利用できません");
      return;
    }

    const ctx = new Ctx();
    setMeasurementError(null);
    setMeasurementInstantResult(null);
    setMeasurementResultModalOpen(false);
    clearRecordedAudio();
    measurementPitchGuideRef.current = activeMeasurementKey === "pitch_accuracy" ? pitchGuide : null;
    setMeasurementFileAnalyzing(true);
    try {
      const noiseDbThreshold = noiseDbThresholdFor(activeMeasurementKey);
      const fileBuf = await file.arrayBuffer();
      const audio = await ctx.decodeAudioData(fileBuf);
      const data = audio.getChannelData(0);
      const windowSize = 4096;
      const hopSize = 1024;
      const mids: number[] = [];
      const sampleTimesSec: number[] = [];
      const loudnessDbSamples: number[] = [];
      let frames = 0;
      let voicedFrames = 0;
      let voicedStreak = 0;

      for (let i = 0; i + windowSize <= data.length; i += hopSize) {
        const frame = data.subarray(i, i + windowSize);
        const frameRms = calcRms(frame);
        const frameDb = rmsToDb(frameRms);
        if (frameDb <= noiseDbThreshold) {
          voicedStreak = 0;
          frames += 1;
          continue;
        }
        loudnessDbSamples.push(frameDb);
        const freq = autoCorrelate(frame, audio.sampleRate);
        frames += 1;
        if (!freq) {
          voicedStreak = 0;
          continue;
        }
        voicedStreak += 1;
        if (voicedStreak < MIN_VOICED_STREAK_FRAMES) continue;
        voicedFrames += 1;
        mids.push(69 + 12 * Math.log2(freq / 440));
        sampleTimesSec.push(i / audio.sampleRate);
      }

      const saved = await saveMeasurementSessionFromMetrics({
        mids,
        sampleTimesSec,
        loudnessDbSamples,
        elapsedSec: Math.max(1, Math.round(audio.duration)),
        voicedFrames,
        frames,
        source: "file",
      });
      if (saved) {
        setMeasurementInstantResult(saved);
        setMeasurementResultModalOpen(true);
      }
    } catch (err) {
      setMeasurementError(errorMessage(err, "音声ファイルの解析に失敗しました"));
    } finally {
      setMeasurementFileAnalyzing(false);
      try {
        await ctx.close();
      } catch {
        // no-op
      }
    }
  };

  const saveMeasurementSessionFromMetrics = async ({
    mids,
    sampleTimesSec,
    loudnessDbSamples,
    rangeChestMids,
    rangeFalsettoMids,
    elapsedSec,
    voicedFrames,
    frames,
    source = "recording",
  }: {
    mids: number[];
    sampleTimesSec: number[];
    loudnessDbSamples: number[];
    rangeChestMids?: number[];
    rangeFalsettoMids?: number[];
    elapsedSec: number;
    voicedFrames: number;
    frames: number;
    source?: "file" | "recording";
  }): Promise<MeasurementInstantResult | null> => {
    const voicedRatio = frames > 0 ? voicedFrames / frames : 0;
    const refinedMids = refineMidiSamples(mids);
    const quantizedMids = quantizeMidiSeriesWithHysteresis(refinedMids);
    const stableRange = estimateStableMidiRange(quantizedMids);
    const stableExtremes = estimateStableExtremes(quantizedMids);
    const percentileMin = percentile(refinedMids, 0.01);
    const percentileMax = percentile(refinedMids, 0.99);
    const minMidiBase = stableExtremes?.min ?? stableRange?.min ?? percentileMin;
    const maxMidiBase = stableExtremes?.max ?? stableRange?.max ?? percentileMax;
    const minMidi = Math.min(minMidiBase, percentileMin);
    const maxMidi = Math.max(maxMidiBase, percentileMax);
    const representativeMidi = quantizedMids.length ? median(quantizedMids) : null;
    const basePeakNote = quantizedMids.length ? midiToNote(Math.round(maxMidi)) : null;
    const baseLowestNote = quantizedMids.length ? midiToNote(Math.round(minMidi)) : null;
    const sustainNote = representativeMidi != null ? midiToNote(Math.round(representativeMidi)) : null;
    const baseRangeSemitones = quantizedMids.length ? Math.max(0, Math.round(maxMidi - minMidi)) : null;
    const pitchAbsCentsErrors =
      activeMeasurementKey === "pitch_accuracy"
        ? mids
            .map((m, idx) => {
              const t = sampleTimesSec[idx];
              const guide = measurementPitchGuideRef.current;
              const targetMidi = guide ? findTargetMidiAtSec(guide, t) : null;
              if (targetMidi == null) return null;
              return Math.abs(m - targetMidi) * 100;
            })
            .filter((v): v is number => v != null)
        : refinedMids.map((m) => Math.abs(m - Math.round(m)) * 100);
    const pitchAvgCentsError =
      pitchAbsCentsErrors.length > 0
        ? pitchAbsCentsErrors.reduce((acc, v) => acc + v, 0) / pitchAbsCentsErrors.length
        : null;
    const pitchScoreRaw = pitchAvgCentsError != null ? 100 - pitchAvgCentsError / 2 : null;
    const pitchAccuracyScore = pitchScoreRaw != null ? Math.max(0, Math.min(100, pitchScoreRaw)) : null;
    const pitchNoteCount = pitchAbsCentsErrors.length;
    const avgLoudnessDb = loudnessDbSamples.length
      ? loudnessDbSamples.reduce((acc, v) => acc + v, 0) / loudnessDbSamples.length
      : -99;
    const voicedDurationSec = elapsedSec * voicedRatio;
    const defaultPhonationDurationSec = Number(voicedDurationSec.toFixed(1));
    const longToneDurationSec = Number(voicedDurationSec.toFixed(1));
    const longToneNote = sustainNote;
    const phonationDurationSec =
      activeMeasurementKey === "long_tone" ? longToneDurationSec : defaultPhonationDurationSec;
    const resolvedSustainNote =
      activeMeasurementKey === "long_tone" ? longToneNote : sustainNote;
    const chestRangeBoundsRaw = estimatePhaseRangeBounds(rangeChestMids ?? [], "chest");
    const falsettoRangeBoundsRaw = estimatePhaseRangeBounds(rangeFalsettoMids ?? [], "falsetto");
    const chestRangeBounds =
      chestRangeBoundsRaw && falsettoRangeBoundsRaw && chestRangeBoundsRaw.max > falsettoRangeBoundsRaw.max
        ? { ...chestRangeBoundsRaw, max: falsettoRangeBoundsRaw.max }
        : chestRangeBoundsRaw;
    const falsettoRangeBounds = falsettoRangeBoundsRaw;
    const chestTopNote = chestRangeBounds ? midiToNote(Math.round(chestRangeBounds.max)) : null;
    const falsettoTopNote = falsettoRangeBounds ? midiToNote(Math.round(falsettoRangeBounds.max)) : null;
    const chestLowestNote = chestRangeBounds ? midiToNote(Math.round(chestRangeBounds.min)) : null;
    const falsettoLowestNote = falsettoRangeBounds ? midiToNote(Math.round(falsettoRangeBounds.min)) : null;
    const chestMinMidi = chestRangeBounds?.min ?? null;
    const chestMaxMidi = chestRangeBounds?.max ?? null;
    const falsettoMinMidi = falsettoRangeBounds?.min ?? null;
    const falsettoMaxMidi = falsettoRangeBounds?.max ?? null;
    const overlapMinMidi =
      chestMinMidi != null && falsettoMinMidi != null ? Math.max(chestMinMidi, falsettoMinMidi) : null;
    const overlapMaxMidi =
      chestMaxMidi != null && falsettoMaxMidi != null ? Math.min(chestMaxMidi, falsettoMaxMidi) : null;
    const hasOverlap = overlapMinMidi != null && overlapMaxMidi != null && overlapMinMidi <= overlapMaxMidi;
    const overlapLowestNote = hasOverlap ? midiToNote(Math.round(overlapMinMidi)) : null;
    const overlapHighestNote = hasOverlap ? midiToNote(Math.round(overlapMaxMidi)) : null;
    const phaseMinMidiCandidates = [chestMinMidi, falsettoMinMidi].filter((v): v is number => v != null);
    const phaseMaxMidiCandidates = [chestMaxMidi, falsettoMaxMidi].filter((v): v is number => v != null);
    const totalMinMidi = phaseMinMidiCandidates.length > 0 ? Math.min(minMidi, ...phaseMinMidiCandidates) : minMidi;
    const totalMaxMidi = phaseMaxMidiCandidates.length > 0 ? Math.max(maxMidi, ...phaseMaxMidiCandidates) : maxMidi;
    const lowestNote = quantizedMids.length ? midiToNote(Math.round(totalMinMidi)) : baseLowestNote;
    const peakNote = quantizedMids.length ? midiToNote(Math.round(totalMaxMidi)) : basePeakNote;
    const rangeSemitones = quantizedMids.length
      ? Math.max(0, Math.round(totalMaxMidi - totalMinMidi))
      : baseRangeSemitones;

    if (activeMeasurementKey === "range" && (!lowestNote || !peakNote || rangeSemitones == null)) {
      setMeasurementError("有効な音程が十分に検出できませんでした。もう少し大きい声で再測定してください。");
      return null;
    }
    if (activeMeasurementKey === "range" && source !== "file" && !chestTopNote) {
      setMeasurementError("地声の最高音を検出できませんでした。地声パートを再測定してください。");
      return null;
    }
    if (activeMeasurementKey === "range" && source !== "file" && !falsettoTopNote) {
      setMeasurementError("裏声の最高音を検出できませんでした。裏声パートを再測定してください。");
      return null;
    }
    if (activeMeasurementKey === "long_tone" && (resolvedSustainNote == null || phonationDurationSec <= 0)) {
      setMeasurementError("ロングトーンを判定できませんでした。有効な発声が続くように再測定してください。");
      return null;
    }
    if (
      activeMeasurementKey === "pitch_accuracy" &&
      (pitchAccuracyScore == null || pitchAvgCentsError == null || pitchNoteCount === 0)
    ) {
      setMeasurementError("音程精度を判定できませんでした。発声して再測定してください。");
      return null;
    }
    if (
      activeMeasurementKey === "volume_stability" &&
      (!Number.isFinite(avgLoudnessDb) || loudnessDbSamples.length === 0)
    ) {
      setMeasurementError("音量データを検出できませんでした。環境音を減らして、よりはっきり発声してください。");
      return null;
    }

    try {
      setMeasurementSessionSaving(true);
      const shouldAutoIncludeRange = missionRangeAutoInclude && activeMeasurementKey === "range";
      const saved = await persistMeasurement({
        systemKey: activeMeasurementKey,
        peakNote,
        lowestNote,
        sustainNote: resolvedSustainNote,
        rangeSemitones,
        chestTopNote,
        falsettoTopNote,
        phonationDurationSec,
        loudnessDbSamples,
        avgLoudnessDb,
        pitchAccuracyScore,
        pitchAvgCentsError,
        pitchNoteCount,
        includeInInsights: shouldAutoIncludeRange,
      });
      emitGamificationRewards(saved.rewards);
      if (shouldAutoIncludeRange) {
        setMissionRangeAutoInclude(false);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(RANGE_MISSION_FLAG, "1");
          window.dispatchEvent(new CustomEvent("insights:update"));
        }
      }
      return buildMeasurementInstantResult({
        runId: saved.run.id,
        measurementKey: activeMeasurementKey,
        includeInInsights: !!saved.run.include_in_insights,
        source,
        systemKey: activeMeasurementKey,
        lowestNote,
        peakNote,
        sustainNote: resolvedSustainNote,
        rangeSemitones,
        chestTopNote,
        falsettoTopNote,
        chestLowestNote,
        falsettoLowestNote,
        overlapHighestNote,
        overlapLowestNote,
        phonationDurationSec,
        loudnessDbSamples,
        avgLoudnessDb,
        pitchAccuracyScore,
        pitchAvgCentsError,
        pitchNoteCount,
        replayPitchPoints: sampleTimesSec.map((t, idx) => ({ t, midi: mids[idx] ?? 0 })).filter((v) => Number.isFinite(v.midi)),
        replayDbValues: loudnessDbSamples.map((v) => Number(v.toFixed(3))),
        replayDurationSec: elapsedSec,
        replayGuideRange: activeMeasurementKey === "pitch_accuracy" ? effectivePitchGuideRange : null,
      });
    } catch (e) {
      setMeasurementError(errorMessage(e, "測定結果の保存に失敗しました"));
      return null;
    } finally {
      setMeasurementSessionSaving(false);
    }
  };
  const onSelectMeasurementShortcut = (systemKey: MeasurementSystemKey) => {
    setMeasurementError(null);
    setActiveMeasurementKey(systemKey);
    if (!isMdUp) setMobileMeasureStep("execute");
  };
  const moveMeasurementShortcut = (delta: -1 | 1) => {
    const count = MEASUREMENT_SHORTCUTS.length;
    if (count === 0 || activeMeasurementIndex < 0) return;
    const nextIndex = (activeMeasurementIndex + delta + count) % count;
    onSelectMeasurementShortcut(MEASUREMENT_SHORTCUTS[nextIndex].systemKey);
  };
  const closeMeasurementResultModal = () => {
    stopReplayAudio();
    setMeasurementReplayPanelOpen(false);
    setMeasurementResultModalOpen(false);
    clearRecordedAudio();
  };
  const saveMeasurementForInsights = async () => {
    if (!measurementInstantResult || measurementInstantResult.includeInInsights) {
      closeMeasurementResultModal();
      return;
    }
    try {
      setMeasurementResultSaving(true);
      await updateMeasurement({ id: measurementInstantResult.runId, include_in_insights: true });
      setMeasurementInstantResult({ ...measurementInstantResult, includeInInsights: true });
      closeMeasurementResultModal();
    } catch (e) {
      setMeasurementError(errorMessage(e, "測定結果の保存設定に失敗しました"));
    } finally {
      setMeasurementResultSaving(false);
    }
  };
  const moveToFalsettoRange = () => {
    if (!measurementRecording || activeMeasurementKey !== "range") return;
    setRangePhase("falsetto");
    measurementRangePhaseRef.current = "falsetto";
    // 地声→裏声の切替直後は音高ジャンプが大きくなるため、前状態をリセットして検出を通しやすくする。
    measurementPrevMidiRef.current = null;
    measurementSmoothedMidiRef.current = null;
    measurementVoicedStreakRef.current = 0;
    measurementUnvoicedFramesRef.current = 0;
    setMeasurementRealtimePitchPoints([]);
    setMeasurementCurrentMidi(null);
    setMeasurementCurrentNote(null);
    setMeasurementError(null);
  };
  const cancelMeasurementRecording = () => {
    void stopMeasurementRecording(false);
  };

  const replayCurrentMidi = useMemo(() => {
    const points = measurementInstantResult?.replayPitchPoints ?? [];
    if (points.length === 0) return null;
    const targetTime = measurementReplayElapsedSec;
    let last = points[0].midi;
    for (const point of points) {
      if (point.t > targetTime) break;
      last = point.midi;
    }
    return last;
  }, [measurementInstantResult, measurementReplayElapsedSec]);

  const toggleReplayAudio = async () => {
    setMeasurementReplayPanelOpen(true);
    if (!measurementRecordedAudioUrl) {
      setMeasurementError("この端末/ブラウザでは録音の再生に対応していない可能性があります。");
      return;
    }
    const existing = replayAudioRef.current;
    if (existing && !existing.paused) {
      stopReplayAudio();
      return;
    }
    requestAnimationFrame(() => {
      measurementReplaySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    const audio = existing ?? new Audio(measurementRecordedAudioUrl);
    audio.preload = "auto";
    replayAudioRef.current = audio;
    const tick = () => {
      const current = replayAudioRef.current;
      if (!current) return;
      setMeasurementReplayElapsedSec(current.currentTime || 0);
      if (!current.paused && !current.ended) {
        replayRafRef.current = requestAnimationFrame(tick);
      }
    };
    if (replayRafRef.current != null) {
      cancelAnimationFrame(replayRafRef.current);
      replayRafRef.current = null;
    }
    audio.onended = () => {
      stopReplayAudio();
    };
    try {
      setMeasurementReplayElapsedSec(audio.currentTime || 0);
      await audio.play();
      setMeasurementReplayPlaying(true);
      replayRafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setMeasurementError(errorMessage(e, "録音の再生を開始できませんでした"));
      stopReplayAudio();
    }
  };

  const downloadRecordedAudio = async () => {
    if (!measurementRecordedAudioBlob) {
      setMeasurementError("この端末/ブラウザでは録音データの保存に対応していない可能性があります。");
      return;
    }
    try {
      setMeasurementWavConverting(true);
      const wavBlob = await convertBlobToWav(measurementRecordedAudioBlob);
      const tempUrl = URL.createObjectURL(wavBlob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
      const key = measurementInstantResult?.measurementKey ?? "measurement";
      a.href = tempUrl;
      a.download = `voice-measurement-${key}-${stamp}.wav`;
      a.click();
      URL.revokeObjectURL(tempUrl);
    } catch (e) {
      setMeasurementError(errorMessage(e, "WAVへの変換に失敗しました。"));
    } finally {
      setMeasurementWavConverting(false);
    }
  };

  return (
    <div className="page trainingPage">
      <ProcessingOverlay
        open={measurementSessionSaving}
        title="保存中..."
        description="測定結果を保存しています"
      />
      <ProcessingOverlay
        open={measurementFileAnalyzing}
        title="音声解析中..."
        description="音声ファイルを解析しています"
        delayMs={0}
      />
      {measurementRecording && (
        <div className="trainingPage__recordOverlay" role="dialog" aria-modal="true" aria-label="録音中の音程表示">
          <div className="trainingPage__recordCard trainingPage__recordCard--monitor">
            {activeMeasurementKey === "volume_stability" ? (
              <RealtimeDbMonitor dbValues={measurementRealtimeDbPoints} currentDb={measurementCurrentDb} />
            ) : (
                <RealtimePitchMonitor
                  points={measurementRealtimePitchPoints}
                  currentMidi={measurementCurrentMidi}
                  systemKey={activeMeasurementKey}
                  pitchGuide={activeMeasurementKey === "pitch_accuracy" ? pitchGuide : null}
                  pitchGuideRange={effectivePitchGuideRange}
                  elapsedSec={measurementElapsedSec}
                />
            )}
            {activeMeasurementKey === "range" ? (
              <div className="trainingPage__rangePhaseActions">
                <div className="trainingPage__rangePhaseBanner">
                  {rangePhase === "falsetto" ? "次は裏声の音域です。" : "まずは地声の音域です。"}
                </div>
                {rangePhase === "falsetto" ? (
                  <div className="trainingPage__rangePhaseBtnRow">
                    <button
                      type="button"
                      className="trainingPage__saveBtn is-recording"
                      onClick={() => void stopMeasurementRecording(true)}
                      disabled={measurementSessionSaving}
                    >
                      録音停止して分析
                    </button>
                    <button
                      type="button"
                      className="trainingPage__measurementMiniBtn trainingPage__measurementMiniBtn--ghost"
                      onClick={cancelMeasurementRecording}
                      disabled={measurementSessionSaving}
                    >
                      やめる
                    </button>
                  </div>
                ) : (
                  <div className="trainingPage__rangePhaseBtnRow">
                    <button
                      type="button"
                      className="trainingPage__saveBtn is-recording"
                      onClick={moveToFalsettoRange}
                      disabled={measurementSessionSaving}
                    >
                      次に裏声を測定する
                    </button>
                    <button
                      type="button"
                      className="trainingPage__measurementMiniBtn trainingPage__measurementMiniBtn--ghost"
                      onClick={cancelMeasurementRecording}
                      disabled={measurementSessionSaving}
                    >
                      やめる
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="trainingPage__saveBtn is-recording"
                onClick={() => void stopMeasurementRecording(true)}
                disabled={measurementSessionSaving}
              >
                録音停止して測定保存
              </button>
            )}
          </div>
        </div>
      )}
      {measurementResultModalOpen && measurementInstantResult && (
        <div
          className="trainingPage__modalOverlay"
          role="button"
          tabIndex={0}
          onClick={closeMeasurementResultModal}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") closeMeasurementResultModal();
          }}
        >
          <div
            className={`trainingPage__resultModalCard${
              measurementInstantResult.title === "音域"
                ? " is-range"
                : measurementInstantResult.title === "ロングトーン" || measurementInstantResult.title === "音程精度"
                  ? " is-long-tone"
                  : " is-volume"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="測定結果"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                closeMeasurementResultModal();
                return;
              }
              if ((e.key === "Enter" || e.key === " ") && measurementInstantResult.title === "音域" && !measurementInstantResult.includeInInsights) {
                e.preventDefault();
                void saveMeasurementForInsights();
                return;
              }
              e.stopPropagation();
            }}
          >
            <div className="trainingPage__resultModalHeader">
              <div className="trainingPage__resultModalTitle">
                {measurementInstantResult.source === "file" ? "解析完了" : "測定完了"}
              </div>
              {measurementInstantResult.title !== "音域" && (
                <div className="trainingPage__resultModalMeta">
                  {measurementInstantResult.title} / {measurementInstantResult.measuredAt}
                </div>
              )}
            </div>

            <div className="trainingPage__resultModalBody">
              {measurementInstantResult.title === "音域" && (
                <div className="trainingPage__resultModalHero">
                  <div className="trainingPage__resultModalHeroLabel">あなたの音域は</div>
                  <div className="trainingPage__resultModalHeroValue">
                    {measurementInstantResult.rangeOctaves != null ? measurementInstantResult.rangeOctaves.toFixed(2) : "-"}
                    <span className="trainingPage__resultModalHeroUnit">oct</span>
                  </div>
                  <div className="trainingPage__resultModalHeroSub">
                    {measurementInstantResult.rangeSemitones != null ? `(${formatSemitoneLabel(measurementInstantResult.rangeSemitones)})` : "(semitone未算出)"}
                  </div>
                  {measurementInstantResult.lowestNote && measurementInstantResult.highestNote && (
                    <div className="trainingPage__resultModalHeroAssist">
                      {measurementInstantResult.lowestNote} → {measurementInstantResult.highestNote}
                    </div>
                  )}
                </div>
              )}
              {measurementInstantResult.title === "音域" && (
              <RangeResultVisualizer
                lowestNote={measurementInstantResult.lowestNote ?? null}
                highestNote={measurementInstantResult.highestNote ?? null}
                chestTopNote={measurementInstantResult.chestTopNote ?? null}
                falsettoTopNote={measurementInstantResult.falsettoTopNote ?? null}
                chestLowestNote={measurementInstantResult.chestLowestNote ?? null}
                falsettoLowestNote={measurementInstantResult.falsettoLowestNote ?? null}
                  overlapHighestNote={measurementInstantResult.overlapHighestNote ?? null}
                  overlapLowestNote={measurementInstantResult.overlapLowestNote ?? null}
                />
              )}
              {measurementInstantResult.title === "ロングトーン" && (
                <LongToneResultHero
                  seconds={measurementInstantResult.longToneSec ?? null}
                  note={measurementInstantResult.sustainNote ?? null}
                  previousSec={longToneCompare.previousSec}
                  bestSec={longToneCompare.bestSec}
                />
              )}
              {measurementInstantResult.title === "音程精度" && (
                <div className="trainingPage__resultModalMetric">
                  {(() => {
                    const semitoneDrift =
                      measurementInstantResult.pitchAccuracyAvgCents != null
                        ? Math.max(0, measurementInstantResult.pitchAccuracyAvgCents / 100)
                        : null;
                    return (
                      <>
                        <div className="trainingPage__resultModalMetricValue">
                          {semitoneDrift != null ? semitoneDrift.toFixed(2) : "-"}
                          <span>半音</span>
                        </div>
                        <div className="trainingPage__resultModalMetricSub">
                          平均ズレ: {measurementInstantResult.pitchAccuracyAvgCents != null ? `${measurementInstantResult.pitchAccuracyAvgCents.toFixed(1)} cent` : "-"}
                        </div>
                        <div className="trainingPage__resultModalStats">
                          <div>発声音数 {measurementInstantResult.pitchAccuracyNoteCount ?? 0}</div>
                          <div>目安 ±{measurementInstantResult.pitchAccuracyAvgCents != null ? Math.max(0, Math.round(measurementInstantResult.pitchAccuracyAvgCents)).toFixed(0) : "-"} cent</div>
                          <div>精度 {measurementInstantResult.pitchAccuracyScore != null ? `${measurementInstantResult.pitchAccuracyScore.toFixed(1)} 点` : "-"}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              {measurementInstantResult.title === "音量安定性" && (
                <VolumeStabilityResultHero
                  score={measurementInstantResult.loudnessRangePct ?? null}
                  rangeDb={measurementInstantResult.loudnessRangeDb ?? null}
                  minDb={measurementInstantResult.minLoudnessDb ?? null}
                  avgDb={measurementInstantResult.avgLoudnessDb ?? null}
                  maxDb={measurementInstantResult.maxLoudnessDb ?? null}
                  timeline={measurementInstantResult.loudnessTimeline ?? []}
                />
              )}
              {measurementInstantResult.source === "recording" && measurementRecordedAudioUrl && (
                <div className="trainingPage__resultReplay" ref={measurementReplaySectionRef}>
                  <div className="trainingPage__resultReplayHead">
                    <div className="trainingPage__resultReplayTitle">録音の再生プレビュー</div>
                    <button
                      type="button"
                      className="trainingPage__resultReplayToggle"
                      onClick={() => {
                        setMeasurementReplayPanelOpen((prev) => {
                          const next = !prev;
                          if (!next) stopReplayAudio();
                          return next;
                        });
                      }}
                      aria-expanded={measurementReplayPanelOpen}
                      aria-label={measurementReplayPanelOpen ? "再生プレビューを閉じる" : "再生プレビューを開く"}
                    >
                      <span className="trainingPage__resultReplayToggleIcon" aria-hidden="true">
                        <span className={measurementReplayPanelOpen ? "is-open" : "is-closed"} />
                      </span>
                    </button>
                  </div>
                  {measurementReplayPanelOpen && (
                    <div className="trainingPage__resultReplayMonitor">
                      {measurementInstantResult.measurementKey === "volume_stability" ? (
                        <RealtimeDbMonitor
                          dbValues={measurementInstantResult.replayDbValues ?? []}
                          currentDb={
                            measurementInstantResult.replayDbValues && measurementInstantResult.replayDbValues.length > 0
                              ? measurementInstantResult.replayDbValues[
                                  Math.min(
                                    measurementInstantResult.replayDbValues.length - 1,
                                    Math.floor(
                                      (measurementReplayElapsedSec /
                                        Math.max(0.001, measurementInstantResult.replayDurationSec ?? 1)) *
                                        measurementInstantResult.replayDbValues.length
                                    )
                                  )
                                ]
                              : null
                          }
                          elapsedSec={measurementReplayElapsedSec}
                          durationSec={measurementInstantResult.replayDurationSec ?? undefined}
                          showPlayhead
                        />
                      ) : (
                        <RealtimePitchMonitor
                          points={measurementInstantResult.replayPitchPoints ?? []}
                          currentMidi={replayCurrentMidi}
                          systemKey={measurementInstantResult.measurementKey}
                          pitchGuide={
                            measurementInstantResult.measurementKey === "pitch_accuracy"
                              ? buildPitchGuide(measurementInstantResult.replayGuideRange ?? "mid")
                              : null
                          }
                          pitchGuideRange={measurementInstantResult.replayGuideRange ?? "mid"}
                          elapsedSec={measurementReplayElapsedSec}
                          totalDurationSec={measurementInstantResult.replayDurationSec ?? undefined}
                          showPlayhead
                        />
                      )}
                    </div>
                  )}
                  <div className="trainingPage__resultReplayActions">
                    <button
                      type="button"
                      className="trainingPage__resultModalBtn trainingPage__resultModalBtn--replay-primary trainingPage__resultReplayActionBtn"
                      onClick={() => void toggleReplayAudio()}
                    >
                      {measurementReplayPlaying ? "録音プレビューを停止" : "録音プレビューを再生"}
                    </button>
                    <button
                      type="button"
                      className="trainingPage__resultModalBtn trainingPage__resultModalBtn--download trainingPage__resultReplayActionBtn"
                      onClick={() => void downloadRecordedAudio()}
                      disabled={measurementWavConverting}
                    >
                      {measurementWavConverting ? "WAV変換中..." : "音声のみをWAV保存"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="trainingPage__resultModalFooter">
              <div className="trainingPage__resultModalActions">
                <div className="trainingPage__resultModalActionGroup trainingPage__resultModalActionGroup--persist">
                  <button
                    type="button"
                    className="trainingPage__resultModalBtn trainingPage__resultModalBtn--save trainingPage__resultModalBtn--savePrimary"
                    onClick={() => void saveMeasurementForInsights()}
                    disabled={measurementResultSaving || measurementInstantResult.includeInInsights}
                    ref={measurementSaveBtnRef}
                  >
                    {measurementInstantResult.includeInInsights
                      ? "保存済み"
                      : measurementResultSaving
                        ? "保存中..."
                        : "この結果を保存する"}
                  </button>
                </div>
                <div className="trainingPage__resultModalActionGroup trainingPage__resultModalActionGroup--close">
                  <button
                    type="button"
                    className="trainingPage__resultModalBtn trainingPage__resultModalBtn--close trainingPage__resultModalBtn--closeText"
                    onClick={closeMeasurementResultModal}
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="trainingPage__bg" aria-hidden="true" />

      {guestMode && (
        <section className="card trainingPage__aiIntroCard">
          <div className="trainingPage__aiIntroTitle">録音測定</div>
          <div className="trainingPage__aiIntroText">
            録音した音声から、音域・ロングトーン・音量安定性を測定します。
            結果をもとに、成長の推移を確認できます。
          </div>
          <div className="trainingPage__aiIntroExample">
            例: 音域 2.1 octave / ロングトーン 18.4 秒 / 音量安定スコア 82.3 点 / 音程精度 76.4 点
          </div>
          <button className="trainingPage__aiIntroBtn" onClick={goLogin}>
            ログインして測定機能を使う
          </button>
        </section>
      )}

      <main className="trainingPage__grid">
        <section className="trainingPage__panel">
          <div className="trainingPage__panelHead">
            <div className="trainingPage__panelTitle">トレーニングメニュー</div>
          </div>

          <div className="trainingPage__studioCard">
            <SessionStepHead
              badge="1"
              title="トレーニングメニューを選択"
              subtitle="スケールとテンポを選び、すぐに練習を始められます。"
              titleClassName="trainingPage__measurementStepTitle--record"
              className="trainingPage__measurementStepHead--training"
            />
            <div className="trainingPage__studioPlayer">
              <AudioPlayer
                audioRef={audioRef}
                src={selected?.file_path ?? undefined}
                disabled={disabled}
                isPlaying={isPlaying}
                onTogglePlay={togglePlay}
                onPlay={onPlay}
                onPause={onPause}
                onEnded={onEnded}
                defaultVolume={settings.defaultVolume}
                loopEnabled={settings.loopEnabled}
                scaleType={scaleType}
                tempo={tempo}
                scaleTypes={SCALE_TYPES}
                tempos={TEMPOS}
                onChangeScaleType={setScaleType}
                onChangeTempo={setTempo}
              />
            </div>
          </div>

          {loading && (
            <div className="trainingPage__loading" aria-hidden="true">
              <div className="trainingPage__skeleton" />
              <div className="trainingPage__skeleton trainingPage__skeleton--long" />
            </div>
          )}

          {error && (
            <div className="trainingPage__error" role="alert">
              <div className="trainingPage__errorTitle">読み込みに失敗しました</div>
              <div className="trainingPage__errorText">Error: {error}</div>
            </div>
          )}
        </section>
      </main>

      <section className="trainingPage__measurementPanel">
        <div className="trainingPage__panelHead trainingPage__measurementPanelHead">
          <div className="trainingPage__panelTitle">測定メニュー</div>
          {!guestMode && !isMdUp && mobileStep === "execute" && (
            <button
              type="button"
              className="trainingPage__measurementBackBtn"
              onClick={() => setMobileMeasureStep("select")}
            >
              ← 測定を選び直す
            </button>
          )}
        </div>

        {guestMode ? (
          <div className="trainingPage__measurementGuest">
            ログインすると、固定の測定メニューで録音測定を継続利用できます。
          </div>
        ) : (
          <>
            <div
              className={`trainingPage__measurementLayout${isMdUp ? " is-desktop" : ""}${
                isMdUp && !supportsTrainingTrackToggle ? " is-balanced" : ""
              }`}
            >
              {showSelectPane && (
                <section className="trainingPage__measurementStep trainingPage__measurementStep--manage trainingPage__measurementPane trainingPage__measurementPane--select">
                  <div className="trainingPage__measurementStepHead">
                    <div className="trainingPage__measurementStepBadge">1</div>
                    <div className="trainingPage__measurementStepHeadText">
                      <div className="trainingPage__measurementStepTitle">測定項目を選ぶ</div>
                      <div className="trainingPage__measurementStepDesc">カードをタップすると、すぐ実行画面へ進みます。</div>
                    </div>
                    <button
                      type="button"
                      className="trainingPage__measurementMiniBtn trainingPage__measurementMiniBtn--ghost"
                      onClick={() => setMeasurementMetricInfoOpen(true)}
                    >
                      測定項目について
                    </button>
                  </div>
                  <div className="trainingPage__measurementPresetGrid">
                    {MEASUREMENT_SHORTCUTS.map((shortcut) => {
                      const selectedNow = activeMeasurementKey === shortcut.systemKey;
                      return (
                        <button
                          key={shortcut.systemKey}
                          type="button"
                          className={`trainingPage__measurementPresetItem trainingPage__measurementPresetItemBtn${
                            selectedNow ? " is-selected" : ""
                          }`}
                          onClick={() => onSelectMeasurementShortcut(shortcut.systemKey)}
                          aria-pressed={selectedNow}
                        >
                          <div className="trainingPage__measurementPresetBody">
                            <div className="trainingPage__measurementPresetText">
                              <div className="trainingPage__measurementPresetItemHead">
                                <div className="trainingPage__measurementPresetName">{shortcut.title}</div>
                                {selectedNow && <span className="trainingPage__measurementSelectedBadge">選択中</span>}
                              </div>
                              <div className="trainingPage__measurementPresetDesc" title={shortcut.note}>
                                {shortcut.note}
                              </div>
                            </div>
                            <MiniPreview
                              kind={previewKindFor(shortcut.systemKey)}
                              size={isMdUp ? "md" : "sm"}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {showExecutePane && (
                <section
                  className="trainingPage__measurementStep trainingPage__measurementStep--record trainingPage__measurementPane trainingPage__measurementPane--execute"
                  data-measurement={activeMeasurementKey}
                >
                  <div className="trainingPage__measurementPaneSticky">
                    <SessionStepHead
                      badge="2"
                      title={sessionCopy.title}
                      subtitle={sessionCopy.subtitle}
                      titleClassName="trainingPage__measurementStepTitle--record"
                    />

                    <SessionPlayerCard
                      active={measurementRecording}
                      art={<MiniPreview kind={previewKindFor(activeMeasurementKey)} size="md" />}
                      title={activeMeasurement?.title ?? "測定"}
                      description={activeMeasurement?.selectedSummary}
                      error={measurementError ? <div className="trainingPage__measurementError">{measurementError}</div> : undefined}
                      transport={
                        <>
                          <button
                            type="button"
                            className="trainingPage__transportBtn"
                            onClick={() => moveMeasurementShortcut(-1)}
                            disabled={transportSwitchDisabled}
                            aria-label="前の測定項目"
                          >
                            ◀
                          </button>
                          <button
                            type="button"
                            className={`trainingPage__saveBtn trainingPage__recordPrimaryInline trainingPage__playerPrimary ${measurementRecording ? "is-recording" : ""}`}
                            onClick={() => {
                              if (measurementRecording && activeMeasurementKey !== "range") void stopMeasurementRecording(true);
                              else void startMeasurementRecording();
                            }}
                            disabled={recordButtonDisabled}
                          >
                            {playerRecordLabel}
                          </button>
                          <button
                            type="button"
                            className="trainingPage__transportBtn"
                            onClick={() => moveMeasurementShortcut(1)}
                            disabled={transportSwitchDisabled}
                            aria-label="次の測定項目"
                          >
                            ▶
                          </button>
                        </>
                      }
                      footer={
                        <>
                          {activeMeasurementKey === "range" && (
                            <div className="trainingPage__rangeTips" role="note" aria-label="音域測定のコツ">
                              <div className="trainingPage__rangeTipsTitle">正確に測定するために</div>
                              <ul className="trainingPage__rangeTipsList">
                                <li>地声の最高音は、少し長めにキープしてみましょう。</li>
                                <li>音はできるだけつなげて、なめらかに出してみましょう。</li>
                              </ul>
                            </div>
                          )}
                          {activeMeasurementKey === "pitch_accuracy" && (
                            <div className="trainingPage__pitchGuideConfig" role="note" aria-label="音程精度測定設定">
                              <div className="trainingPage__pitchGuideTitle">スケール選択（音程精度 / 音源追従）</div>
                              <div className="trainingPage__pitchGuideDesc">
                                使う5toneスケールを選べます。録音開始と同時に選択した固定音源を再生するので、参照バーに合わせて発声してください（イヤホン推奨）。
                              </div>
                              <div
                                className={`trainingPage__pitchGuideStatus ${pitchGuideRange ? "is-selected" : "is-required"}`}
                                aria-live="polite"
                              >
                                <span className="trainingPage__pitchGuideStatusStep">Step 1</span>
                                <span className="trainingPage__pitchGuideStatusText">
                                  {selectedPitchGuideOption
                                    ? `選択中: ${selectedPitchGuideOption.label}（${selectedPitchGuideOption.detail}）`
                                    : "先にスケールを選択してください"}
                                </span>
                              </div>
                              <div className="trainingPage__pitchGuideRangeRow">
                                {PITCH_GUIDE_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.key}
                                    type="button"
                                    className={`trainingPage__pitchGuideRangeBtn ${pitchGuideRange === opt.key ? "is-active" : ""}`}
                                    onClick={() => setPitchGuideRange(opt.key)}
                                    disabled={measurementRecording || measurementSessionSaving}
                                  >
                                    <span className="trainingPage__pitchGuideRangeBtnLabel">{opt.label}</span>
                                    <span className="trainingPage__pitchGuideRangeBtnMeta">{opt.detail}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <label className={`trainingPage__fileBtn ${measurementFileAnalyzing ? "is-busy" : ""}`}>
                            {measurementFileAnalyzing ? "解析中…" : "音声ファイルを解析"}
                            <input
                              type="file"
                              accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg"
                              onChange={(ev) => void onUploadMeasurementFile(ev)}
                              disabled={measurementRecording || measurementSessionSaving || measurementFileAnalyzing}
                            />
                          </label>
                          {supportsTrainingTrackToggle && (
                            <details className="trainingPage__measurementModeDetails">
                              <summary className="trainingPage__measurementModeSummary">Play with track</summary>
                              <div className="trainingPage__measurementModeText">
                                比較精度を上げるには、毎回同じスケール/テンポで「音源と同時に録音」するのが効果的です。
                              </div>
                              <label className="trainingPage__measurementToggle">
                                <input
                                  type="checkbox"
                                  checked={measurementUseTrainingTrack}
                                  onChange={(e) => setMeasurementUseTrainingTrack(e.target.checked)}
                                  disabled={measurementRecording || measurementSessionSaving || measurementFileAnalyzing}
                                />
                                <span className="trainingPage__measurementToggleTrack" aria-hidden="true">
                                  <span className="trainingPage__measurementToggleThumb" />
                                </span>
                                <span className="trainingPage__measurementToggleText">録音中にトレーニング音源を再生する</span>
                              </label>
                            </details>
                          )}
                        </>
                      }
                    />
                  </div>

                  {!isMdUp && (
                    <div className="trainingPage__mobileRecordDock" role="presentation">
                      <button
                        type="button"
                        className={`trainingPage__saveBtn trainingPage__mobileRecordBtn ${measurementRecording ? "is-recording" : ""}`}
                        onClick={() => {
                          if (measurementRecording && activeMeasurementKey !== "range") void stopMeasurementRecording(true);
                          else void startMeasurementRecording();
                        }}
                        disabled={recordButtonDisabled}
                      >
                        {playerRecordLabel}
                      </button>
                    </div>
                  )}
                </section>
              )}
            </div>
            {measurementMetricInfoOpen && (
              <div
                className="trainingPage__modalOverlay"
                role="button"
                tabIndex={0}
                onClick={() => setMeasurementMetricInfoOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setMeasurementMetricInfoOpen(false);
                }}
              >
                <div
                  className="trainingPage__modalCard"
                  role="dialog"
                  aria-modal="true"
                  aria-label="測定項目の説明"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div className="trainingPage__modalHead">
                    <div className="trainingPage__modalTitle">測定項目について</div>
                    <button
                      type="button"
                      className="trainingPage__measurementMiniBtn trainingPage__measurementMiniBtn--ghost"
                      onClick={() => setMeasurementMetricInfoOpen(false)}
                    >
                      閉じる
                    </button>
                  </div>
                  <div className="trainingPage__modalBody">
                    {PRESET_INFO.map((preset) => (
                      <div key={preset.title} className="trainingPage__metricInfoItem">
                        <div className="trainingPage__metricInfoLabel">{preset.title}</div>
                        <div className="trainingPage__metricInfoText trainingPage__metricInfoText--desc">{preset.description}</div>
                        <div className="trainingPage__metricInfoMetaHead">記録される項目</div>
                        <div className="trainingPage__metricInfoDataList">
                          {preset.savedItems.map((item) => (
                            <span key={item} className="trainingPage__metricInfoDataChip">
                              {item}
                            </span>
                          ))}
                        </div>
                        {preset.condition && (
                          <div className="trainingPage__metricInfoCondition">{preset.condition}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </section>
    </div>
  );
}

function RealtimePitchMonitor({
  points,
  currentMidi,
  systemKey,
  pitchGuide,
  pitchGuideRange,
  elapsedSec,
  showPlayhead = false,
  totalDurationSec,
}: {
  points: PitchPoint[];
  currentMidi: number | null;
  systemKey: MeasurementSystemKey;
  pitchGuide: PitchGuide | null;
  pitchGuideRange: PitchGuideRange;
  elapsedSec: number;
  showPlayhead?: boolean;
  totalDurationSec?: number;
}) {
  const isMobileViewport =
    typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
  const width = isMobileViewport ? 720 : 880;
  const height = isMobileViewport ? 640 : 420;
  const padTop = isMobileViewport ? 10 : 16;
  const padBottom = isMobileViewport ? 14 : 24;
  const padLeft = isMobileViewport ? 72 : 68;
  const padRight = 14;
  const currentNote = currentMidi != null ? midiToNote(Math.round(currentMidi)) : "--";
  const freqText = currentMidi != null ? `${midiToFreq(currentMidi).toFixed(1)} Hz` : "--";
  const nearestMidi = currentMidi != null ? Math.round(currentMidi) : null;
  const cents = nearestMidi != null && currentMidi != null ? (currentMidi - nearestMidi) * 100 : null;
  const clampedCents = cents != null ? Math.max(-50, Math.min(50, cents)) : 0;
  const tunerPos = (clampedCents + 50) / 100;

  const isPitchAccuracy = systemKey === "pitch_accuracy" && pitchGuide != null;
  if (!isPitchAccuracy && points.length < 2) {
    return (
      <div className="trainingPage__monitor trainingPage__monitor--pitch">
        <div className="trainingPage__monitorHeader">
          <div className="trainingPage__monitorValue">{currentNote}</div>
          <div className="trainingPage__monitorSub">{freqText}</div>
        </div>
        <div className="trainingPage__monitorEmpty">有効な音程が検出されるとグラフを表示します</div>
      </div>
    );
  }

  const minBound = isPitchAccuracy
    ? PITCH_AXIS_BY_RANGE[pitchGuideRange].minMidi
    : Math.max(24, Math.floor(Math.min(...points.map((v) => v.midi))) - 2);
  const maxBound = isPitchAccuracy
    ? PITCH_AXIS_BY_RANGE[pitchGuideRange].maxMidi
    : Math.min(96, Math.ceil(Math.max(...points.map((v) => v.midi))) + 2);
  const range = Math.max(1, maxBound - minBound);
  const axisDurationSec = isPitchAccuracy
    ? Math.max(1, Math.min(PITCH_SCROLL_WINDOW_SEC, pitchGuide.totalSec))
    : Math.max(1, totalDurationSec ?? ((points.at(-1)?.t ?? 0) - (points[0]?.t ?? 0)));
  const axisStartSec = isPitchAccuracy
    ? Math.max(
        0,
        Math.min(
          Math.max(0, pitchGuide.totalSec - axisDurationSec),
          elapsedSec - axisDurationSec * 0.35
        )
      )
    : points[0]?.t ?? 0;
  const projectedPoints = points.map((point) => {
    const x = padLeft + (((point.t - axisStartSec) / axisDurationSec) * (width - padLeft - padRight));
    const y = height - padBottom - ((point.midi - minBound) / range) * (height - padTop - padBottom);
    const tone: PitchJudgeTone =
      isPitchAccuracy && pitchGuide
        ? classifyPitchJudgeTone(point.midi, findTargetMidiAtSec(pitchGuide, point.t))
        : "inactive";
    return { ...point, x, y, tone };
  });
  const defaultPitchPath = projectedPoints
    .map((point, idx) => `${idx === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const defaultPitchSegments = projectedPoints.length >= 2 ? buildPitchPathSegments(projectedPoints) : [];
  const judgedPitchSegments =
    isPitchAccuracy && projectedPoints.length >= 2
      ? buildJudgedPitchSegments(projectedPoints)
      : [];
  const tickTopMidi = Math.floor(maxBound);
  const tickBottomMidi = Math.ceil(minBound);
  const tickMidis = Array.from({ length: Math.max(0, tickTopMidi - tickBottomMidi + 1) }).map(
    (_, idx) => tickTopMidi - idx
  );
  const labelStep = isPitchAccuracy ? 1 : Math.max(1, Math.ceil(tickMidis.length / 9));
  const ticks = tickMidis.map((midi, idx) => {
    const y = height - padBottom - ((midi - minBound) / range) * (height - padTop - padBottom);
    const isLast = idx === tickMidis.length - 1;
    return {
      y,
      label: midiToNote(midi),
      showLabel: idx % labelStep === 0 || isLast,
    };
  });
  const bandMinMidi = Math.floor(minBound);
  const bandMaxMidi = Math.ceil(maxBound);
  const pitchBands = Array.from({ length: Math.max(0, bandMaxMidi - bandMinMidi) }).map((_, idx) => {
    const lowerMidi = bandMinMidi + idx;
    const bandLow = Math.max(minBound, lowerMidi);
    const bandHigh = Math.min(maxBound, lowerMidi + 1);
    const yBottom = height - padBottom - ((bandLow - minBound) / range) * (height - padTop - padBottom);
    const yTop = height - padBottom - ((bandHigh - minBound) / range) * (height - padTop - padBottom);
    return {
      key: `band-${lowerMidi}`,
      y: yTop,
      h: Math.max(0, yBottom - yTop),
      black: lowerMidi % 2 !== 0,
    };
  });

  const referenceRects =
    isPitchAccuracy && pitchGuide
      ? pitchGuide.segments.map((segment, idx) => {
          const clippedStart = Math.max(axisStartSec, segment.startSec);
          const clippedEnd = Math.min(axisStartSec + axisDurationSec, segment.endSec);
          if (clippedEnd <= clippedStart) return null;
          const left = padLeft + (((clippedStart - axisStartSec) / axisDurationSec) * (width - padLeft - padRight));
          const right = padLeft + (((clippedEnd - axisStartSec) / axisDurationSec) * (width - padLeft - padRight));
          const y = height - padBottom - ((segment.midi - minBound + 0.5) / range) * (height - padTop - padBottom);
          const h = Math.max(10, (height - padTop - padBottom) / range * 0.8);
          return {
            key: `ref-${idx}`,
            x: left,
            y: y - h / 2,
            w: Math.max(1, right - left),
            h,
            clippedStartSec: clippedStart,
            clippedEndSec: clippedEnd,
          };
        }).filter(
          (v): v is {
            key: string;
            x: number;
            y: number;
            w: number;
            h: number;
            clippedStartSec: number;
            clippedEndSec: number;
          } => v != null
        )
      : [];

  const shouldShowPlayhead = isPitchAccuracy || showPlayhead;
  const playheadX = shouldShowPlayhead
    ? padLeft +
      ((Math.max(axisStartSec, Math.min(axisStartSec + axisDurationSec, elapsedSec)) - axisStartSec) / axisDurationSec) *
        (width - padLeft - padRight)
    : null;

  return (
    <div className="trainingPage__monitor trainingPage__monitor--pitch">
      <div className="trainingPage__pitchMiniTuner">
        <div className="trainingPage__pitchMiniTunerBar">
          <div className="trainingPage__pitchMiniTunerCenter" />
          <div className="trainingPage__pitchMiniTunerMark trainingPage__pitchMiniTunerMark--left" />
          <div className="trainingPage__pitchMiniTunerMark trainingPage__pitchMiniTunerMark--right" />
          {cents != null && (
            <div className="trainingPage__pitchMiniTunerIndicator" style={{ left: `${tunerPos * 100}%` }} />
          )}
        </div>
        <div className="trainingPage__pitchMiniTunerMeta">
          <span>{cents != null ? `${cents >= 0 ? "+" : ""}${cents.toFixed(1)}c` : "--"}</span>
          <span className="trainingPage__pitchMiniTunerNote">{currentNote}</span>
          <span>{freqText}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="trainingPage__monitorSvg" aria-hidden="true">
        {pitchBands.map((band) => (
          <rect
            key={band.key}
            x={padLeft}
            y={band.y}
            width={width - padLeft - padRight}
            height={band.h}
            className={band.black ? "trainingPage__monitorPitchBand trainingPage__monitorPitchBand--black" : "trainingPage__monitorPitchBand trainingPage__monitorPitchBand--white"}
          />
        ))}
        {ticks.map((t) => (
          <g key={`pt-${t.label}-${t.y}`}>
            <line x1={padLeft} y1={t.y} x2={width - padRight} y2={t.y} className="trainingPage__monitorGridLine" />
            {t.showLabel && (
              <text x={padLeft - 6} y={t.y + 4} textAnchor="end" className="trainingPage__monitorAxisLabel">
                {t.label}
              </text>
            )}
          </g>
        ))}
        {referenceRects.map((rect) => {
          const progress = Math.max(
            0,
            Math.min(
              1,
              (elapsedSec - rect.clippedStartSec) / Math.max(0.0001, rect.clippedEndSec - rect.clippedStartSec)
            )
          );
          return (
            <g key={rect.key}>
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.h}
                rx={4}
                className="trainingPage__monitorReferenceBar"
              />
              {progress > 0 && (
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.w * progress}
                  height={rect.h}
                  rx={4}
                  className="trainingPage__monitorReferenceBarActive"
                />
              )}
            </g>
          );
        })}
        {playheadX != null && (
          <line
            x1={playheadX}
            y1={padTop}
            x2={playheadX}
            y2={height - padBottom}
            className="trainingPage__monitorPlayhead"
          />
        )}
        {isPitchAccuracy
          ? judgedPitchSegments.map((segment, idx) => (
              <path
                key={`pitch-segment-${idx}-${segment.tone}`}
                d={segment.d}
                className={`trainingPage__monitorPitchPath trainingPage__monitorPitchPath--${segment.tone}`}
              />
            ))
          : defaultPitchSegments.length > 0
            ? defaultPitchSegments.map((d, idx) => (
                <path
                  key={`pitch-segment-default-${idx}`}
                  d={d}
                  className="trainingPage__monitorPitchPath"
                />
              ))
            : <path d={defaultPitchPath} className="trainingPage__monitorPitchPath" />}
      </svg>
    </div>
  );
}

function RealtimeDbMonitor({
  dbValues,
  currentDb,
  elapsedSec,
  durationSec,
  showPlayhead = false,
}: {
  dbValues: number[];
  currentDb: number | null;
  elapsedSec?: number;
  durationSec?: number;
  showPlayhead?: boolean;
}) {
  const isMobileViewport =
    typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
  const minDb = -80;
  const maxDb = 0;
  const normalized = currentDb != null ? (currentDb - minDb) / (maxDb - minDb) : 0;
  const percent = Math.max(0, Math.min(1, normalized));
  const currentText = currentDb != null ? `${currentDb.toFixed(1)} dB` : "--";
  const avg = dbValues.length ? dbValues.reduce((a, b) => a + b, 0) / dbValues.length : null;
  const min = dbValues.length ? Math.min(...dbValues) : null;
  const max = dbValues.length ? Math.max(...dbValues) : null;
  const width = isMobileViewport ? 720 : 880;
  const height = isMobileViewport ? 420 : 220;
  const pad = isMobileViewport ? 24 : 28;
  const path =
    dbValues.length < 2
      ? ""
      : dbValues
          .map((v, idx) => {
            const x = pad + (idx / Math.max(1, dbValues.length - 1)) * (width - pad * 2);
            const y = pad + ((maxDb - v) / (maxDb - minDb)) * (height - pad * 2);
            return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ");

  return (
    <div className="trainingPage__monitor trainingPage__monitor--db">
      <div className="trainingPage__dbGaugeWrap">
        <div
          className="trainingPage__dbGauge"
          style={{
            background: `conic-gradient(from 180deg, #f8e600 0 ${Math.max(1, percent * 360)}deg, #2a2b31 ${Math.max(
              1,
              percent * 360
            )}deg 360deg)`,
          }}
        >
          <div className="trainingPage__dbGaugeInner">{currentText}</div>
        </div>
      </div>
      <div className="trainingPage__dbStats">
        <span>最小: {min != null ? min.toFixed(1) : "-"} dB</span>
        <span>平均: {avg != null ? avg.toFixed(1) : "-"} dB</span>
        <span>最大: {max != null ? max.toFixed(1) : "-"} dB</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="trainingPage__monitorSvg" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, idx) => {
          const v = maxDb - idx * 10;
          const y = pad + (idx / 8) * (height - pad * 2);
          return (
            <g key={`db-grid-${v}`}>
              <line x1={pad} y1={y} x2={width - pad} y2={y} className="trainingPage__monitorGridLine" />
              <text x={pad - 6} y={y + 4} textAnchor="end" className="trainingPage__monitorAxisLabel">
                {v}
              </text>
            </g>
          );
        })}
        {path && <path d={path} className="trainingPage__monitorDbPath" />}
        {showPlayhead && elapsedSec != null && durationSec != null && durationSec > 0 && (
          <line
            x1={pad + Math.max(0, Math.min(1, elapsedSec / durationSec)) * (width - pad * 2)}
            y1={pad}
            x2={pad + Math.max(0, Math.min(1, elapsedSec / durationSec)) * (width - pad * 2)}
            y2={height - pad}
            className="trainingPage__monitorPlayhead"
          />
        )}
      </svg>
    </div>
  );
}

async function persistMeasurement({
  systemKey,
  peakNote,
  lowestNote,
  sustainNote,
  rangeSemitones,
  chestTopNote,
  falsettoTopNote,
  phonationDurationSec,
  loudnessDbSamples,
  avgLoudnessDb,
  pitchAccuracyScore,
  pitchAvgCentsError,
  pitchNoteCount,
  includeInInsights = false,
}: {
  systemKey: MeasurementSystemKey;
  peakNote: string | null;
  lowestNote: string | null;
  sustainNote: string | null;
  rangeSemitones: number | null;
  chestTopNote: string | null;
  falsettoTopNote: string | null;
  phonationDurationSec: number;
  loudnessDbSamples: number[];
  avgLoudnessDb: number;
  pitchAccuracyScore: number | null;
  pitchAvgCentsError: number | null;
  pitchNoteCount: number;
  includeInInsights?: boolean;
}): Promise<{ run: MeasurementRun; rewards: SaveRewards | null }> {
  if (systemKey === "range") {
    const created = await createMeasurement({
      measurement_type: "range",
      include_in_insights: includeInInsights,
      range_result: {
        lowest_note: lowestNote,
        highest_note: peakNote,
        range_semitones: rangeSemitones,
        range_octaves: rangeSemitones != null ? Number((rangeSemitones / 12).toFixed(2)) : null,
        chest_top_note: chestTopNote,
        falsetto_top_note: falsettoTopNote,
      },
    });
    return { run: created.data, rewards: created.rewards };
  }

  if (systemKey === "long_tone") {
    const created = await createMeasurement({
      measurement_type: "long_tone",
      include_in_insights: includeInInsights,
      long_tone_result: {
        sustain_sec: phonationDurationSec,
        sustain_note: sustainNote,
      },
    });
    return { run: created.data, rewards: created.rewards };
  }

  if (systemKey === "pitch_accuracy") {
    const created = await createMeasurement({
      measurement_type: "pitch_accuracy",
      include_in_insights: includeInInsights,
      pitch_accuracy_result: {
        avg_cents_error: pitchAvgCentsError != null ? Number(pitchAvgCentsError.toFixed(3)) : null,
        accuracy_score: pitchAccuracyScore != null ? Number(pitchAccuracyScore.toFixed(3)) : null,
        note_count: pitchNoteCount,
      },
    });
    return { run: created.data, rewards: created.rewards };
  }

  const minLoudness = loudnessDbSamples.length ? Math.min(...loudnessDbSamples) : null;
  const maxLoudness = loudnessDbSamples.length ? Math.max(...loudnessDbSamples) : null;
  const rangeDb = minLoudness != null && maxLoudness != null ? maxLoudness - minLoudness : null;
  const score = computeWithinBandRatePct(loudnessDbSamples, avgLoudnessDb, 3, 3);
  const ratio = score != null ? Number((score / 100).toFixed(6)) : null;
  const created = await createMeasurement({
    measurement_type: "volume_stability",
    include_in_insights: includeInInsights,
    volume_stability_result: {
      avg_loudness_db: Number(avgLoudnessDb.toFixed(3)),
      min_loudness_db: minLoudness != null ? Number(minLoudness.toFixed(3)) : null,
      max_loudness_db: maxLoudness != null ? Number(maxLoudness.toFixed(3)) : null,
      loudness_range_db: rangeDb != null ? Number(rangeDb.toFixed(3)) : null,
      loudness_range_ratio: ratio,
      loudness_range_pct: score,
    },
  });
  return { run: created.data, rewards: created.rewards };
}

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined") return () => {};

      const media = window.matchMedia(query);
      const onChange = () => onStoreChange();

      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
      }

      media.addListener(onChange);
      return () => media.removeListener(onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(
    () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false),
    [query]
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

type SessionStepHeadProps = {
  badge: ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
  titleClassName?: string;
  action?: ReactNode;
};

function SessionStepHead({ badge, title, subtitle, className, titleClassName, action }: SessionStepHeadProps) {
  const titleClasses = titleClassName
    ? `trainingPage__measurementStepTitle ${titleClassName}`
    : "trainingPage__measurementStepTitle";
  const headClasses = className
    ? `trainingPage__measurementStepHead ${className}`
    : "trainingPage__measurementStepHead";

  return (
    <div className={headClasses}>
      <div className="trainingPage__measurementStepBadge">{badge}</div>
      <div className="trainingPage__measurementStepHeadText">
        <div className={titleClasses}>{title}</div>
        {subtitle && <div className="trainingPage__measurementSessionSub">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

function previewKindFor(systemKey: MeasurementSystemKey): MeasurementPreviewKind {
  switch (systemKey) {
    case "range":
      return "range";
    case "long_tone":
      return "sustain";
    case "volume_stability":
      return "loudness";
    case "pitch_accuracy":
      return "pitch";
    default:
      return "range";
  }
}

function sessionCopyFor(systemKey: MeasurementSystemKey): { title: string; subtitle: string } {
  switch (systemKey) {
    case "range":
      return { title: "Range Session", subtitle: "最低音から最高音までをスムーズにチェック" };
    case "long_tone":
      return { title: "Long Tone Session", subtitle: "一定の発声をキープして秒数を測定" };
    case "volume_stability":
      return { title: "Volume Session", subtitle: "音量の安定感をリズムよくチェック" };
    case "pitch_accuracy":
      return { title: "Pitch Session", subtitle: "音程のズレをカラオケ感覚で確認" };
    default:
      return { title: "Voice Session", subtitle: "録音して測定を開始" };
  }
}

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}

function noiseDbThresholdFor(systemKey: MeasurementSystemKey): number {
  return systemKey === "volume_stability" ? VOLUME_NOISE_DB_THRESHOLD : DEFAULT_NOISE_DB_THRESHOLD;
}

async function convertBlobToWav(sourceBlob: Blob): Promise<Blob> {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error("AudioContext が利用できません");
  const ctx = new Ctx();
  try {
    const arrayBuf = await sourceBlob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
    return encodeWavFromAudioBuffer(audioBuffer);
  } finally {
    try {
      await ctx.close();
    } catch {
      // no-op
    }
  }
}

function encodeWavFromAudioBuffer(audioBuffer: AudioBuffer): Blob {
  const channelCount = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const sampleCount = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = sampleCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  const channelData = Array.from({ length: channelCount }, (_, idx) => audioBuffer.getChannelData(idx));
  for (let i = 0; i < sampleCount; i += 1) {
    for (let ch = 0; ch < channelCount; ch += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i] ?? 0));
      const pcm = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, Math.round(pcm), true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i) & 0xff);
  }
}

function useStateRef<T>(initial: T) {
  const [ref] = useState(() => ({ current: initial }));
  return ref;
}

function buildPitchGuide(range: PitchGuideRange): PitchGuide {
  const beatSec = 60 / PITCH_GUIDE_BPM;
  const countInSec = PITCH_GUIDE_COUNT_IN_BEATS * beatSec;
  const transpositions = [...PITCH_GUIDE_ASC_TRANSPOSE, ...PITCH_GUIDE_DESC_TRANSPOSE];
  const baseMidi = baseMidiForPitchGuideRange(range);
  const segments: PitchGuideSegment[] = [];
  let cursorBeats = PITCH_GUIDE_COUNT_IN_BEATS;

  for (const transpose of transpositions) {
    const rootMidi = baseMidi + transpose;
    for (const interval of PITCH_GUIDE_INTERVALS) {
      const startSec = cursorBeats * beatSec;
      const endSec = startSec + PITCH_GUIDE_NOTE_DURATION_BEATS * beatSec;
      segments.push({ startSec, endSec, midi: rootMidi + interval });
      cursorBeats += PITCH_GUIDE_NOTE_DURATION_BEATS;
    }
    const holdStartSec = cursorBeats * beatSec;
    const holdEndSec = holdStartSec + 2 * beatSec;
    segments.push({ startSec: holdStartSec, endSec: holdEndSec, midi: rootMidi });
    cursorBeats += PITCH_GUIDE_BAR_BEATS;
  }

  return {
    bpm: PITCH_GUIDE_BPM,
    totalSec: cursorBeats * beatSec,
    countInSec,
    segments,
  };
}

function baseMidiForPitchGuideRange(range: PitchGuideRange): number {
  if (range === "low") return noteToMidi("E3") ?? 52;
  if (range === "mid") return noteToMidi("G3") ?? 55;
  return noteToMidi("C4") ?? 60;
}

function findTargetMidiAtSec(guide: PitchGuide, sec: number): number | null {
  if (sec < 0 || sec > guide.totalSec) return null;
  for (const segment of guide.segments) {
    if (sec >= segment.startSec && sec < segment.endSec) return segment.midi;
  }
  return null;
}

function classifyPitchJudgeTone(actualMidi: number, targetMidi: number | null): PitchJudgeTone {
  // 判定対象外の定義を統一:
  // - target が存在しない時間帯
  // - 無音扱い（RMS閾値以下 / 周波数未検出）は点自体を描画しない運用
  if (targetMidi == null) return "inactive";
  const centsAbs = Math.abs(actualMidi - targetMidi) * 100;
  if (centsAbs <= PITCH_JUDGE_GREEN_CENTS) return "green";
  if (centsAbs <= PITCH_JUDGE_YELLOW_CENTS) return "yellow";
  return "red";
}

function buildJudgedPitchSegments(points: Array<PitchPoint & { x: number; y: number; tone: PitchJudgeTone }>) {
  const segments: Array<{ tone: PitchJudgeTone; d: string }> = [];
  let tone = points[0]?.tone ?? "inactive";
  let run: Array<{ x: number; y: number; t: number }> = points[0] ? [{ x: points[0].x, y: points[0].y, t: points[0].t }] : [];

  const flush = () => {
    if (run.length < 2) return;
    const d = run.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    segments.push({ tone, d });
  };

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const hasGap = curr.t - prev.t > PITCH_LINE_GAP_SEC;
    if (hasGap) {
      flush();
      tone = curr.tone;
      run = [{ x: curr.x, y: curr.y, t: curr.t }];
      continue;
    }
    if (curr.tone !== tone) {
      flush();
      tone = curr.tone;
      run = [
        { x: prev.x, y: prev.y, t: prev.t },
        { x: curr.x, y: curr.y, t: curr.t },
      ];
      continue;
    }
    run.push({ x: curr.x, y: curr.y, t: curr.t });
  }

  flush();
  return segments;
}

function buildPitchPathSegments(points: Array<PitchPoint & { x: number; y: number }>) {
  const segments: string[] = [];
  let run: Array<{ x: number; y: number; t: number }> = points[0] ? [{ x: points[0].x, y: points[0].y, t: points[0].t }] : [];

  const flush = () => {
    if (run.length < 2) return;
    const d = run.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    segments.push(d);
  };

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const hasGap = curr.t - prev.t > PITCH_LINE_GAP_SEC;
    if (hasGap) {
      flush();
      run = [{ x: curr.x, y: curr.y, t: curr.t }];
      continue;
    }
    run.push({ x: curr.x, y: curr.y, t: curr.t });
  }

  flush();
  return segments;
}

function autoCorrelate(buf: Float32Array, sampleRate: number): number | null {
  const size = buf.length;
  const rms = calcRms(buf);
  if (rms < 0.003) return null;

  const minFreq = 55;
  const maxFreq = 1760;
  const minTau = Math.floor(sampleRate / maxFreq);
  const maxTau = Math.min(Math.floor(sampleRate / minFreq), size - 2);
  if (maxTau <= minTau + 2) return null;

  const diff = new Float64Array(maxTau + 1);
  for (let tau = minTau; tau <= maxTau; tau += 1) {
    let sum = 0;
    for (let i = 0; i < size - maxTau; i += 1) {
      const delta = buf[i] - buf[i + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  const cmndf = new Float64Array(maxTau + 1);
  cmndf[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau += 1) {
    running += diff[tau];
    cmndf[tau] = running === 0 ? 1 : (diff[tau] * tau) / running;
  }

  const threshold = YIN_THRESHOLD;
  let tauEstimate = -1;
  for (let tau = minTau; tau <= maxTau; tau += 1) {
    if (cmndf[tau] < threshold) {
      while (tau + 1 <= maxTau && cmndf[tau + 1] < cmndf[tau]) tau += 1;
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate <= 0) {
    let bestTau = minTau;
    let bestVal = cmndf[minTau];
    for (let tau = minTau + 1; tau <= maxTau; tau += 1) {
      if (cmndf[tau] < bestVal) {
        bestVal = cmndf[tau];
        bestTau = tau;
      }
    }
    if (bestVal > YIN_FALLBACK_ACCEPT_MAX) return null;
    tauEstimate = bestTau;
  }

  const x0 = tauEstimate > 1 ? cmndf[tauEstimate - 1] : cmndf[tauEstimate];
  const x1 = cmndf[tauEstimate];
  const x2 = tauEstimate + 1 <= maxTau ? cmndf[tauEstimate + 1] : cmndf[tauEstimate];
  const denom = x0 - 2 * x1 + x2;
  const shift = Math.abs(denom) < 1e-8 ? 0 : (x0 - x2) / (2 * denom);
  const tau = tauEstimate + shift;
  if (!Number.isFinite(tau) || tau <= 0) return null;

  const freq = sampleRate / tau;
  if (!Number.isFinite(freq) || freq < minFreq || freq > maxFreq) return null;
  return freq;
}

function calcRms(buf: Float32Array) {
  if (buf.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

function rmsToDb(rms: number) {
  if (!Number.isFinite(rms) || rms <= 0) return -120;
  return 20 * Math.log10(rms);
}

function noteToMidi(note: string | null): number | null {
  if (!note) return null;
  const m = note.trim().match(/^([A-Ga-g])([#b♯]?)(-?\d)$/);
  if (!m) return null;
  const letter = m[1].toUpperCase();
  const accidental = m[2];
  const octave = Number(m[3]);
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semitone = base[letter] ?? 0;
  if (accidental === "#" || accidental === "♯") semitone += 1;
  if (accidental === "b") semitone -= 1;
  return (octave + 1) * 12 + semitone;
}


function midiToNote(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const note = names[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function refineMidiSamples(mids: number[]) {
  if (mids.length <= 2) return mids;
  const filtered = mids.map((_, idx) => {
    const start = Math.max(0, idx - 2);
    const end = Math.min(mids.length, idx + 3);
    return median(mids.slice(start, end));
  });
  const center = median(filtered);
  const deviations = filtered.map((v) => Math.abs(v - center));
  const mad = median(deviations);
  const limit = Math.max(0.9, mad * 3.5);
  const kept = filtered.filter((v) => Math.abs(v - center) <= limit);
  return kept.length > 0 ? kept : filtered;
}

function estimateStableMidiRange(mids: number[]) {
  if (mids.length === 0) return null;
  const sorted = [...mids].sort((a, b) => a - b);
  const low = sorted[Math.floor((sorted.length - 1) * 0.08)];
  const high = sorted[Math.ceil((sorted.length - 1) * 0.92)];
  return { min: low, max: high };
}

function quantizeMidiSeriesWithHysteresis(mids: number[]) {
  if (mids.length === 0) return [] as number[];
  let prev = Math.round(mids[0]);
  const out = [prev];
  for (let i = 1; i < mids.length; i += 1) {
    const v = mids[i];
    const target = Math.round(v);
    if (target > prev && v >= prev + 0.35) prev = target;
    else if (target < prev && v <= prev - 0.35) prev = target;
    out.push(prev);
  }
  return out;
}

function estimatePhaseRangeBounds(mids: number[], phase: "chest" | "falsetto") {
  if (mids.length === 0) return null;
  const quantized = quantizeMidiSeriesWithHysteresis(mids);
  if (quantized.length === 0) return null;
  if (quantized.length < 12) {
    return {
      min: Math.min(...quantized),
      max: Math.max(...quantized),
    };
  }

  // Phase別（地声/裏声）は、リアルタイム表示との乖離を抑えるため
  // percentileで上下端を決めつつ、短い断続ノートだけの極端値は抑える。
  // 地声は高音側の誤検出が出やすいので、上側だけ少し厳しくする。
  const minByPercentile = percentile(quantized, 0.02);
  const maxByPercentile = percentile(quantized, phase === "chest" ? 0.94 : 0.98);
  const stableRange = estimateStablePhaseExtremes(quantized, phase === "chest" ? 4 : 2);
  const min = stableRange ? Math.max(minByPercentile, stableRange.min) : minByPercentile;
  const max = stableRange ? Math.min(maxByPercentile, stableRange.max) : maxByPercentile;
  return { min, max };
}

function estimateStablePhaseExtremes(mids: number[], minStableRun: number) {
  if (mids.length === 0) return null;
  const maxRunByNote = new Map<number, number>();
  let cur = mids[0];
  let run = 1;
  for (let i = 1; i < mids.length; i += 1) {
    if (mids[i] === cur) {
      run += 1;
      continue;
    }
    const prevMax = maxRunByNote.get(cur) ?? 0;
    if (run > prevMax) maxRunByNote.set(cur, run);
    cur = mids[i];
    run = 1;
  }
  const lastMax = maxRunByNote.get(cur) ?? 0;
  if (run > lastMax) maxRunByNote.set(cur, run);

  const stableNotes = [...maxRunByNote.entries()]
    .filter(([, maxRun]) => maxRun >= minStableRun)
    .map(([note]) => note);
  if (stableNotes.length === 0) return null;
  return {
    min: Math.min(...stableNotes),
    max: Math.max(...stableNotes),
  };
}

function estimateStableExtremes(mids: number[]) {
  if (mids.length === 0) return null;
  const maxRunByNote = new Map<number, number>();
  let cur = mids[0];
  let run = 1;
  for (let i = 1; i < mids.length; i += 1) {
    if (mids[i] === cur) {
      run += 1;
      continue;
    }
    const prevMax = maxRunByNote.get(cur) ?? 0;
    if (run > prevMax) maxRunByNote.set(cur, run);
    cur = mids[i];
    run = 1;
  }
  const lastMax = maxRunByNote.get(cur) ?? 0;
  if (run > lastMax) maxRunByNote.set(cur, run);

  const stableNotes = [...maxRunByNote.entries()]
    .filter(([, maxRun]) => maxRun >= 3)
    .map(([note]) => note);
  if (stableNotes.length === 0) return null;
  return {
    min: Math.min(...stableNotes),
    max: Math.max(...stableNotes),
  };
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const arr = [...values].sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  if (arr.length % 2 === 1) return arr[mid];
  return (arr[mid - 1] + arr[mid]) / 2;
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const arr = [...values].sort((a, b) => a - b);
  const clamped = Math.max(0, Math.min(1, p));
  const idx = Math.min(arr.length - 1, Math.max(0, Math.round((arr.length - 1) * clamped)));
  return arr[idx];
}

function buildMeasurementInstantResult({
  runId,
  measurementKey,
  includeInInsights,
  source,
  systemKey,
  lowestNote,
  peakNote,
  chestTopNote,
  falsettoTopNote,
  chestLowestNote,
  falsettoLowestNote,
  overlapHighestNote,
  overlapLowestNote,
  sustainNote,
  rangeSemitones,
  phonationDurationSec,
  loudnessDbSamples,
  avgLoudnessDb,
  pitchAccuracyScore,
  pitchAvgCentsError,
  pitchNoteCount,
  replayPitchPoints,
  replayDbValues,
  replayDurationSec,
  replayGuideRange,
}: {
  runId: number;
  measurementKey: MeasurementSystemKey;
  includeInInsights: boolean;
  source: "file" | "recording";
  systemKey: MeasurementSystemKey;
  lowestNote: string | null;
  peakNote: string | null;
  chestTopNote: string | null;
  falsettoTopNote: string | null;
  chestLowestNote: string | null;
  falsettoLowestNote: string | null;
  overlapHighestNote: string | null;
  overlapLowestNote: string | null;
  sustainNote: string | null;
  rangeSemitones: number | null;
  phonationDurationSec: number;
  loudnessDbSamples: number[];
  avgLoudnessDb: number;
  pitchAccuracyScore: number | null;
  pitchAvgCentsError: number | null;
  pitchNoteCount: number;
  replayPitchPoints: PitchPoint[];
  replayDbValues: number[];
  replayDurationSec: number;
  replayGuideRange: PitchGuideRange | null;
}): MeasurementInstantResult {
  const measuredAt = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  if (systemKey === "range") {
    const oct = rangeSemitones != null ? (rangeSemitones / 12).toFixed(2) : "-";
    return {
      runId,
      measurementKey,
      includeInInsights,
      source,
      title: "音域",
      rangeSemitones,
      rangeOctaves: rangeSemitones != null ? Number((rangeSemitones / 12).toFixed(2)) : null,
      lowestNote,
      highestNote: peakNote,
      chestTopNote,
      falsettoTopNote,
      chestLowestNote,
      falsettoLowestNote,
      overlapHighestNote,
      overlapLowestNote,
      replayPitchPoints,
      replayDbValues,
      replayDurationSec,
      replayGuideRange,
      measuredAt,
      lines: [
        `最低音: ${lowestNote ?? "-"}`,
        `最高音: ${peakNote ?? "-"}`,
        `地声最高音: ${chestTopNote ?? "-"}`,
        `裏声最高音: ${falsettoTopNote ?? "-"}`,
        `音域: ${rangeSemitones ?? "-"} 半音 (${oct} octave)`,
      ],
    };
  }

  if (systemKey === "long_tone") {
    return {
      runId,
      measurementKey,
      includeInInsights,
      source,
      title: "ロングトーン",
      longToneSec: Number(phonationDurationSec.toFixed(1)),
      sustainNote,
      replayPitchPoints,
      replayDbValues,
      replayDurationSec,
      replayGuideRange,
      measuredAt,
      lines: [
        `有効な発声の継続秒数: ${phonationDurationSec.toFixed(1)} 秒`,
        `発声音程: ${sustainNote ?? "-"}`,
      ],
    };
  }

  if (systemKey === "pitch_accuracy") {
    const semitoneDrift = pitchAvgCentsError != null ? Math.max(0, pitchAvgCentsError / 100) : null;
    return {
      runId,
      measurementKey,
      includeInInsights,
      source,
      title: "音程精度",
      pitchAccuracyScore: pitchAccuracyScore != null ? Number(pitchAccuracyScore.toFixed(1)) : null,
      pitchAccuracyAvgCents: pitchAvgCentsError != null ? Number(pitchAvgCentsError.toFixed(1)) : null,
      pitchAccuracyNoteCount: pitchNoteCount,
      replayPitchPoints,
      replayDbValues,
      replayDurationSec,
      replayGuideRange,
      measuredAt,
      lines: [
        `平均ズレ: ${semitoneDrift != null ? `${semitoneDrift.toFixed(2)} 半音` : "-"}`,
        `精度スコア: ${pitchAccuracyScore != null ? `${pitchAccuracyScore.toFixed(1)} 点` : "-"}`,
        `平均ズレ: ${pitchAvgCentsError != null ? `${pitchAvgCentsError.toFixed(1)} cent` : "-"}`,
        `発声音数: ${pitchNoteCount}`,
      ],
    };
  }

  const minLoudness = loudnessDbSamples.length ? Math.min(...loudnessDbSamples) : null;
  const maxLoudness = loudnessDbSamples.length ? Math.max(...loudnessDbSamples) : null;
  const rangeDb = minLoudness != null && maxLoudness != null ? maxLoudness - minLoudness : null;
  const score = computeWithinBandRatePct(loudnessDbSamples, avgLoudnessDb, 3, 1);
  return {
    runId,
    measurementKey,
    includeInInsights,
    source,
    title: "音量安定性",
    avgLoudnessDb: Number.isFinite(avgLoudnessDb) ? Number(avgLoudnessDb.toFixed(1)) : null,
    minLoudnessDb: minLoudness != null ? Number(minLoudness.toFixed(1)) : null,
    maxLoudnessDb: maxLoudness != null ? Number(maxLoudness.toFixed(1)) : null,
    loudnessRangeDb: rangeDb != null ? Number(rangeDb.toFixed(1)) : null,
    loudnessRangePct: score != null ? Number(score.toFixed(1)) : null,
    loudnessTimeline: loudnessDbSamples.slice(-180).map((v) => Number(v.toFixed(3))),
    replayPitchPoints,
    replayDbValues,
    replayDurationSec,
    replayGuideRange,
    measuredAt,
    lines: [
      `許容幅内率 (平均±3dB): ${score != null ? `${score.toFixed(1)} %` : "-"}`,
      `最小: ${minLoudness != null ? `${minLoudness.toFixed(1)} dB` : "-"}`,
      `最大: ${maxLoudness != null ? `${maxLoudness.toFixed(1)} dB` : "-"}`,
      `平均: ${Number.isFinite(avgLoudnessDb) ? `${avgLoudnessDb.toFixed(1)} dB` : "-"}`,
    ],
  };
}

function computeWithinBandRatePct(
  samples: number[],
  avgDb: number,
  toleranceDb: number,
  digits: number
): number | null {
  if (!Number.isFinite(avgDb) || samples.length === 0) return null;
  const inBandCount = samples.filter((v) => Number.isFinite(v) && Math.abs(v - avgDb) <= toleranceDb).length;
  const pct = (inBandCount / samples.length) * 100;
  return Number(pct.toFixed(digits));
}

function RangeResultVisualizer({
  lowestNote,
  highestNote,
  chestTopNote,
  falsettoTopNote,
  chestLowestNote,
  falsettoLowestNote,
  overlapHighestNote,
  overlapLowestNote,
}: {
  lowestNote: string | null;
  highestNote: string | null;
  chestTopNote: string | null;
  falsettoTopNote: string | null;
  chestLowestNote: string | null;
  falsettoLowestNote: string | null;
  overlapHighestNote: string | null;
  overlapLowestNote: string | null;
}) {
  const total = buildRangeInfo("トータル", lowestNote, highestNote, "total");
  const chest = buildRangeInfo("地声", chestLowestNote, chestTopNote, "chest");
  const falsetto = buildRangeInfo("裏声", falsettoLowestNote, falsettoTopNote, "falsetto");
  const overlap = buildRangeInfo("共通音域", overlapLowestNote, overlapHighestNote, "overlap");
  const allRanges = [total, chest, falsetto, overlap].filter((v) => v.minMidi != null && v.maxMidi != null);
  const globalMin = allRanges.length ? Math.min(...allRanges.map((v) => v.minMidi as number)) : 36;
  const globalMax = allRanges.length ? Math.max(...allRanges.map((v) => v.maxMidi as number)) : 72;
  const axisMin = globalMin - 1;
  const axisMax = globalMax + 1;
  const ticks = buildRangeTicks(axisMin, axisMax, 7);
  const byTone = (tone: RangeInfo["tone"]) => [total, chest, falsetto, overlap].find((v) => v.tone === tone) ?? null;

  return (
    <div className="trainingPage__rangeResultV2">
      <div className="trainingPage__rangeChart">
        <div className="trainingPage__rangeChartGrid" />
        {ticks.map((tick, idx) => (
          <div key={`range-tick-${idx}`} className="trainingPage__rangeTick" style={{ left: `${toPercent(tick, axisMin, axisMax)}%` }}>
            <span>{midiToNote(Math.round(tick))}</span>
          </div>
        ))}
        {(["total", "chest", "falsetto", "overlap"] as const).map((tone) => {
          const range = byTone(tone);
          if (!range || range.minMidi == null || range.maxMidi == null) return null;
          const left = toPercent(range.minMidi, axisMin, axisMax);
          const right = toPercent(range.maxMidi, axisMin, axisMax);
          const width = Math.max(1, right - left);
          return (
            <div key={`range-track-${tone}`} className={`trainingPage__rangeTrack trainingPage__rangeTrack--${tone}`}>
              <div className={`trainingPage__rangeTrackFill trainingPage__rangeTrackFill--${tone}`} style={{ left: `${left}%`, width: `${width}%` }} />
            </div>
          );
        })}
      </div>

      <div className="trainingPage__rangeResultMetaV2">
        <RangeSummaryLine range={total} />
        <RangeSummaryLine range={chest} />
        <RangeSummaryLine range={falsetto} />
        <RangeSummaryLine range={overlap} />
      </div>

    </div>
  );
}

type RangeInfo = {
  title: string;
  tone: "total" | "chest" | "falsetto" | "overlap";
  lowNote: string | null;
  highNote: string | null;
  minMidi: number | null;
  maxMidi: number | null;
  semitones: number | null;
  octaves: number | null;
};

function RangeSummaryLine({ range }: { range: RangeInfo }) {
  const rangeText = range.lowNote && range.highNote ? `${range.lowNote}〜${range.highNote}` : "未算出";
  const widthText =
    range.semitones != null && range.octaves != null
      ? `${range.octaves.toFixed(2)} oct (${formatSemitoneLabel(range.semitones)})`
      : "未算出";
  return (
    <div className={`trainingPage__rangeSummaryLine trainingPage__rangeSummaryLine--${range.tone}`}>
      <div className="trainingPage__rangeSummaryHeader">
        <span className={`trainingPage__rangeSummaryChip trainingPage__rangeSummaryChip--${range.tone}`}>{range.title}</span>
      </div>
      <div className="trainingPage__rangeSummaryNotes">
        <span>レンジ: {rangeText}</span>
        <span>音域: {widthText}</span>
      </div>
    </div>
  );
}

function buildRangeInfo(
  title: string,
  lowNote: string | null,
  highNote: string | null,
  tone: RangeInfo["tone"]
): RangeInfo {
  const lowMidi = noteToMidi(lowNote);
  const highMidi = noteToMidi(highNote);
  const minMidi = lowMidi != null && highMidi != null ? Math.min(lowMidi, highMidi) : null;
  const maxMidi = lowMidi != null && highMidi != null ? Math.max(lowMidi, highMidi) : null;
  const semitones = minMidi != null && maxMidi != null ? Math.max(0, Math.round(maxMidi - minMidi)) : null;
  const octaves = minMidi != null && maxMidi != null ? (maxMidi - minMidi) / 12 : null;
  return { title, tone, lowNote, highNote, minMidi, maxMidi, semitones, octaves };
}

function buildRangeTicks(minMidi: number, maxMidi: number, count: number): number[] {
  if (count <= 1) return [minMidi];
  const ticks: number[] = [];
  const span = maxMidi - minMidi;
  for (let i = 0; i < count; i += 1) {
    const ratio = i / (count - 1);
    ticks.push(minMidi + span * ratio);
  }
  return ticks;
}

function toPercent(v: number, min: number, max: number): number {
  if (max <= min) return 0;
  return ((v - min) / (max - min)) * 100;
}

function formatSemitoneLabel(v: number | null): string {
  if (v == null) return "-";
  return v === 1 ? "1 semitone" : `${v} semitones`;
}

function VolumeStabilityResultHero({
  score,
  rangeDb,
  minDb,
  avgDb,
  maxDb,
  timeline,
}: {
  score: number | null;
  rangeDb: number | null;
  minDb: number | null;
  avgDb: number | null;
  maxDb: number | null;
  timeline: number[];
}) {
  const tone = score == null ? "mid" : score >= 80 ? "good" : score >= 50 ? "mid" : "bad";
  const comment =
    score == null ? "測定データが不足しています。" : score >= 80 ? "一定に保てています。" : score >= 50 ? "少しブレがあります。" : "ブレが大きめです。";
  const scoreClamped = score == null ? 0 : Math.max(0, Math.min(100, score));

  const width = 520;
  const height = 170;
  const padTop = 14;
  const padBottom = 24;
  const padLeft = 8;
  const padRight = 8;
  const chartMin = minDb != null ? Math.floor(minDb - 3) : -90;
  const chartMax = maxDb != null ? Math.ceil(maxDb + 3) : -40;
  const yRange = Math.max(1, chartMax - chartMin);
  const stepX = timeline.length > 1 ? (width - padLeft - padRight) / (timeline.length - 1) : 0;

  let path = "";
  timeline.forEach((v, idx) => {
    const x = padLeft + stepX * idx;
    const y = height - padBottom - ((v - chartMin) / yRange) * (height - padTop - padBottom);
    path += idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });

  const avgY =
    avgDb != null ? height - padBottom - ((avgDb - chartMin) / yRange) * (height - padTop - padBottom) : null;
  const avgLabelY = avgY != null ? Math.max(padTop + 12, Math.min(height - padBottom - 6, avgY - 6)) : null;

  const gaugeSize = 144;
  const gaugeStroke = 10;
  const gaugeRadius = (gaugeSize - gaugeStroke) / 2;
  const gaugeArc = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeArc * (1 - scoreClamped / 100);

  return (
    <div className={`trainingPage__volumeResult trainingPage__volumeResult--${tone}`}>
      <div className="trainingPage__volumeResultHead">
        <div className="trainingPage__volumeResultLabel">安定性スコア</div>
        <div className="trainingPage__volumeGauge" role="img" aria-label={score != null ? `安定性スコア ${score.toFixed(1)} 点` : "安定性スコア 未計算"}>
          <svg viewBox={`0 0 ${gaugeSize} ${gaugeSize}`} aria-hidden="true">
            <circle cx={gaugeSize / 2} cy={gaugeSize / 2} r={gaugeRadius} className="trainingPage__volumeGaugeTrack" />
            <circle
              cx={gaugeSize / 2}
              cy={gaugeSize / 2}
              r={gaugeRadius}
              className="trainingPage__volumeGaugeProgress"
              strokeDasharray={gaugeArc}
              strokeDashoffset={gaugeOffset}
            />
          </svg>
          <div className="trainingPage__volumeGaugeCenter">
            <div className="trainingPage__volumeResultScore">{score != null ? score.toFixed(1) : "-"}</div>
            <div className="trainingPage__volumeResultScoreUnit">点</div>
          </div>
        </div>
        <div className="trainingPage__volumeResultComment">{comment}</div>
      </div>

      <div className="trainingPage__volumeResultChart">
        <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
          {avgY != null && <line x1={padLeft} y1={avgY} x2={width - padRight} y2={avgY} className="trainingPage__volumeAvgLine" />}
          {avgY != null && avgLabelY != null && (
            <text x={width - padRight - 2} y={avgLabelY} textAnchor="end" className="trainingPage__volumeAvgLabel">
              平均 {avgDb?.toFixed(1)} dB
            </text>
          )}
          <path d={path} className="trainingPage__volumeLine" />
        </svg>
      </div>

      <div className="trainingPage__volumeResultRangeCard">
        <div className="trainingPage__volumeResultRangeTitle">音量レンジ（差分）</div>
        <div className="trainingPage__volumeResultRangeValue">{rangeDb != null ? `${rangeDb.toFixed(1)} dB` : "-"}</div>
        <div className="trainingPage__volumeResultRangeSub">
          最小 {minDb != null ? `${minDb.toFixed(1)} dB` : "-"} / 最大 {maxDb != null ? `${maxDb.toFixed(1)} dB` : "-"} / 平均{" "}
          {avgDb != null ? `${avgDb.toFixed(1)} dB` : "-"}
        </div>
      </div>
    </div>
  );
}

function LongToneResultHero({
  seconds,
  note,
  previousSec,
  bestSec,
}: {
  seconds: number | null;
  note: string | null;
  previousSec: number | null;
  bestSec: number | null;
}) {
  const value = seconds ?? 0;
  const goalSec = 10;
  const progress = Math.max(0, Math.min(1, value / goalSec));
  const r = 60;
  const c = 78;
  const arc = 2 * Math.PI * r;
  const offset = arc * (1 - progress);
  return (
    <div className="trainingPage__longToneHero">
      <div className="trainingPage__longToneRingWrap">
        <svg viewBox="0 0 156 156" className="trainingPage__longToneRing" aria-hidden="true">
          <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="8" />
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="#4bc6d7"
            strokeOpacity="0.92"
            strokeWidth="11"
            strokeDasharray={arc}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="trainingPage__longToneRingCenter">
          <div className="trainingPage__longToneHeroValue">{seconds != null ? seconds.toFixed(1) : "-"}</div>
          <div className="trainingPage__longToneHeroUnit">秒</div>
        </div>
      </div>
      <div className="trainingPage__longToneHeroNote">発声音程: {note ?? "-"}</div>
      {(previousSec != null || bestSec != null) && (
        <div className="trainingPage__longToneCompare">
          {previousSec != null && <div>前回: {previousSec.toFixed(1)} 秒</div>}
          {bestSec != null && <div>ベスト: {bestSec.toFixed(1)} 秒</div>}
        </div>
      )}
      <div className="trainingPage__longToneHint">ロングトーンは有効な発声が続いた時間で判定します。</div>
    </div>
  );
}

function longToneSecFromResult(result: MeasurementRun["result"] | null): number | null {
  if (!result || typeof result !== "object") return null;
  if (!("sustain_sec" in result)) return null;
  const sec = result.sustain_sec;
  if (typeof sec !== "number" || !Number.isFinite(sec)) return null;
  return sec;
}
