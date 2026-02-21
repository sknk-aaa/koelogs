// frontend/src/pages/TrainingPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ScaleTrack, ScaleType, Tempo } from "../api/scaleTracks";
import { SCALE_TYPES, TEMPOS } from "../features/training/constants";
import { useScaleTracks } from "../features/training/hooks/useScaleTracks";
import { useAudioPlayer } from "../features/training/hooks/useAudioPlayer";
import TrackFilters from "../features/training/components/TrackFilters";
import AudioPlayer from "../features/training/components/AudioPlayer";
import { useSettings } from "../features/settings/useSettings";
import { useAuth } from "../features/auth/useAuth";
import type { AnalysisMenu } from "../types/analysisMenu";
import { fetchAnalysisMenus } from "../api/analysisMenus";
import type { AnalysisSession } from "../types/analysisSession";
import { createAnalysisSession, fetchAnalysisSessions, uploadAnalysisSessionAudio } from "../api/analysisSessions";
import AnalysisFeedbackPanel from "../features/analysis/components/AnalysisFeedbackPanel";
import MetronomeLoader from "../components/MetronomeLoader";
import ProcessingOverlay from "../components/ProcessingOverlay";

import "./TrainingPage.css";

type MetricKey =
  | "pitch_stability"
  | "pitch_accuracy"
  | "volume_stability"
  | "phonation_duration"
  | "peak_note"
  | "avg_loudness";

const METRIC_OPTIONS: Array<{
  key: MetricKey;
  label: string;
  description: string;
  detail: string;
  caution: string;
}> = [
  {
    key: "pitch_stability",
    label: "ピッチ安定度",
    description: "発声中の音程のブレの少なさ。高いほど一定の音程を保てています。",
    detail: "ロングトーンや母音の伸ばしで、音程が上下に揺れすぎていないかを確認する項目です。",
    caution: "ビブラートを意図して使う練習では、値が低めになることがあります。",
  },
  {
    key: "pitch_accuracy",
    label: "音程精度",
    description: "検出ピッチが半音中心にどれだけ近いか。高いほど狙った音程に近い状態です。",
    detail: "狙った音高に対して、実際の音程がどれくらい外れているかを確認する項目です。",
    caution: "滑らかに音をつなぐ練習では、遷移区間で誤差が大きく見える場合があります。",
  },
  {
    key: "volume_stability",
    label: "音量安定",
    description: "発声中の音量のばらつきの少なさ。高いほど音量を一定に保てています。",
    detail: "声量を保ったままムラなく発声できているかを確認する項目です。",
    caution: "マイク位置や部屋の反響の変化でも値が揺れるため、録音環境をそろえるのがおすすめです。",
  },
  {
    key: "phonation_duration",
    label: "発声時間",
    description: "有効な発声として検出された合計時間。ロングトーン系の比較に向いています。",
    detail: "録音時間のうち、実際に発声していた時間の長さを確認する項目です。",
    caution: "無音区間が長い録音や、息だけの区間が多い録音では短く出ます。",
  },
  {
    key: "peak_note",
    label: "最高音",
    description: "録音内で検出された最も高い音。",
    detail: "そのテイクで到達した最大音高を把握する項目です。",
    caution: "一瞬のノイズで高く出るのを避けるため、同条件で複数回の記録を比較してください。",
  },
  {
    key: "avg_loudness",
    label: "発声の大きさの平均",
    description: "発声区間の平均音量(dBFS)。声量の目安として使えます。",
    detail: "発声区間全体の平均音量を確認する項目です。",
    caution: "端末やマイク感度に依存するため、絶対値よりも自分の過去記録との比較が有効です。",
  },
];
const DEFAULT_SELECTED_METRICS: MetricKey[] = ["pitch_stability", "pitch_accuracy", "volume_stability"];
const MEASUREMENT_SHORTCUTS: Array<{
  title: string;
  systemKey: string;
  note: string;
}> = [
  { title: "裏声最高音", systemKey: "falsetto_peak", note: "裏声の最高到達音を確認" },
  { title: "地声最高音", systemKey: "chest_peak", note: "地声の最高到達音を確認" },
  { title: "音域", systemKey: "range", note: "最低音〜最高音の幅を確認" },
  { title: "ロングトーン秒数", systemKey: "long_tone", note: "発声持続の推移を確認" },
  { title: "音程正確性", systemKey: "pitch_accuracy", note: "固定条件で半音中心へのズレを確認" },
  { title: "音量安定性", systemKey: "volume_stability", note: "固定条件で音量のばらつきを確認" },
];
const PRESET_INFO: Array<{
  title: string;
  description: string;
  metrics: string;
  condition?: string;
}> = [
  {
    title: "裏声最高音",
    description: "裏声で無理なく最高音を測定します。",
    metrics: "最高音 / 音程精度 / ピッチ安定度",
  },
  {
    title: "地声最高音",
    description: "地声で無理なく最高音を測定します。",
    metrics: "最高音 / 音程精度 / ピッチ安定度",
  },
  {
    title: "音域（最高音−最低音）",
    description: "最低音から最高音までの到達幅を測定します。",
    metrics: "最高音 / ピッチ安定度",
  },
  {
    title: "ロングトーン",
    description: "一定音量・一定音程で発声を維持できる秒数を測定します。",
    metrics: "発声時間 / 音量安定 / ピッチ安定度",
  },
  {
    title: "音程正確性",
    description: "半音中心からのズレを評価します。",
    metrics: "音程精度 / ピッチ安定度",
    condition: "固定条件: トレーニング音源から選択したスケール/テンポ",
  },
  {
    title: "音量安定性",
    description: "発声中の音量のばらつきを評価します。",
    metrics: "音量安定 / 発声の大きさの平均",
    condition: "固定条件: トレーニング音源から選択したスケール/テンポ",
  },
];
const ALLOWED_ANALYSIS_SYSTEM_KEYS = new Set(MEASUREMENT_SHORTCUTS.map((v) => v.systemKey));

export default function TrainingPage() {
  const navigate = useNavigate();
  const { tracks, loading, error } = useScaleTracks();
  const { settings } = useSettings();
  const { me, isLoading: authLoading } = useAuth();

  const [scaleType, setScaleType] = useState<ScaleType>("5tone");
  const [tempo, setTempo] = useState<Tempo>(120);
  const [analysisMenus, setAnalysisMenus] = useState<AnalysisMenu[]>([]);
  const [activeAnalysisMenuId, setActiveAnalysisMenuId] = useState<number | null>(null);
  const [analysisMetricInfoOpen, setAnalysisMetricInfoOpen] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSessionSaving, setAnalysisSessionSaving] = useState(false);
  const [analysisFileAnalyzing, setAnalysisFileAnalyzing] = useState(false);
  const [analysisUseTrainingTrack, setAnalysisUseTrainingTrack] = useState(false);
  const [analysisSaveRecordingAudio, setAnalysisSaveRecordingAudio] = useState(false);
  const [analysisSessions, setAnalysisSessions] = useState<AnalysisSession[]>([]);
  const [analysisRecording, setAnalysisRecording] = useState(false);
  const [analysisCurrentNote, setAnalysisCurrentNote] = useState<string | null>(null);
  const [analysisLastResult, setAnalysisLastResult] = useState<AnalysisSession | null>(null);

  const analysisAudioContextRef = useStateRef<AudioContext | null>(null);
  const analysisAnalyserRef = useStateRef<AnalyserNode | null>(null);
  const analysisMediaStreamRef = useStateRef<MediaStream | null>(null);
  const analysisSourceRef = useStateRef<MediaStreamAudioSourceNode | null>(null);
  const analysisRafRef = useStateRef<number | null>(null);
  const analysisStartedAtRef = useStateRef<number>(0);
  const analysisMidiSamplesRef = useStateRef<number[]>([]);
  const analysisLoudnessSamplesRef = useStateRef<number[]>([]);
  const analysisRmsSamplesRef = useStateRef<number[]>([]);
  const analysisVoicedFramesRef = useStateRef<number>(0);
  const analysisFramesRef = useStateRef<number>(0);
  const analysisTrackEndHandlerRef = useStateRef<(() => void) | null>(null);
  const analysisAutoPlaybackRef = useStateRef<boolean>(false);
  const analysisMediaRecorderRef = useStateRef<MediaRecorder | null>(null);
  const analysisMediaChunksRef = useStateRef<Blob[]>([]);
  const analysisMediaMimeTypeRef = useStateRef<string>("audio/webm");

  const selected: ScaleTrack | null = useMemo(() => {
    return tracks.find((t) => t.scale_type === scaleType && t.tempo === tempo) ?? null;
  }, [tracks, scaleType, tempo]);
  const activeAnalysisMenu = useMemo(
    () => analysisMenus.find((m) => m.id === activeAnalysisMenuId) ?? null,
    [analysisMenus, activeAnalysisMenuId]
  );
  const activeSelectedMetrics = normalizeMetricSelection(activeAnalysisMenu?.selected_metrics);

  const { audioRef, isPlaying, togglePlay, onPlay, onPause, onEnded } = useAudioPlayer(
    selected?.id ?? null,
    {
      defaultVolume: settings.defaultVolume,
      loopEnabled: settings.loopEnabled,
    }
  );

  const disabled = loading || !!error || !selected;
  const guestMode = !authLoading && !me;
  const goLogin = () => {
    navigate("/login", { state: { fromPath: "/training" } });
  };

  useEffect(() => {
    if (!me) {
      setAnalysisMenus([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const fetched = await fetchAnalysisMenus(false);
        const menus = fetched.filter((m) => ALLOWED_ANALYSIS_SYSTEM_KEYS.has(m.system_key));
        if (!cancelled) {
          setAnalysisMenus(menus);
          setActiveAnalysisMenuId((prev) => {
            if (prev && menus.some((m) => m.id === prev)) return prev;
            return menus[0]?.id ?? null;
          });
        }
      } catch (e) {
        if (!cancelled) setAnalysisError(errorMessage(e, "分析メニューの取得に失敗しました"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me]);

  useEffect(() => {
    if (!me || !activeAnalysisMenuId) {
      setAnalysisSessions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const sessions = await fetchAnalysisSessions(activeAnalysisMenuId);
        if (!cancelled) {
          setAnalysisSessions(sessions);
        }
      } catch (e) {
        if (!cancelled) setAnalysisError(errorMessage(e, "分析結果の取得に失敗しました"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me, activeAnalysisMenuId]);

  useEffect(() => {
    return () => {
      void stopAnalysisRecording(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAndCollectRecordingBlob = async () => {
    const recorder = analysisMediaRecorderRef.current;
    if (!recorder) return null;

    const buildBlob = () => {
      const chunks = analysisMediaChunksRef.current;
      if (!chunks.length) return null;
      return new Blob(chunks, { type: analysisMediaMimeTypeRef.current || chunks[0]?.type || "audio/webm" });
    };

    if (recorder.state === "inactive") {
      const blob = buildBlob();
      analysisMediaRecorderRef.current = null;
      analysisMediaChunksRef.current = [];
      return blob;
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      const timer = window.setTimeout(() => resolve(buildBlob()), 1200);
      recorder.onstop = () => {
        window.clearTimeout(timer);
        resolve(buildBlob());
      };
      recorder.stop();
    });

    analysisMediaRecorderRef.current = null;
    analysisMediaChunksRef.current = [];
    return blob;
  };

  const startAnalysisRecording = async () => {
    if (!activeAnalysisMenuId) {
      setAnalysisError("分析メニューを選択してください");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setAnalysisError("このブラウザは録音に対応していません");
      return;
    }
    setAnalysisError(null);
    setAnalysisLastResult(null);
    if (analysisUseTrainingTrack && (!selected?.file_path || !audioRef.current)) {
      setAnalysisError("同時再生モードには再生可能なトレーニング音源が必要です");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: false, autoGainControl: false, echoCancellation: false },
      });
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) {
        stream.getTracks().forEach((t) => t.stop());
        setAnalysisError("AudioContext が利用できません");
        return;
      }

      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.05;
      source.connect(analyser);

      analysisAudioContextRef.current = ctx;
      analysisSourceRef.current = source;
      analysisAnalyserRef.current = analyser;
      analysisMediaStreamRef.current = stream;
      analysisStartedAtRef.current = performance.now();
      analysisMidiSamplesRef.current = [];
      analysisLoudnessSamplesRef.current = [];
      analysisRmsSamplesRef.current = [];
      analysisVoicedFramesRef.current = 0;
      analysisFramesRef.current = 0;
      analysisMediaChunksRef.current = [];
      analysisMediaRecorderRef.current = null;
      analysisMediaMimeTypeRef.current = "audio/webm";
      setAnalysisCurrentNote(null);
      setAnalysisRecording(true);
      analysisAutoPlaybackRef.current = false;

      if (analysisSaveRecordingAudio) {
        if (typeof MediaRecorder === "undefined") {
          setAnalysisError("このブラウザは録音ファイル保存に対応していません");
        } else {
          const mimeType = pickRecorderMimeType();
          const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
          analysisMediaRecorderRef.current = recorder;
          analysisMediaMimeTypeRef.current = recorder.mimeType || mimeType || "audio/webm";
          recorder.ondataavailable = (ev) => {
            if (ev.data && ev.data.size > 0) analysisMediaChunksRef.current.push(ev.data);
          };
          recorder.start(250);
        }
      }

      if (analysisUseTrainingTrack && audioRef.current) {
        const audio = audioRef.current;
        if (analysisTrackEndHandlerRef.current) {
          audio.removeEventListener("ended", analysisTrackEndHandlerRef.current);
          analysisTrackEndHandlerRef.current = null;
        }
        const onEnded = () => {
          void stopAnalysisRecording(true);
        };
        analysisTrackEndHandlerRef.current = onEnded;
        audio.addEventListener("ended", onEnded);
        audio.currentTime = 0;
        await audio.play();
        analysisAutoPlaybackRef.current = true;
      }

      const data = new Float32Array(analyser.fftSize);
      const tick = () => {
        const ac = analysisAudioContextRef.current;
        const an = analysisAnalyserRef.current;
        if (!ac || !an) return;

        an.getFloatTimeDomainData(data);
        const frameRms = calcRms(data);
        const frameDb = rmsToDb(frameRms);
        const freq = autoCorrelate(data, ac.sampleRate);
        analysisFramesRef.current += 1;
        if (freq) {
          analysisVoicedFramesRef.current += 1;
          const midi = 69 + 12 * Math.log2(freq / 440);
          analysisMidiSamplesRef.current.push(midi);
          analysisRmsSamplesRef.current.push(frameRms);
          analysisLoudnessSamplesRef.current.push(frameDb);
          setAnalysisCurrentNote(midiToNote(Math.round(midi)));
        }
        analysisRafRef.current = requestAnimationFrame(tick);
      };
      analysisRafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setAnalysisError(errorMessage(e, "録音開始に失敗しました"));
    }
  };

  const stopAnalysisRecording = async (save: boolean) => {
    const recordedBlob = await stopAndCollectRecordingBlob();

    if (analysisTrackEndHandlerRef.current && audioRef.current) {
      audioRef.current.removeEventListener("ended", analysisTrackEndHandlerRef.current);
      analysisTrackEndHandlerRef.current = null;
    }
    if (analysisAutoPlaybackRef.current && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      analysisAutoPlaybackRef.current = false;
    }

    if (analysisRafRef.current != null) {
      cancelAnimationFrame(analysisRafRef.current);
      analysisRafRef.current = null;
    }
    if (analysisMediaStreamRef.current) {
      analysisMediaStreamRef.current.getTracks().forEach((t) => t.stop());
      analysisMediaStreamRef.current = null;
    }
    if (analysisSourceRef.current) {
      try {
        analysisSourceRef.current.disconnect();
      } catch {
        // no-op
      }
      analysisSourceRef.current = null;
    }
    if (analysisAnalyserRef.current) {
      try {
        analysisAnalyserRef.current.disconnect();
      } catch {
        // no-op
      }
      analysisAnalyserRef.current = null;
    }
    if (analysisAudioContextRef.current) {
      try {
        await analysisAudioContextRef.current.close();
      } catch {
        // no-op
      }
      analysisAudioContextRef.current = null;
    }

    setAnalysisRecording(false);

    if (!save || !activeAnalysisMenuId) return;

    const mids = analysisMidiSamplesRef.current;
    const loudnessDbSamples = analysisLoudnessSamplesRef.current;
    const rmsSamples = analysisRmsSamplesRef.current;
    const elapsedSec = Math.max(1, Math.round((performance.now() - analysisStartedAtRef.current) / 1000));
    const created = await saveAnalysisSessionFromMetrics({
      mids,
      loudnessDbSamples,
      rmsSamples,
      elapsedSec,
      voicedFrames: analysisVoicedFramesRef.current,
      frames: analysisFramesRef.current,
      rawMetricsExtra: { source: "microphone" },
    });
    if (!created) return;

    if (analysisSaveRecordingAudio && recordedBlob && created?.id) {
      try {
        const ext = extensionFromMimeType(recordedBlob.type || analysisMediaMimeTypeRef.current);
        const uploaded = await uploadAnalysisSessionAudio(created.id, recordedBlob, `analysis_${created.id}${ext}`);
        setAnalysisLastResult(uploaded);
        setAnalysisSessions((prev) => prev.map((s) => (s.id === uploaded.id ? uploaded : s)));
      } catch (e) {
        setAnalysisError(errorMessage(e, "録音ファイルの保存に失敗しました"));
      }
    }

  };

  const onUploadAnalysisFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file || !activeAnalysisMenuId) return;

    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      setAnalysisError("AudioContext が利用できません");
      return;
    }

    const ctx = new Ctx();
    setAnalysisError(null);
    setAnalysisLastResult(null);
    setAnalysisFileAnalyzing(true);
    try {
      const fileBuf = await file.arrayBuffer();
      const audio = await ctx.decodeAudioData(fileBuf);
      const data = audio.getChannelData(0);
      const windowSize = 2048;
      const hopSize = 1024;
      const mids: number[] = [];
      const loudnessDbSamples: number[] = [];
      const rmsSamples: number[] = [];
      let frames = 0;
      let voicedFrames = 0;

      for (let i = 0; i + windowSize <= data.length; i += hopSize) {
        const frame = data.subarray(i, i + windowSize);
        const frameRms = calcRms(frame);
        const frameDb = rmsToDb(frameRms);
        const freq = autoCorrelate(frame, audio.sampleRate);
        frames += 1;
        if (!freq) continue;
        voicedFrames += 1;
        mids.push(69 + 12 * Math.log2(freq / 440));
        rmsSamples.push(frameRms);
        loudnessDbSamples.push(frameDb);
      }

      await saveAnalysisSessionFromMetrics({
        mids,
        loudnessDbSamples,
        rmsSamples,
        elapsedSec: Math.max(1, Math.round(audio.duration)),
        voicedFrames,
        frames,
        rawMetricsExtra: { source: "file", filename: file.name },
      });
    } catch (err) {
      setAnalysisError(errorMessage(err, "音声ファイルの解析に失敗しました"));
    } finally {
      setAnalysisFileAnalyzing(false);
      try {
        await ctx.close();
      } catch {
        // no-op
      }
    }
  };

  const saveAnalysisSessionFromMetrics = async ({
    mids,
    loudnessDbSamples,
    rmsSamples,
    elapsedSec,
    voicedFrames,
    frames,
    rawMetricsExtra,
  }: {
    mids: number[];
    loudnessDbSamples: number[];
    rmsSamples: number[];
    elapsedSec: number;
    voicedFrames: number;
    frames: number;
    rawMetricsExtra?: Record<string, unknown>;
  }): Promise<AnalysisSession | null> => {
    if (!activeAnalysisMenuId) return null;
    const voicedRatio = frames > 0 ? voicedFrames / frames : 0;
    const mean = mids.length ? mids.reduce((acc, v) => acc + v, 0) / mids.length : 0;
    const variance = mids.length ? mids.reduce((acc, v) => acc + (v - mean) ** 2, 0) / mids.length : 0;
    const std = Math.sqrt(variance);
    const minMidi = mids.length ? Math.min(...mids) : 0;
    const maxMidi = mids.length ? Math.max(...mids) : 0;
    const peakNote = mids.length ? midiToNote(Math.round(maxMidi)) : null;
    const lowestNote = mids.length ? midiToNote(Math.round(minMidi)) : null;
    const rangeSemitones = mids.length ? Math.max(0, Math.round(maxMidi - minMidi)) : null;
    const pitchStability = mids.length ? clampScore(100 - std * 22) : 0;
    const centsFromSemitone = mids.length
      ? mids.map((m) => Math.abs(m - Math.round(m)) * 100)
      : [];
    const meanCentsError = centsFromSemitone.length
      ? centsFromSemitone.reduce((acc, v) => acc + v, 0) / centsFromSemitone.length
      : 100;
    const pitchAccuracy = clampScore(100 - meanCentsError);
    const centsStdDev = centsFromSemitone.length ? stdDev(centsFromSemitone) : 0;

    const loudnessStd = loudnessDbSamples.length ? stdDev(loudnessDbSamples) : 99;
    const rmsStdDev = rmsSamples.length ? stdDev(rmsSamples) : null;
    const avgLoudnessDb = loudnessDbSamples.length
      ? loudnessDbSamples.reduce((acc, v) => acc + v, 0) / loudnessDbSamples.length
      : -99;
    const volumeStability = clampScore(100 - loudnessStd * 6);
    const phonationDurationSec = Number((elapsedSec * voicedRatio).toFixed(1));
    const usePitchStability = activeSelectedMetrics.includes("pitch_stability");
    const usePitchAccuracy = activeSelectedMetrics.includes("pitch_accuracy");
    const useVolumeStability = activeSelectedMetrics.includes("volume_stability");
    const usePhonationDuration = activeSelectedMetrics.includes("phonation_duration");
    const usePeakNote = activeSelectedMetrics.includes("peak_note");
    const useAvgLoudness = activeSelectedMetrics.includes("avg_loudness");

    try {
      setAnalysisSessionSaving(true);
      const created = await createAnalysisSession({
        analysis_menu_id: activeAnalysisMenuId,
        measurement_kind: detectMeasurementKind(activeAnalysisMenu?.system_key),
        duration_sec: elapsedSec,
        peak_note: usePeakNote ? peakNote : null,
        lowest_note: rangeSemitones != null ? lowestNote : null,
        pitch_stability_score: usePitchStability ? pitchStability : null,
        voice_consistency_score: null,
        range_semitones: rangeSemitones,
        recorded_scale_type: scaleType,
        recorded_tempo: tempo,
        raw_metrics: {
          samples: mids.length,
          voiced_ratio: Number(voicedRatio.toFixed(3)),
          std_semitones: Number(std.toFixed(3)),
          pitch_accuracy_score: usePitchAccuracy ? pitchAccuracy : null,
          pitch_accuracy_cents_mean: usePitchAccuracy ? Number(meanCentsError.toFixed(2)) : null,
          pitch_accuracy_cents_stddev: usePitchAccuracy ? Number(centsStdDev.toFixed(2)) : null,
          volume_stability_score: useVolumeStability ? volumeStability : null,
          volume_stability_rms_stddev: useVolumeStability && rmsStdDev != null ? Number(rmsStdDev.toFixed(6)) : null,
          phonation_duration_sec: usePhonationDuration ? phonationDurationSec : null,
          avg_loudness_db: useAvgLoudness ? Number(avgLoudnessDb.toFixed(1)) : null,
          peak_note_enabled: usePeakNote,
          min_midi: Number(minMidi.toFixed(2)),
          max_midi: Number(maxMidi.toFixed(2)),
          ...rawMetricsExtra,
        },
      });
      setAnalysisLastResult(created);
      setAnalysisSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== created.id);
        return [created, ...filtered].slice(0, 50);
      });
      return created;
    } catch (e) {
      setAnalysisError(errorMessage(e, "分析結果の保存に失敗しました"));
      return null;
    } finally {
      setAnalysisSessionSaving(false);
    }
  };

  const previousForLast = findPreviousComparableSession(
    analysisSessions,
    0,
    Boolean(activeAnalysisMenu?.compare_by_scale),
    Boolean(activeAnalysisMenu?.compare_by_tempo),
    null,
    null
  );
  const onSelectMeasurementShortcut = (systemKey: string) => {
    const found = analysisMenus.find((m) => m.system_key === systemKey);
    if (!found) {
      setAnalysisError(`固定メニュー（${systemKey}）が見つかりませんでした。再読み込みしてください。`);
      return;
    }
    setAnalysisError(null);
    setActiveAnalysisMenuId(found.id);
  };

  return (
    <div className="page trainingPage">
      <ProcessingOverlay
        open={analysisSessionSaving}
        title="保存中..."
        description="AI録音分析の結果を保存しています"
      />
      <div className="trainingPage__bg" aria-hidden="true" />

      {guestMode && (
        <section className="card trainingPage__aiIntroCard">
          <div className="trainingPage__aiIntroTitle">AI録音分析</div>
          <div className="trainingPage__aiIntroText">
            録音した音声から、ピッチ安定度や音程精度などを分析します。
            結果をもとに、次に改善するポイントを具体的に確認できます。
          </div>
          <div className="trainingPage__aiIntroExample">
            例: ピッチ安定度 78 / 改善ポイント: 語尾で音程が下がる傾向
          </div>
          <button className="trainingPage__aiIntroBtn" onClick={goLogin}>
            ログインしてAI録音分析を使う
          </button>
        </section>
      )}

      <main className="trainingPage__grid">
        <section className="trainingPage__panel">
          <div className="trainingPage__panelHead">
            <div className="trainingPage__panelTitle">トレーニング音源</div>
            <div className="trainingPage__panelMeta">スケール / テンポ / 再生</div>
          </div>

          <div className="trainingPage__studioCard">
            <div className="trainingPage__studioFilters">
              <TrackFilters
                scaleType={scaleType}
                tempo={tempo}
                scaleTypes={SCALE_TYPES}
                tempos={TEMPOS}
                disabled={loading}
                onChangeScaleType={setScaleType}
                onChangeTempo={setTempo}
              />
            </div>
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

      <section className="trainingPage__analysisPanel">
        <div className="trainingPage__panelHead">
          <div className="trainingPage__panelTitle">AI録音分析メニュー</div>
        </div>

        {guestMode ? (
          <div className="trainingPage__analysisGuest">
            ログインすると、固定の測定メニューで録音分析を継続利用できます。
          </div>
        ) : (
          <>
            <section className="trainingPage__analysisStep trainingPage__analysisStep--manage">
              <div className="trainingPage__analysisStepHead">
                <div className="trainingPage__analysisStepBadge">1</div>
                <div className="trainingPage__analysisStepHeadText">
                  <div className="trainingPage__analysisStepTitle">測定項目を選ぶ（測定メニュー確認）</div>
                  <div className="trainingPage__analysisStepDesc">選んだ項目に対応する固定メニューで録音分析します。</div>
                </div>
                <button
                  type="button"
                  className="trainingPage__analysisMiniBtn trainingPage__analysisMiniBtn--ghost"
                  onClick={() => setAnalysisMetricInfoOpen(true)}
                >
                  判定項目について
                </button>
              </div>
              <div className="trainingPage__analysisPresetGrid">
                {MEASUREMENT_SHORTCUTS.map((shortcut) => {
                  const selectedNow = activeAnalysisMenu?.system_key === shortcut.systemKey;
                  return (
                    <div key={shortcut.systemKey} className="trainingPage__analysisPresetItem">
                      <div className="trainingPage__analysisPresetName">{shortcut.title}</div>
                      <div className="trainingPage__analysisPresetDesc">{shortcut.note}</div>
                      <button
                        type="button"
                        className="trainingPage__analysisMiniBtn"
                        onClick={() => onSelectMeasurementShortcut(shortcut.systemKey)}
                        disabled={analysisMenus.length === 0}
                      >
                        {selectedNow ? "選択中" : "この測定を使う"}
                      </button>
                    </div>
                  );
                })}
              </div>
              {analysisMenus.length === 0 && (
                <div className="trainingPage__analysisEmpty">固定メニューを読み込み中です。再読み込みしてください。</div>
              )}
            </section>

            {analysisError && <div className="trainingPage__analysisError">{analysisError}</div>}

            <section className="trainingPage__analysisStep trainingPage__analysisStep--record">
              <div className="trainingPage__analysisStepHead">
                <div className="trainingPage__analysisStepBadge">2</div>
                <div className="trainingPage__analysisStepHeadText">
                  <div className="trainingPage__analysisStepTitle trainingPage__analysisStepTitle--record">録音分析を実行</div>
                  <div className="trainingPage__analysisStepDesc">選択中メニューを使って録音または音声解析を行います。</div>
                </div>
                <button
                  type="button"
                  className="trainingPage__analysisMiniBtn trainingPage__analysisMiniBtn--ghost trainingPage__analysisStepToggleBtn"
                  onClick={() => navigate(activeAnalysisMenuId ? `/analysis/history?menu_id=${activeAnalysisMenuId}` : "/analysis/history")}
                >
                  履歴を見る
                </button>
              </div>

              {analysisMenus.length > 0 ? (
                <div className="trainingPage__analysisSelectorBox">
                  <div className="trainingPage__field">
                    <label className="trainingPage__label" htmlFor="analysis-target-menu">分析に使うメニュー</label>
                    <select
                      id="analysis-target-menu"
                      className="trainingPage__input trainingPage__select"
                      value={activeAnalysisMenuId ?? ""}
                      onChange={(e) => {
                        const v = Number.parseInt(e.target.value, 10);
                        setActiveAnalysisMenuId(Number.isNaN(v) ? null : v);
                      }}
                    >
                      <option value="" disabled>選択してください</option>
                      {analysisMenus.map((menu) => (
                        <option key={`analysis-target-${menu.id}`} value={menu.id}>
                          {menu.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {activeAnalysisMenu && (
                    <div className="trainingPage__analysisTargetMeta">
                      選択中: {activeAnalysisMenu.name} / 判定項目: {metricLabels(activeAnalysisMenu.selected_metrics).join(" / ")}
                    </div>
                  )}
                </div>
              ) : (
                <div className="trainingPage__analysisGuide">
                  固定プリセットの取得に失敗しました。ページを再読み込みしてください。
                </div>
              )}

              {!activeAnalysisMenuId && (
                <div className="trainingPage__analysisGuide">
                  上のメニュー選択で、分析対象メニューを選んでください。
                </div>
              )}

              <div className="trainingPage__analysisRecorder">
              <div className="trainingPage__analysisRecorderTitle">録音分析</div>
              <div className="trainingPage__analysisModeBox">
                <div className="trainingPage__analysisModeText">
                  比較精度を上げるには、毎回同じスケール/テンポで「音源と同時に録音」するのが効果的です。
                </div>
                <label className="trainingPage__analysisModeToggle">
                  <input
                    type="checkbox"
                    checked={analysisUseTrainingTrack}
                    onChange={(e) => setAnalysisUseTrainingTrack(e.target.checked)}
                    disabled={analysisRecording || analysisSessionSaving || analysisFileAnalyzing}
                  />
                  録音時にトレーニング音源を同時再生する
                </label>
                <label className="trainingPage__analysisModeToggle">
                  <input
                    type="checkbox"
                    checked={analysisSaveRecordingAudio}
                    onChange={(e) => setAnalysisSaveRecordingAudio(e.target.checked)}
                    disabled={analysisRecording || analysisSessionSaving || analysisFileAnalyzing}
                  />
                  録音も保存する
                </label>
                <div className="trainingPage__analysisSelected">
                  選択中: {scaleTypeLabel(scaleType)}, {tempo} bpm
                </div>
              </div>
              <div className="trainingPage__analysisRecorderRow">
                <button
                  type="button"
                  className={`trainingPage__saveBtn ${analysisRecording ? "is-recording" : ""}`}
                  onClick={() => {
                    if (analysisRecording) void stopAnalysisRecording(true);
                    else void startAnalysisRecording();
                  }}
                  disabled={
                    !activeAnalysisMenuId ||
                    analysisSessionSaving ||
                    analysisFileAnalyzing ||
                    (analysisUseTrainingTrack && !selected?.file_path)
                  }
                >
                  {analysisRecording ? (
                    "録音停止して分析保存"
                  ) : analysisSessionSaving ? (
                    <span className="trainingPage__busyInline">
                      保存中…
                      <MetronomeLoader compact label="" className="trainingPage__busyLoader" />
                    </span>
                  ) : (
                    "録音開始"
                  )}
                </button>
                <label className={`trainingPage__fileBtn ${analysisFileAnalyzing ? "is-busy" : ""}`}>
                  {analysisFileAnalyzing ? "解析中…" : "音声ファイルを解析"}
                  <input
                    type="file"
                    accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg"
                    onChange={(ev) => void onUploadAnalysisFile(ev)}
                    disabled={!activeAnalysisMenuId || analysisRecording || analysisSessionSaving || analysisFileAnalyzing}
                  />
                </label>
                <div className="trainingPage__analysisNowNote">
                  {analysisRecording ? `検出中: ${analysisCurrentNote ?? "—"}` : "録音停止中"}
                </div>
              </div>
              {analysisLastResult && (
                <section className="trainingPage__analysisResult">
                  <div className="trainingPage__analysisResultHead">
                    <div className="trainingPage__analysisResultTitle">分析結果</div>
                    <div className="trainingPage__analysisResultMeta">
                      {formatDateTime(analysisLastResult.created_at)} に保存
                    </div>
                  </div>
                  <div className="trainingPage__analysisSummary">
                    {activeSelectedMetrics.map((key) => (
                      <span key={`last-${key}`}>{metricLabel(key)} {formatMetricValue(analysisLastResult, key)}</span>
                    ))}
                  </div>
                  {previousForLast && (
                    <div className="trainingPage__analysisDiff">
                      {activeSelectedMetrics.filter(isDiffMetric).map((key) => (
                        <span key={`diff-${key}`}>
                          前回比 {metricLabel(key)} {formatMetricDiff(analysisLastResult, previousForLast, key)}
                        </span>
                      ))}
                    </div>
                  )}
                  {(analysisLastResult.ai_feedback || analysisLastResult.feedback_text) && (
                    <AnalysisFeedbackPanel
                      className="trainingPage__analysisAiFeedback"
                      feedback={analysisLastResult.ai_feedback}
                      fallbackText={analysisLastResult.feedback_text}
                    />
                  )}
                </section>
              )}
              </div>
            </section>

            {analysisMetricInfoOpen && (
              <div
                className="trainingPage__modalOverlay"
                role="button"
                tabIndex={0}
                onClick={() => setAnalysisMetricInfoOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setAnalysisMetricInfoOpen(false);
                }}
              >
                <div
                  className="trainingPage__modalCard"
                  role="dialog"
                  aria-modal="true"
                  aria-label="判定項目の説明"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div className="trainingPage__modalHead">
                    <div className="trainingPage__modalTitle">判定項目について</div>
                    <button
                      type="button"
                      className="trainingPage__analysisMiniBtn trainingPage__analysisMiniBtn--ghost"
                      onClick={() => setAnalysisMetricInfoOpen(false)}
                    >
                      閉じる
                    </button>
                  </div>
                  <div className="trainingPage__modalBody">
                    {PRESET_INFO.map((preset) => (
                      <div key={preset.title} className="trainingPage__metricInfoItem">
                        <div className="trainingPage__metricInfoLabel">{preset.title}</div>
                        <div className="trainingPage__metricInfoText">{preset.description}</div>
                        <div className="trainingPage__metricInfoText">{preset.metrics}</div>
                        {preset.condition && (
                          <div className="trainingPage__metricInfoText">{preset.condition}</div>
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

function normalizeMetricSelection(input?: string[] | null): MetricKey[] {
  const legacyMap: Record<string, MetricKey> = {
    voice_consistency: "phonation_duration",
    range_semitones: "peak_note",
  };
  const known = new Set<MetricKey>([
    "pitch_stability",
    "pitch_accuracy",
    "volume_stability",
    "phonation_duration",
    "peak_note",
    "avg_loudness",
  ]);
  const list = Array.isArray(input)
    ? input
        .map((v) => legacyMap[v] ?? v)
        .filter((v): v is MetricKey => known.has(v as MetricKey))
    : [];
  return list.length > 0 ? Array.from(new Set(list)) : DEFAULT_SELECTED_METRICS;
}

function metricLabels(selected?: string[] | null) {
  const keys = normalizeMetricSelection(selected);
  const map = new Map(METRIC_OPTIONS.map((opt) => [opt.key, opt.label] as const));
  return keys.map((k) => map.get(k) ?? k);
}

function metricLabel(key: MetricKey) {
  return METRIC_OPTIONS.find((m) => m.key === key)?.label ?? key;
}

function getNumericRawMetric(session: AnalysisSession, key: "pitch_accuracy_score" | "volume_stability_score" | "phonation_duration_sec" | "avg_loudness_db") {
  const v = session.raw_metrics?.[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function metricNumberValue(session: AnalysisSession, key: MetricKey) {
  if (key === "pitch_stability") return session.pitch_stability_score ?? null;
  if (key === "pitch_accuracy") return getNumericRawMetric(session, "pitch_accuracy_score");
  if (key === "volume_stability") return getNumericRawMetric(session, "volume_stability_score");
  if (key === "phonation_duration") return getNumericRawMetric(session, "phonation_duration_sec");
  if (key === "avg_loudness") return getNumericRawMetric(session, "avg_loudness_db");
  return null;
}

function formatMetricValue(session: AnalysisSession, key: MetricKey) {
  if (key === "peak_note") return session.peak_note ?? "—";
  const n = metricNumberValue(session, key);
  if (n == null) return "—";
  if (key === "phonation_duration") return `${n}秒`;
  if (key === "avg_loudness") return `${n.toFixed(1)}dB`;
  return `${Math.round(n)}`;
}

function isDiffMetric(key: MetricKey) {
  return key !== "peak_note";
}

function formatMetricDiff(curr: AnalysisSession, prev: AnalysisSession, key: MetricKey) {
  const c = metricNumberValue(curr, key);
  const p = metricNumberValue(prev, key);
  if (c == null || p == null) return "—";
  const diff = c - p;
  if (Math.abs(diff) < 0.0001) return "±0";
  if (key === "phonation_duration") {
    return `${diff > 0 ? "+" : ""}${diff.toFixed(1)}秒`;
  }
  if (key === "avg_loudness") {
    return `${diff > 0 ? "+" : ""}${diff.toFixed(1)}dB`;
  }
  return `${diff > 0 ? "+" : ""}${Math.round(diff)}`;
}

function scaleTypeLabel(scaleType: ScaleType) {
  return scaleType === "5tone" ? "5 tone" : "octave";
}

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}

function clampScore(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function useStateRef<T>(initial: T) {
  const [ref] = useState(() => ({ current: initial }));
  return ref;
}

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

function stdDev(values: number[]) {
  if (values.length === 0) return 0;
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function pickRecorderMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return null;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return null;
}

function extensionFromMimeType(mimeType: string) {
  const v = mimeType.toLowerCase();
  if (v.includes("mp4") || v.includes("m4a")) return ".m4a";
  if (v.includes("mpeg") || v.includes("mp3")) return ".mp3";
  if (v.includes("ogg")) return ".ogg";
  if (v.includes("wav")) return ".wav";
  return ".webm";
}

function midiToNote(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const note = names[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
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
    const candidate = sessions[i];
    if (!candidate) continue;
    if (compareByScale) {
      const targetScale = compareScale ?? current.recorded_scale_type;
      if (!sameScaleToken(candidate.recorded_scale_type, targetScale)) continue;
    }
    if (compareByTempo) {
      const targetTempo = compareTempo ?? current.recorded_tempo;
      if (candidate.recorded_tempo !== targetTempo) continue;
    }
    return candidate;
  }
  return undefined;
}

function sameScaleToken(a?: string | null, b?: string | null) {
  return normalizeScaleToken(a) === normalizeScaleToken(b);
}

function normalizeScaleToken(v?: string | null) {
  return (v ?? "").toLowerCase().replace(/\s+/g, "");
}

function detectMeasurementKind(systemKey?: string | null) {
  const key = (systemKey ?? "").trim();
  if (!key) return "generic";
  return key;
}
