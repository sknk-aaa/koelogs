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
import ProcessingOverlay from "../components/ProcessingOverlay";

import "./TrainingPage.css";

type MeasurementSystemKey = "range" | "long_tone" | "volume_stability" | "pitch_accuracy";
type RangePhase = "chest" | "falsetto";
type MeasurementInstantResult = {
  runId: number;
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
};
const NOISE_DB_THRESHOLD = -140;
const MIN_VOICED_STREAK_FRAMES = 1;
const PITCH_JUMP_SEMITONE_LIMIT = 18;
const YIN_THRESHOLD = 0.32;
const YIN_FALLBACK_ACCEPT_MAX = 0.75;

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
  const [, setMeasurementCurrentNote] = useState<string | null>(null);
  const [measurementCurrentMidi, setMeasurementCurrentMidi] = useState<number | null>(null);
  const [measurementCurrentDb, setMeasurementCurrentDb] = useState<number | null>(null);
  const [measurementRealtimeMidiPoints, setMeasurementRealtimeMidiPoints] = useState<number[]>([]);
  const [measurementRealtimeDbPoints, setMeasurementRealtimeDbPoints] = useState<number[]>([]);
  const [measurementInstantResult, setMeasurementInstantResult] = useState<MeasurementInstantResult | null>(null);
  const [measurementResultModalOpen, setMeasurementResultModalOpen] = useState(false);
  const [measurementResultSaving, setMeasurementResultSaving] = useState(false);
  const [longToneCompare, setLongToneCompare] = useState<{ previousSec: number | null; bestSec: number | null }>({
    previousSec: null,
    bestSec: null,
  });
  const [rangePhase, setRangePhase] = useState<RangePhase | null>(null);

  const measurementAudioContextRef = useStateRef<AudioContext | null>(null);
  const measurementAnalyserRef = useStateRef<AnalyserNode | null>(null);
  const measurementMediaStreamRef = useStateRef<MediaStream | null>(null);
  const measurementSourceRef = useStateRef<MediaStreamAudioSourceNode | null>(null);
  const measurementRafRef = useStateRef<number | null>(null);
  const measurementStartedAtRef = useStateRef<number>(0);
  const measurementMidiSamplesRef = useStateRef<number[]>([]);
  const measurementLoudnessSamplesRef = useStateRef<number[]>([]);
  const measurementVoicedFramesRef = useStateRef<number>(0);
  const measurementFramesRef = useStateRef<number>(0);
  const measurementTrackEndHandlerRef = useStateRef<(() => void) | null>(null);
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

  const selected: ScaleTrack | null = useMemo(() => {
    return tracks.find((t) => t.scale_type === scaleType && t.tempo === tempo) ?? null;
  }, [tracks, scaleType, tempo]);
  const activeMeasurement = useMemo(
    () => MEASUREMENT_SHORTCUTS.find((v) => v.systemKey === activeMeasurementKey) ?? null,
    [activeMeasurementKey]
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
  const supportsTrainingTrackToggle =
    activeMeasurementKey === "volume_stability" || activeMeasurementKey === "pitch_accuracy";
  const shouldUseTrainingTrack = supportsTrainingTrackToggle && measurementUseTrainingTrack;
  const recordButtonDisabled =
    measurementSessionSaving ||
    measurementFileAnalyzing ||
    (measurementRecording && activeMeasurementKey === "range") ||
    (shouldUseTrainingTrack && !selected?.file_path);
  const transportSwitchDisabled = measurementRecording || measurementSessionSaving || measurementFileAnalyzing;
  const playerRecordLabel = measurementRecording
    ? activeMeasurementKey === "range"
      ? "● 録音中（モニターで操作）"
      : "■ 停止"
    : measurementSessionSaving
      ? "保存中…"
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

  const startMeasurementRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMeasurementError("このブラウザは録音に対応していません");
      return;
    }
    setMeasurementError(null);
    setMeasurementResultModalOpen(false);
    if (shouldUseTrainingTrack && (!selected?.file_path || !audioRef.current)) {
      setMeasurementError("同時再生モードには再生可能なトレーニング音源が必要です");
      return;
    }

    try {
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
      setMeasurementRealtimeMidiPoints([]);
      setMeasurementRealtimeDbPoints([]);
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

      if (shouldUseTrainingTrack && audioRef.current) {
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
        if (frameDb > NOISE_DB_THRESHOLD && measurementFramesRef.current % 2 === 0) {
          setMeasurementRealtimeDbPoints((prev) => [...prev.slice(-179), frameDb]);
          measurementLoudnessSamplesRef.current.push(frameDb);
        }
        const yinFreq = autoCorrelate(data, ac.sampleRate);
        const freq = frameDb > NOISE_DB_THRESHOLD ? yinFreq : null;
        measurementFramesRef.current += 1;
        if (freq && frameDb > NOISE_DB_THRESHOLD) {
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
          if (activeMeasurementKey === "range") {
            if (measurementRangePhaseRef.current === "chest") measurementRangeChestMidiRef.current.push(midi);
            if (measurementRangePhaseRef.current === "falsetto") measurementRangeFalsettoMidiRef.current.push(midi);
          }
          if (measurementFramesRef.current % 2 === 0) {
            setMeasurementRealtimeMidiPoints((prev) => [...prev.slice(-179), midi]);
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
    if (measurementTrackEndHandlerRef.current && audioRef.current) {
      audioRef.current.removeEventListener("ended", measurementTrackEndHandlerRef.current);
      measurementTrackEndHandlerRef.current = null;
    }
    if (measurementAutoPlaybackRef.current && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      measurementAutoPlaybackRef.current = false;
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
    setRangePhase(null);
    measurementRangePhaseRef.current = null;

    if (!save) return;

    const mids = measurementMidiSamplesRef.current;
    const loudnessDbSamples = measurementLoudnessSamplesRef.current;
    const elapsedSec = Math.max(1, Math.round((performance.now() - measurementStartedAtRef.current) / 1000));
    const created = await saveMeasurementSessionFromMetrics({
      mids,
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
    setMeasurementFileAnalyzing(true);
    try {
      const fileBuf = await file.arrayBuffer();
      const audio = await ctx.decodeAudioData(fileBuf);
      const data = audio.getChannelData(0);
      const windowSize = 4096;
      const hopSize = 1024;
      const mids: number[] = [];
      const loudnessDbSamples: number[] = [];
      let frames = 0;
      let voicedFrames = 0;
      let voicedStreak = 0;

      for (let i = 0; i + windowSize <= data.length; i += hopSize) {
        const frame = data.subarray(i, i + windowSize);
        const frameRms = calcRms(frame);
        const frameDb = rmsToDb(frameRms);
        if (frameDb <= NOISE_DB_THRESHOLD) {
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
      }

      const saved = await saveMeasurementSessionFromMetrics({
        mids,
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
    loudnessDbSamples,
    rangeChestMids,
    rangeFalsettoMids,
    elapsedSec,
    voicedFrames,
    frames,
    source = "recording",
  }: {
    mids: number[];
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
    const peakNote = quantizedMids.length ? midiToNote(Math.round(maxMidi)) : null;
    const lowestNote = quantizedMids.length ? midiToNote(Math.round(minMidi)) : null;
    const sustainNote = representativeMidi != null ? midiToNote(Math.round(representativeMidi)) : null;
    const rangeSemitones = quantizedMids.length ? Math.max(0, Math.round(maxMidi - minMidi)) : null;
    const pitchAbsCentsErrors = refinedMids.map((m) => Math.abs(m - Math.round(m)) * 100);
    const pitchAvgCentsError =
      pitchAbsCentsErrors.length > 0
        ? pitchAbsCentsErrors.reduce((acc, v) => acc + v, 0) / pitchAbsCentsErrors.length
        : null;
    const pitchScoreRaw = pitchAvgCentsError != null ? 100 - pitchAvgCentsError / 2 : null;
    const pitchAccuracyScore = pitchScoreRaw != null ? Math.max(0, Math.min(100, pitchScoreRaw)) : null;
    const pitchNoteCount = refinedMids.length;
    const avgLoudnessDb = loudnessDbSamples.length
      ? loudnessDbSamples.reduce((acc, v) => acc + v, 0) / loudnessDbSamples.length
      : -99;
    const voicedDurationSec = elapsedSec * voicedRatio;
    const defaultPhonationDurationSec = Number(voicedDurationSec.toFixed(1));
    const longestRun = findLongestSameNoteRun(quantizedMids);
    const secPerVoicedSample = quantizedMids.length > 0 ? voicedDurationSec / quantizedMids.length : 0;
    const longToneDurationSec =
      longestRun && secPerVoicedSample > 0 ? Number((longestRun.run * secPerVoicedSample).toFixed(1)) : 0;
    const longToneNote = longestRun ? midiToNote(longestRun.noteMidi) : null;
    const phonationDurationSec =
      activeMeasurementKey === "long_tone" ? longToneDurationSec : defaultPhonationDurationSec;
    const resolvedSustainNote =
      activeMeasurementKey === "long_tone" ? longToneNote : sustainNote;
    const chestQuantized = quantizeMidiSeriesWithHysteresis(refineMidiSamples(rangeChestMids ?? []));
    const falsettoQuantized = quantizeMidiSeriesWithHysteresis(refineMidiSamples(rangeFalsettoMids ?? []));
    const chestTopNote = chestQuantized.length ? midiToNote(Math.round(Math.max(...chestQuantized))) : null;
    const falsettoTopNote = falsettoQuantized.length ? midiToNote(Math.round(Math.max(...falsettoQuantized))) : null;
    const chestLowestNote = chestQuantized.length ? midiToNote(Math.round(Math.min(...chestQuantized))) : null;
    const falsettoLowestNote = falsettoQuantized.length ? midiToNote(Math.round(Math.min(...falsettoQuantized))) : null;
    const chestMinMidi = chestQuantized.length ? Math.min(...chestQuantized) : null;
    const chestMaxMidi = chestQuantized.length ? Math.max(...chestQuantized) : null;
    const falsettoMinMidi = falsettoQuantized.length ? Math.min(...falsettoQuantized) : null;
    const falsettoMaxMidi = falsettoQuantized.length ? Math.max(...falsettoQuantized) : null;
    const overlapMinMidi =
      chestMinMidi != null && falsettoMinMidi != null ? Math.max(chestMinMidi, falsettoMinMidi) : null;
    const overlapMaxMidi =
      chestMaxMidi != null && falsettoMaxMidi != null ? Math.min(chestMaxMidi, falsettoMaxMidi) : null;
    const hasOverlap = overlapMinMidi != null && overlapMaxMidi != null && overlapMinMidi <= overlapMaxMidi;
    const overlapLowestNote = hasOverlap ? midiToNote(Math.round(overlapMinMidi)) : null;
    const overlapHighestNote = hasOverlap ? midiToNote(Math.round(overlapMaxMidi)) : null;

    if (activeMeasurementKey === "range" && (!lowestNote || !peakNote || rangeSemitones == null)) {
      setMeasurementError("有効な音程が十分に検出できませんでした。もう少し大きい声で再測定してください。");
      return null;
    }
    if (activeMeasurementKey === "range" && !chestTopNote) {
      setMeasurementError("地声の最高音を検出できませんでした。地声パートを再測定してください。");
      return null;
    }
    if (activeMeasurementKey === "range" && !falsettoTopNote) {
      setMeasurementError("裏声の最高音を検出できませんでした。裏声パートを再測定してください。");
      return null;
    }
    if (activeMeasurementKey === "long_tone" && (resolvedSustainNote == null || phonationDurationSec <= 0)) {
      setMeasurementError("ロングトーンを判定できませんでした。同じ音程を連続で発声して再測定してください。");
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
      const savedRun = await persistMeasurement({
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
      });
      return buildMeasurementInstantResult({
        runId: savedRun.id,
        includeInInsights: !!savedRun.include_in_insights,
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
    setMeasurementResultModalOpen(false);
  };
  const saveMeasurementForInsights = async () => {
    if (!measurementInstantResult || measurementInstantResult.includeInInsights) {
      setMeasurementResultModalOpen(false);
      return;
    }
    try {
      setMeasurementResultSaving(true);
      await updateMeasurement({ id: measurementInstantResult.runId, include_in_insights: true });
      setMeasurementInstantResult({ ...measurementInstantResult, includeInInsights: true });
      setMeasurementResultModalOpen(false);
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
    setMeasurementRealtimeMidiPoints([]);
    setMeasurementCurrentMidi(null);
    setMeasurementCurrentNote(null);
    setMeasurementError(null);
  };
  const cancelMeasurementRecording = () => {
    void stopMeasurementRecording(false);
  };

  const shareMeasurementResult = async () => {
    if (!measurementInstantResult) return;
    const text = `${measurementInstantResult.title} (${measurementInstantResult.measuredAt})\n${measurementInstantResult.lines.join("\n")}`;
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: "測定結果", text });
        return;
      } catch {
        // no-op: fallback to clipboard
      }
    }
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // no-op
      }
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
              <RealtimePitchMonitor midiValues={measurementRealtimeMidiPoints} currentMidi={measurementCurrentMidi} />
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
                  <div className="trainingPage__resultModalMetricValue">
                    {measurementInstantResult.pitchAccuracyScore != null ? measurementInstantResult.pitchAccuracyScore.toFixed(1) : "-"}
                    <span>点</span>
                  </div>
                  <div className="trainingPage__resultModalMetricSub">
                    平均ズレ: {measurementInstantResult.pitchAccuracyAvgCents != null ? `${measurementInstantResult.pitchAccuracyAvgCents.toFixed(1)} cent` : "-"}
                  </div>
                  <div className="trainingPage__resultModalStats">
                    <div>発声音数 {measurementInstantResult.pitchAccuracyNoteCount ?? 0}</div>
                    <div>目安 ±{measurementInstantResult.pitchAccuracyAvgCents != null ? Math.max(0, Math.round(measurementInstantResult.pitchAccuracyAvgCents)).toFixed(0) : "-"} cent</div>
                    <div>精度 {measurementInstantResult.pitchAccuracyScore != null ? `${measurementInstantResult.pitchAccuracyScore.toFixed(1)} 点` : "-"}</div>
                  </div>
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
            </div>
            <div className="trainingPage__resultModalFooter">
              <div className="trainingPage__resultModalActions">
              <button
                type="button"
                className="trainingPage__resultModalBtn trainingPage__resultModalBtn--save"
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
              <button
                type="button"
                className="trainingPage__resultModalBtn trainingPage__resultModalBtn--share"
                onClick={() => void shareMeasurementResult()}
              >
                シェアする
              </button>
              <button
                type="button"
                className="trainingPage__resultModalBtn trainingPage__resultModalBtn--close"
                onClick={closeMeasurementResultModal}
              >
                閉じる
              </button>
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
                      subtitle={`${scaleTypeLabel(scaleType)} • ${tempo} BPM`}
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

function RealtimePitchMonitor({ midiValues, currentMidi }: { midiValues: number[]; currentMidi: number | null }) {
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

  if (midiValues.length < 2) {
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

  const min = Math.min(...midiValues);
  const max = Math.max(...midiValues);
  const minBound = Math.max(24, Math.floor(min) - 2);
  const maxBound = Math.min(96, Math.ceil(max) + 2);
  const range = Math.max(1, maxBound - minBound);
  const step = (width - padLeft - padRight) / Math.max(1, midiValues.length - 1);
  const path = midiValues
    .map((m, idx) => {
      const x = padLeft + idx * step;
      const y = height - padBottom - ((m - minBound) / range) * (height - padTop - padBottom);
      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const ticks = Array.from({ length: 8 }).map((_, i) => {
    const r = i / 7;
    const midi = Math.round(minBound + (maxBound - minBound) * (1 - r));
    const y = padTop + (height - padTop - padBottom) * r;
    return { y, label: midiToNote(midi) };
  });

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
        {ticks.map((t) => (
          <g key={`pt-${t.label}-${t.y}`}>
            <line x1={padLeft} y1={t.y} x2={width - padRight} y2={t.y} className="trainingPage__monitorGridLine" />
            <text x={padLeft - 6} y={t.y + 4} textAnchor="end" className="trainingPage__monitorAxisLabel">
              {t.label}
            </text>
          </g>
        ))}
        <path d={path} className="trainingPage__monitorPitchPath" />
      </svg>
    </div>
  );
}

function RealtimeDbMonitor({ dbValues, currentDb }: { dbValues: number[]; currentDb: number | null }) {
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
}): Promise<MeasurementRun> {
  if (systemKey === "range") {
    return createMeasurement({
      measurement_type: "range",
      include_in_insights: false,
      range_result: {
        lowest_note: lowestNote,
        highest_note: peakNote,
        range_semitones: rangeSemitones,
        range_octaves: rangeSemitones != null ? Number((rangeSemitones / 12).toFixed(2)) : null,
        chest_top_note: chestTopNote,
        falsetto_top_note: falsettoTopNote,
      },
    });
  }

  if (systemKey === "long_tone") {
    return createMeasurement({
      measurement_type: "long_tone",
      include_in_insights: false,
      long_tone_result: {
        sustain_sec: phonationDurationSec,
        sustain_note: sustainNote,
      },
    });
  }

  if (systemKey === "pitch_accuracy") {
    return createMeasurement({
      measurement_type: "pitch_accuracy",
      include_in_insights: false,
      pitch_accuracy_result: {
        avg_cents_error: pitchAvgCentsError != null ? Number(pitchAvgCentsError.toFixed(3)) : null,
        accuracy_score: pitchAccuracyScore != null ? Number(pitchAccuracyScore.toFixed(3)) : null,
        note_count: pitchNoteCount,
      },
    });
  }

  const minLoudness = loudnessDbSamples.length ? Math.min(...loudnessDbSamples) : null;
  const maxLoudness = loudnessDbSamples.length ? Math.max(...loudnessDbSamples) : null;
  const rangeDb = minLoudness != null && maxLoudness != null ? maxLoudness - minLoudness : null;
  const score = computeWithinBandRatePct(loudnessDbSamples, avgLoudnessDb, 3, 3);
  const ratio = score != null ? Number((score / 100).toFixed(6)) : null;
  return createMeasurement({
    measurement_type: "volume_stability",
    include_in_insights: false,
    volume_stability_result: {
      avg_loudness_db: Number(avgLoudnessDb.toFixed(3)),
      min_loudness_db: minLoudness != null ? Number(minLoudness.toFixed(3)) : null,
      max_loudness_db: maxLoudness != null ? Number(maxLoudness.toFixed(3)) : null,
      loudness_range_db: rangeDb != null ? Number(rangeDb.toFixed(3)) : null,
      loudness_range_ratio: ratio,
      loudness_range_pct: score,
    },
  });
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

function scaleTypeLabel(scaleType: ScaleType) {
  return scaleType === "5tone" ? "5 tone" : "octave";
}

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}

function useStateRef<T>(initial: T) {
  const [ref] = useState(() => ({ current: initial }));
  return ref;
}

function autoCorrelate(buf: Float32Array, sampleRate: number): number | null {
  const size = buf.length;
  const rms = calcRms(buf);
  if (rms < 0.0003) return null;

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

function findLongestSameNoteRun(mids: number[]) {
  if (mids.length === 0) return null;
  let cur = mids[0];
  let run = 1;
  let bestNote = cur;
  let bestRun = 1;
  for (let i = 1; i < mids.length; i += 1) {
    if (mids[i] === cur) {
      run += 1;
      continue;
    }
    if (run > bestRun) {
      bestRun = run;
      bestNote = cur;
    }
    cur = mids[i];
    run = 1;
  }
  if (run > bestRun) {
    bestRun = run;
    bestNote = cur;
  }
  return { noteMidi: bestNote, run: bestRun };
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
}: {
  runId: number;
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
}): MeasurementInstantResult {
  const measuredAt = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  if (systemKey === "range") {
    const oct = rangeSemitones != null ? (rangeSemitones / 12).toFixed(2) : "-";
    return {
      runId,
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
      includeInInsights,
      source,
      title: "ロングトーン",
      longToneSec: Number(phonationDurationSec.toFixed(1)),
      sustainNote,
      measuredAt,
      lines: [
        `同音程の連続発声秒数: ${phonationDurationSec.toFixed(1)} 秒`,
        `発声音程: ${sustainNote ?? "-"}`,
      ],
    };
  }

  if (systemKey === "pitch_accuracy") {
    return {
      runId,
      includeInInsights,
      source,
      title: "音程精度",
      pitchAccuracyScore: pitchAccuracyScore != null ? Number(pitchAccuracyScore.toFixed(1)) : null,
      pitchAccuracyAvgCents: pitchAvgCentsError != null ? Number(pitchAvgCentsError.toFixed(1)) : null,
      pitchAccuracyNoteCount: pitchNoteCount,
      measuredAt,
      lines: [
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
    includeInInsights,
    source,
    title: "音量安定性",
    avgLoudnessDb: Number.isFinite(avgLoudnessDb) ? Number(avgLoudnessDb.toFixed(1)) : null,
    minLoudnessDb: minLoudness != null ? Number(minLoudness.toFixed(1)) : null,
    maxLoudnessDb: maxLoudness != null ? Number(maxLoudness.toFixed(1)) : null,
    loudnessRangeDb: rangeDb != null ? Number(rangeDb.toFixed(1)) : null,
    loudnessRangePct: score != null ? Number(score.toFixed(1)) : null,
    loudnessTimeline: loudnessDbSamples.slice(-180).map((v) => Number(v.toFixed(3))),
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
  const overlapStatus: "ok" | "none" | "insufficient" =
    overlap.minMidi != null && overlap.maxMidi != null
      ? "ok"
      : chest.minMidi == null || chest.maxMidi == null || falsetto.minMidi == null || falsetto.maxMidi == null
        ? "insufficient"
        : "none";
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

      <div className="trainingPage__rangeResultOverlapInfo">
        {overlapStatus === "ok" && "共通音域は地声・裏声の両方で安定して出せるレンジです。"}
        {overlapStatus === "none" && "共通音域：なし（地声と裏声のレンジが重なっていません）"}
        {overlapStatus === "insufficient" && "共通音域：未算出（地声/裏声の測定が不足しています）"}
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
      <div className="trainingPage__longToneHint">ロングトーンは同じ音程を保てた最長時間で判定します。</div>
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
