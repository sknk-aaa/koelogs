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
import { createAnalysisMenu, fetchAnalysisMenus, updateAnalysisMenu } from "../api/analysisMenus";
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
type AnalysisPreset = {
  key: "long_tone" | "high_note" | "loudness_control" | "pitch_stability_base";
  name: string;
  description: string;
  target: string;
  howToUse: string;
  readPoint: string;
  focusPoints: string;
  compareByScale: boolean;
  fixedScaleType: string | null;
  compareByTempo: boolean;
  fixedTempo: number | null;
  selectedMetrics: MetricKey[];
};

const ANALYSIS_PRESETS: AnalysisPreset[] = [
  {
    key: "long_tone",
    name: "ロングトーン安定",
    description: "息のコントロールと持続を確認するプリセットです。",
    target: "ロングトーンの最後で音程や音量が崩れやすいと感じるとき",
    howToUse: "同じ母音で一定の強さを保ちながら、できるだけ一定の長さで発声します。",
    readPoint: "発声時間の伸びと、音量安定・ピッチ安定度をセットで確認してください。",
    focusPoints: "一定音量・一定音程で、最後まで息の支えを保つ",
    compareByScale: true,
    fixedScaleType: "5tone",
    compareByTempo: true,
    fixedTempo: 100,
    selectedMetrics: ["phonation_duration", "volume_stability", "pitch_stability"],
  },
  {
    key: "high_note",
    name: "高音チャレンジ",
    description: "高音到達と、高音域での精度を確認するプリセットです。",
    target: "高音の到達点を更新したい、または高音域の当たりを安定させたいとき",
    howToUse: "喉で押し上げず、無理のない範囲で段階的に高音へアプローチします。",
    readPoint: "最高音だけでなく、音程精度とピッチ安定度が維持できているかを確認してください。",
    focusPoints: "無理に押し上げず、声が細くならない範囲で最高音を更新する",
    compareByScale: true,
    fixedScaleType: "octave",
    compareByTempo: true,
    fixedTempo: 100,
    selectedMetrics: ["peak_note", "pitch_accuracy", "pitch_stability"],
  },
  {
    key: "loudness_control",
    name: "声量コントロール",
    description: "声量の平均とバラつきを確認するプリセットです。",
    target: "声量を上げても声が暴れない状態を作りたいとき",
    howToUse: "一定のフレーズで、声量を落としすぎず安定して発声します。",
    readPoint: "平均音量と音量安定を同時に見て、声量と安定性のバランスを確認してください。",
    focusPoints: "声量を上げても音量の波を抑え、一定の鳴りを保つ",
    compareByScale: true,
    fixedScaleType: "5tone",
    compareByTempo: true,
    fixedTempo: 100,
    selectedMetrics: ["avg_loudness", "volume_stability", "pitch_stability"],
  },
  {
    key: "pitch_stability_base",
    name: "音程安定ベース",
    description: "5tone など通常の練習の中で、音程のブレ・狙い音への一致・音量の乱れを総合的に確認するプリセットです。",
    target: "普段の練習全体の安定度を定点観測したいとき",
    howToUse: "毎回ほぼ同じテンポ・同じ姿勢で録音し、継続的に比較できる状態を作ります。",
    readPoint: "単発の上下よりも、複数回の推移で改善傾向を見るのがおすすめです。",
    focusPoints: "音程の揺れを抑え、狙った音を安定して再現する",
    compareByScale: false,
    fixedScaleType: null,
    compareByTempo: false,
    fixedTempo: null,
    selectedMetrics: ["pitch_stability", "pitch_accuracy", "volume_stability"],
  },
];

const ANALYSIS_PRESET_LIST_OPEN_STORAGE_KEY = "training_page.analysis_preset_list_open";
const ANALYSIS_MANAGE_SECTION_OPEN_STORAGE_KEY = "training_page.analysis_manage_section_open";

export default function TrainingPage() {
  const navigate = useNavigate();
  const { tracks, loading, error } = useScaleTracks();
  const { settings } = useSettings();
  const { me, isLoading: authLoading } = useAuth();

  const [scaleType, setScaleType] = useState<ScaleType>("5tone");
  const [tempo, setTempo] = useState<Tempo>(120);
  const [analysisMenus, setAnalysisMenus] = useState<AnalysisMenu[]>([]);
  const [analysisName, setAnalysisName] = useState("");
  const [analysisFocus, setAnalysisFocus] = useState("");
  const [analysisCompareByScale, setAnalysisCompareByScale] = useState(false);
  const [analysisCompareByTempo, setAnalysisCompareByTempo] = useState(false);
  const [analysisScaleText, setAnalysisScaleText] = useState("");
  const [analysisTempoText, setAnalysisTempoText] = useState("");
  const [analysisSelectedMetrics, setAnalysisSelectedMetrics] = useState<MetricKey[]>(DEFAULT_SELECTED_METRICS);
  const [analysisDetailEnabled, setAnalysisDetailEnabled] = useState(false);
  const [activeAnalysisMenuId, setActiveAnalysisMenuId] = useState<number | null>(null);
  const [editingAnalysisMenuId, setEditingAnalysisMenuId] = useState<number | null>(null);
  const [editingAnalysisName, setEditingAnalysisName] = useState("");
  const [editingAnalysisFocus, setEditingAnalysisFocus] = useState("");
  const [editingAnalysisCompareByScale, setEditingAnalysisCompareByScale] = useState(false);
  const [editingAnalysisCompareByTempo, setEditingAnalysisCompareByTempo] = useState(false);
  const [editingAnalysisScaleText, setEditingAnalysisScaleText] = useState("");
  const [editingAnalysisTempoText, setEditingAnalysisTempoText] = useState("");
  const [editingAnalysisSelectedMetrics, setEditingAnalysisSelectedMetrics] = useState<MetricKey[]>(DEFAULT_SELECTED_METRICS);
  const [editingAnalysisDetailEnabled, setEditingAnalysisDetailEnabled] = useState(false);
  const [analysisMetricInfoOpen, setAnalysisMetricInfoOpen] = useState(false);
  const [analysisPresetInfoOpen, setAnalysisPresetInfoOpen] = useState(false);
  const [analysisPresetListOpen, setAnalysisPresetListOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(ANALYSIS_PRESET_LIST_OPEN_STORAGE_KEY);
    if (saved === "0") return false;
    return true;
  });
  const [analysisManageSectionOpen, setAnalysisManageSectionOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(ANALYSIS_MANAGE_SECTION_OPEN_STORAGE_KEY);
    if (saved === "0") return false;
    return true;
  });
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSaving, setAnalysisSaving] = useState(false);
  const [analysisSessionSaving, setAnalysisSessionSaving] = useState(false);
  const [analysisFileAnalyzing, setAnalysisFileAnalyzing] = useState(false);
  const [analysisUseTrainingTrack, setAnalysisUseTrainingTrack] = useState(false);
  const [analysisSaveRecordingAudio, setAnalysisSaveRecordingAudio] = useState(false);
  const [analysisSessions, setAnalysisSessions] = useState<AnalysisSession[]>([]);
  const [analysisRecording, setAnalysisRecording] = useState(false);
  const [analysisCurrentNote, setAnalysisCurrentNote] = useState<string | null>(null);
  const [analysisLastResult, setAnalysisLastResult] = useState<AnalysisSession | null>(null);
  const [manageMenuListOpen, setManageMenuListOpen] = useState(false);

  const analysisAudioContextRef = useStateRef<AudioContext | null>(null);
  const analysisAnalyserRef = useStateRef<AnalyserNode | null>(null);
  const analysisMediaStreamRef = useStateRef<MediaStream | null>(null);
  const analysisSourceRef = useStateRef<MediaStreamAudioSourceNode | null>(null);
  const analysisRafRef = useStateRef<number | null>(null);
  const analysisStartedAtRef = useStateRef<number>(0);
  const analysisMidiSamplesRef = useStateRef<number[]>([]);
  const analysisLoudnessSamplesRef = useStateRef<number[]>([]);
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
  const menuCompareScale = activeAnalysisMenu?.fixed_scale_type ?? null;
  const menuCompareTempo = activeAnalysisMenu?.fixed_tempo ?? null;
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
        const menus = await fetchAnalysisMenus(false);
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

  const onCreateAnalysisMenu = async () => {
    if (!analysisName.trim()) return;
    setAnalysisSaving(true);
    setAnalysisError(null);
    try {
      const created = await createAnalysisMenu({
        name: analysisName.trim(),
        focus_points: analysisFocus.trim() || null,
        compare_by_scale: analysisCompareByScale,
        compare_by_tempo: analysisCompareByTempo,
        fixed_scale_type: analysisCompareByScale ? toScaleOrNull(analysisScaleText) : null,
        fixed_tempo: analysisCompareByTempo ? toTempoOrNull(analysisTempoText) : null,
        selected_metrics: analysisDetailEnabled ? analysisSelectedMetrics : DEFAULT_SELECTED_METRICS,
      });
      setAnalysisMenus((prev) => [...prev, created]);
      setActiveAnalysisMenuId(created.id);
      setAnalysisName("");
      setAnalysisFocus("");
      setAnalysisCompareByScale(false);
      setAnalysisCompareByTempo(false);
      setAnalysisScaleText("");
      setAnalysisTempoText("");
      setAnalysisSelectedMetrics(DEFAULT_SELECTED_METRICS);
      setAnalysisDetailEnabled(false);
    } catch (e) {
      setAnalysisError(errorMessage(e, "分析メニューの保存に失敗しました"));
    } finally {
      setAnalysisSaving(false);
    }
  };

  const onCreatePresetMenu = async (preset: AnalysisPreset) => {
    setAnalysisSaving(true);
    setAnalysisError(null);
    try {
      const created = await createAnalysisMenu({
        name: preset.name,
        focus_points: preset.focusPoints,
        compare_by_scale: preset.compareByScale,
        compare_by_tempo: preset.compareByTempo,
        fixed_scale_type: preset.fixedScaleType,
        fixed_tempo: preset.fixedTempo,
        selected_metrics: preset.selectedMetrics,
      });
      setAnalysisMenus((prev) => {
        const replaced = prev.some((m) => m.id === created.id);
        return replaced ? prev.map((m) => (m.id === created.id ? created : m)) : [...prev, created];
      });
      setActiveAnalysisMenuId(created.id);
    } catch (e) {
      setAnalysisError(errorMessage(e, "プリセットメニューの保存に失敗しました"));
    } finally {
      setAnalysisSaving(false);
    }
  };

  const onArchiveAnalysisMenu = async (menu: AnalysisMenu) => {
    setAnalysisError(null);
    try {
      await updateAnalysisMenu(menu.id, { archived: true });
      setAnalysisMenus((prev) => {
        const next = prev.filter((m) => m.id !== menu.id);
        if (activeAnalysisMenuId === menu.id) {
          setActiveAnalysisMenuId(next[0]?.id ?? null);
        }
        return next;
      });
    } catch (e) {
      setAnalysisError(errorMessage(e, "分析メニューの削除に失敗しました"));
    }
  };

  const startEditAnalysisMenu = (menu: AnalysisMenu) => {
    setEditingAnalysisMenuId(menu.id);
    setEditingAnalysisName(menu.name);
    setEditingAnalysisFocus(menu.focus_points ?? "");
    setEditingAnalysisCompareByScale(Boolean(menu.compare_by_scale));
    setEditingAnalysisCompareByTempo(Boolean(menu.compare_by_tempo));
    setEditingAnalysisScaleText(menu.fixed_scale_type ?? "");
    setEditingAnalysisTempoText(menu.fixed_tempo ? String(menu.fixed_tempo) : "");
    const selected = normalizeMetricSelection(menu.selected_metrics);
    setEditingAnalysisSelectedMetrics(selected);
    setEditingAnalysisDetailEnabled(
      !isDefaultMetricSelection(selected) || Boolean(menu.compare_by_scale) || Boolean(menu.compare_by_tempo)
    );
  };

  const cancelEditAnalysisMenu = () => {
    setEditingAnalysisMenuId(null);
    setEditingAnalysisName("");
    setEditingAnalysisFocus("");
    setEditingAnalysisCompareByScale(false);
    setEditingAnalysisCompareByTempo(false);
    setEditingAnalysisScaleText("");
    setEditingAnalysisTempoText("");
    setEditingAnalysisSelectedMetrics(DEFAULT_SELECTED_METRICS);
    setEditingAnalysisDetailEnabled(false);
  };

  const saveEditAnalysisMenu = async (menu: AnalysisMenu) => {
    if (!editingAnalysisName.trim()) {
      setAnalysisError("メニュー名は必須です");
      return;
    }
    setAnalysisError(null);
    try {
      const updated = await updateAnalysisMenu(menu.id, {
        name: editingAnalysisName.trim(),
        focus_points: editingAnalysisFocus.trim() || null,
        compare_by_scale: editingAnalysisCompareByScale,
        compare_by_tempo: editingAnalysisCompareByTempo,
        fixed_scale_type: editingAnalysisCompareByScale ? toScaleOrNull(editingAnalysisScaleText) : null,
        fixed_tempo: editingAnalysisCompareByTempo ? toTempoOrNull(editingAnalysisTempoText) : null,
        selected_metrics: editingAnalysisDetailEnabled ? editingAnalysisSelectedMetrics : DEFAULT_SELECTED_METRICS,
      });
      setAnalysisMenus((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      cancelEditAnalysisMenu();
    } catch (e) {
      setAnalysisError(errorMessage(e, "分析メニューの更新に失敗しました"));
    }
  };

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
    if (activeAnalysisMenu?.compare_by_scale && menuCompareScale) {
      const ok = matchesScaleCondition(menuCompareScale, scaleType);
      if (!ok) {
        setAnalysisError(`このメニューの比較スケールは「${menuCompareScale}」です。現在のスケールを合わせてください。`);
        return;
      }
    }
    if (activeAnalysisMenu?.compare_by_tempo && menuCompareTempo && tempo !== menuCompareTempo) {
      setAnalysisError(`このメニューの比較テンポは ${menuCompareTempo} bpm です。現在のテンポを合わせてください。`);
      return;
    }
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
    const elapsedSec = Math.max(1, Math.round((performance.now() - analysisStartedAtRef.current) / 1000));
    const created = await saveAnalysisSessionFromMetrics({
      mids,
      loudnessDbSamples,
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
        loudnessDbSamples.push(frameDb);
      }

      await saveAnalysisSessionFromMetrics({
        mids,
        loudnessDbSamples,
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
    elapsedSec,
    voicedFrames,
    frames,
    rawMetricsExtra,
  }: {
    mids: number[];
    loudnessDbSamples: number[];
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
    const pitchStability = mids.length ? clampScore(100 - std * 22) : 0;
    const centsFromSemitone = mids.length
      ? mids.map((m) => Math.abs(m - Math.round(m)) * 100)
      : [];
    const meanCentsError = centsFromSemitone.length
      ? centsFromSemitone.reduce((acc, v) => acc + v, 0) / centsFromSemitone.length
      : 100;
    const pitchAccuracy = clampScore(100 - meanCentsError);

    const loudnessStd = loudnessDbSamples.length ? stdDev(loudnessDbSamples) : 99;
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
        duration_sec: elapsedSec,
        peak_note: usePeakNote ? peakNote : null,
        pitch_stability_score: usePitchStability ? pitchStability : null,
        voice_consistency_score: null,
        range_semitones: null,
        recorded_scale_type: activeAnalysisMenu?.compare_by_scale && menuCompareScale ? menuCompareScale : scaleType,
        recorded_tempo: tempo,
        raw_metrics: {
          samples: mids.length,
          voiced_ratio: Number(voicedRatio.toFixed(3)),
          std_semitones: Number(std.toFixed(3)),
          pitch_accuracy_score: usePitchAccuracy ? pitchAccuracy : null,
          volume_stability_score: useVolumeStability ? volumeStability : null,
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
    activeAnalysisMenu?.fixed_scale_type ?? null,
    activeAnalysisMenu?.fixed_tempo ?? null
  );

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
            ログインすると、分析用メニュー（メニュー名 / 意識すること）を保存して継続利用できます。
          </div>
        ) : (
          <>
            <section className="trainingPage__analysisStep trainingPage__analysisStep--manage">
              <div className="trainingPage__analysisStepHead">
                <div className="trainingPage__analysisStepBadge">1</div>
                <div className="trainingPage__analysisStepHeadText">
                  <div className="trainingPage__analysisStepTitle">メニュー追加・編集</div>
                  <div className="trainingPage__analysisStepDesc">分析の基準となるメニューを作成します。</div>
                </div>
                <button
                  type="button"
                  className="trainingPage__analysisMiniBtn trainingPage__analysisMiniBtn--ghost trainingPage__analysisStepToggleBtn"
                  onClick={() =>
                    setAnalysisManageSectionOpen((prev) => {
                      const next = !prev;
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem(ANALYSIS_MANAGE_SECTION_OPEN_STORAGE_KEY, next ? "1" : "0");
                      }
                      return next;
                    })
                  }
                >
                  {analysisManageSectionOpen ? "閉じる" : "開く"}
                </button>
              </div>

              {analysisManageSectionOpen && (
              <>
              <div className="trainingPage__analysisForm">
              <div className="trainingPage__analysisPresetBox">
                <div className="trainingPage__analysisRuleHead">
                  <div className="trainingPage__analysisRuleTitle">おすすめプリセット</div>
                  <div className="trainingPage__analysisPresetActions">
                    <button
                      type="button"
                      className="trainingPage__analysisMiniBtn trainingPage__analysisMiniBtn--ghost"
                      onClick={() =>
                        setAnalysisPresetListOpen((prev) => {
                          const next = !prev;
                          if (typeof window !== "undefined") {
                            window.localStorage.setItem(ANALYSIS_PRESET_LIST_OPEN_STORAGE_KEY, next ? "1" : "0");
                          }
                          return next;
                        })
                      }
                    >
                      {analysisPresetListOpen ? "閉じる" : "開く"}
                    </button>
                    <button
                      type="button"
                      className="trainingPage__analysisMiniBtn trainingPage__analysisMiniBtn--ghost"
                      onClick={() => setAnalysisPresetInfoOpen(true)}
                    >
                      プリセット説明
                    </button>
                  </div>
                </div>
                {analysisPresetListOpen && (
                  <div className="trainingPage__analysisPresetGrid">
                    {ANALYSIS_PRESETS.map((preset) => (
                      <div key={preset.key} className="trainingPage__analysisPresetItem">
                        <div className="trainingPage__analysisPresetName">{preset.name}</div>
                        <div className="trainingPage__analysisPresetDesc">{preset.description}</div>
                        <div className="trainingPage__analysisPresetMeta">
                          判定項目: {preset.selectedMetrics.map((key) => metricLabel(key)).join(" / ")}
                        </div>
                        <button
                          type="button"
                          className="trainingPage__analysisMiniBtn"
                          disabled={analysisSaving}
                          onClick={() => void onCreatePresetMenu(preset)}
                        >
                          {analysisSaving ? (
                            <span className="trainingPage__busyInline">
                              保存中…
                              <MetronomeLoader compact label="" className="trainingPage__busyLoader" />
                            </span>
                          ) : (
                            "このプリセットを保存"
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="trainingPage__field">
                <label className="trainingPage__label" htmlFor="analysis-menu-name">メニュー名</label>
                <input
                  id="analysis-menu-name"
                  value={analysisName}
                  onChange={(e) => setAnalysisName(e.target.value)}
                  placeholder="例: Nay 5tone"
                  className="trainingPage__input"
                />
              </div>

              <div className="trainingPage__field">
                <label className="trainingPage__label" htmlFor="analysis-menu-focus">意識すること</label>
                <textarea
                  id="analysis-menu-focus"
                  value={analysisFocus}
                  onChange={(e) => setAnalysisFocus(e.target.value)}
                  placeholder="例: 音量を一定にし、低音から高音まで滑らかにつなぐ"
                  rows={3}
                  className="trainingPage__textarea"
                />
              </div>

              <div className="trainingPage__analysisDetail">
                <div className="trainingPage__analysisRuleBox">
                  <label className="trainingPage__analysisModeToggle">
                    <input
                      type="checkbox"
                      checked={analysisDetailEnabled}
                      onChange={(e) => setAnalysisDetailEnabled(e.target.checked)}
                    />
                    詳細設定
                  </label>
                  {analysisDetailEnabled && (
                    <>
                      <div className="trainingPage__analysisRuleTitle">比較条件</div>
                      <label className="trainingPage__analysisModeToggle">
                        <input
                          type="checkbox"
                          checked={analysisCompareByScale}
                          onChange={(e) => {
                            setAnalysisCompareByScale(e.target.checked);
                            if (!e.target.checked) setAnalysisScaleText("");
                          }}
                        />
                        スケールを比較条件として記録する
                      </label>
                      {analysisCompareByScale && (
                        <input
                          className="trainingPage__input"
                          placeholder="比較スケールを入力（例: 5tone）"
                          value={analysisScaleText}
                          onChange={(e) => setAnalysisScaleText(e.target.value)}
                        />
                      )}
                      <label className="trainingPage__analysisModeToggle">
                        <input
                          type="checkbox"
                          checked={analysisCompareByTempo}
                          onChange={(e) => {
                            setAnalysisCompareByTempo(e.target.checked);
                            if (!e.target.checked) setAnalysisTempoText("");
                          }}
                        />
                        テンポを比較条件として記録する
                      </label>
                      {analysisCompareByTempo && (
                        <input
                          className="trainingPage__input"
                          placeholder="比較テンポを入力（例: 138）"
                          value={analysisTempoText}
                          onChange={(e) => setAnalysisTempoText(e.target.value)}
                          inputMode="numeric"
                        />
                      )}
                      <div className="trainingPage__analysisRuleHead">
                        <div className="trainingPage__analysisRuleTitle">判定項目</div>
                        <button
                          type="button"
                          className="trainingPage__analysisMiniBtn trainingPage__analysisMiniBtn--ghost"
                          onClick={() => setAnalysisMetricInfoOpen(true)}
                        >
                          項目について
                        </button>
                      </div>
                      <div className="trainingPage__analysisMetricGrid">
                        {METRIC_OPTIONS.map((opt) => (
                          <label key={opt.key} className="trainingPage__analysisModeToggle">
                            <input
                              type="checkbox"
                              checked={analysisSelectedMetrics.includes(opt.key)}
                              onChange={() =>
                                setAnalysisSelectedMetrics((prev) => toggleMetricSelection(prev, opt.key))
                              }
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="trainingPage__analysisActions">
                <button
                  type="button"
                  className="trainingPage__saveBtn"
                  disabled={!analysisName.trim() || analysisSaving}
                  onClick={() => void onCreateAnalysisMenu()}
                >
                  {analysisSaving ? (
                    <span className="trainingPage__busyInline">
                      保存中…
                      <MetronomeLoader compact label="" className="trainingPage__busyLoader" />
                    </span>
                  ) : (
                    "保存"
                  )}
                </button>
              </div>
              </div>

              <div className="trainingPage__analysisRuleBox">
                <div className="trainingPage__analysisRuleHead">
                  <div className="trainingPage__analysisRuleTitle">保存済みメニュー一覧（編集）</div>
                  <button
                    type="button"
                    className="trainingPage__analysisMiniBtn trainingPage__analysisMiniBtn--ghost"
                    onClick={() => setManageMenuListOpen((prev) => !prev)}
                  >
                    {manageMenuListOpen ? "閉じる" : "開く"}
                  </button>
                </div>
                {manageMenuListOpen && (
                  <div className="trainingPage__analysisList">
                    {analysisMenus.map((menu) => {
                      const isEditing = editingAnalysisMenuId === menu.id;
                      const isActive = activeAnalysisMenuId === menu.id;
                      return (
                        <div key={menu.id} className={`trainingPage__analysisItem ${isActive ? "is-active" : ""}`}>
                          {isEditing ? (
                            <div className="trainingPage__analysisEdit">
                              <input
                                value={editingAnalysisName}
                                onChange={(e) => setEditingAnalysisName(e.target.value)}
                                className="trainingPage__input"
                                placeholder="メニュー名"
                              />
                              <textarea
                                value={editingAnalysisFocus}
                                onChange={(e) => setEditingAnalysisFocus(e.target.value)}
                                rows={3}
                                className="trainingPage__textarea"
                                placeholder="意識すること"
                              />
                              <div className="trainingPage__analysisDetail">
                                <div className="trainingPage__analysisRuleBox">
                                  <label className="trainingPage__analysisModeToggle">
                                    <input
                                      type="checkbox"
                                      checked={editingAnalysisDetailEnabled}
                                      onChange={(e) => setEditingAnalysisDetailEnabled(e.target.checked)}
                                    />
                                    詳細設定
                                  </label>
                                  {editingAnalysisDetailEnabled && (
                                    <>
                                      <div className="trainingPage__analysisRuleTitle">比較条件</div>
                                      <label className="trainingPage__analysisModeToggle">
                                        <input
                                          type="checkbox"
                                          checked={editingAnalysisCompareByScale}
                                          onChange={(e) => {
                                            setEditingAnalysisCompareByScale(e.target.checked);
                                            if (!e.target.checked) setEditingAnalysisScaleText("");
                                          }}
                                        />
                                        スケールを比較条件として記録する
                                      </label>
                                      {editingAnalysisCompareByScale && (
                                        <input
                                          className="trainingPage__input"
                                          placeholder="比較スケールを入力（例: 5tone）"
                                          value={editingAnalysisScaleText}
                                          onChange={(e) => setEditingAnalysisScaleText(e.target.value)}
                                        />
                                      )}
                                      <label className="trainingPage__analysisModeToggle">
                                        <input
                                          type="checkbox"
                                          checked={editingAnalysisCompareByTempo}
                                          onChange={(e) => {
                                            setEditingAnalysisCompareByTempo(e.target.checked);
                                            if (!e.target.checked) setEditingAnalysisTempoText("");
                                          }}
                                        />
                                        テンポを比較条件として記録する
                                      </label>
                                      {editingAnalysisCompareByTempo && (
                                        <input
                                          className="trainingPage__input"
                                          placeholder="比較テンポを入力（例: 138）"
                                          value={editingAnalysisTempoText}
                                          onChange={(e) => setEditingAnalysisTempoText(e.target.value)}
                                          inputMode="numeric"
                                        />
                                      )}
                                      <div className="trainingPage__analysisRuleHead">
                                        <div className="trainingPage__analysisRuleTitle">判定項目</div>
                                        <button
                                          type="button"
                                          className="trainingPage__analysisMiniBtn trainingPage__analysisMiniBtn--ghost"
                                          onClick={() => setAnalysisMetricInfoOpen(true)}
                                        >
                                          項目について
                                        </button>
                                      </div>
                                      <div className="trainingPage__analysisMetricGrid">
                                        {METRIC_OPTIONS.map((opt) => (
                                          <label key={opt.key} className="trainingPage__analysisModeToggle">
                                            <input
                                              type="checkbox"
                                              checked={editingAnalysisSelectedMetrics.includes(opt.key)}
                                              onChange={() =>
                                                setEditingAnalysisSelectedMetrics((prev) => toggleMetricSelection(prev, opt.key))
                                              }
                                            />
                                            {opt.label}
                                          </label>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="trainingPage__analysisActions trainingPage__analysisActions--between">
                                <button type="button" className="trainingPage__analysisMiniBtn" onClick={() => void saveEditAnalysisMenu(menu)}>
                                  更新
                                </button>
                                <button type="button" className="trainingPage__analysisMiniBtn trainingPage__analysisMiniBtn--ghost" onClick={cancelEditAnalysisMenu}>
                                  キャンセル
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="trainingPage__analysisName">{menu.name}</div>
                              <div className="trainingPage__analysisFocus">{menu.focus_points || "意識ポイント未設定"}</div>
                              <div className="trainingPage__analysisFixed">
                                判定項目: {metricLabels(menu.selected_metrics).join(" / ")}
                              </div>
                              {(menu.compare_by_scale || menu.compare_by_tempo) && (
                                <div className="trainingPage__analysisFixed">
                                  比較条件:
                                  {menu.compare_by_scale ? ` スケール${menu.fixed_scale_type ? `(${menu.fixed_scale_type})` : ""}` : ""}
                                  {menu.compare_by_tempo ? ` テンポ${menu.fixed_tempo ? `(${menu.fixed_tempo}bpm)` : ""}` : ""}
                                </div>
                              )}
                              <div className="trainingPage__analysisActions trainingPage__analysisActions--between">
                                {isActive && <span className="trainingPage__analysisSelected">現在選択中</span>}
                                <button
                                  type="button"
                                  className="trainingPage__analysisMiniBtn trainingPage__analysisMiniBtn--ghost"
                                  onClick={() => startEditAnalysisMenu(menu)}
                                >
                                  編集
                                </button>
                                <button
                                  type="button"
                                  className="trainingPage__analysisDelete"
                                  onClick={() => void onArchiveAnalysisMenu(menu)}
                                >
                                  削除
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                    {analysisMenus.length === 0 && <div className="trainingPage__analysisEmpty">まだ保存された分析メニューはありません。</div>}
                  </div>
                )}
              </div>
              </>
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
                  先に「1. メニュー追加・編集」で分析メニューを保存してください。
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
                    <div className="trainingPage__metricInfoItem">
                      <div className="trainingPage__metricInfoLabel">詳細設定で変更できる項目</div>
                      <div className="trainingPage__metricInfoText">
                        1) 比較条件（スケール）: ONにすると、同じスケール条件で履歴比較しやすくなります。
                      </div>
                      <div className="trainingPage__metricInfoText">
                        2) 比較条件（テンポ）: ONにすると、同じテンポ条件で履歴比較しやすくなります。
                      </div>
                      <div className="trainingPage__metricInfoText">
                        3) 判定項目: 目的に合わせて評価する軸を選択できます。迷う場合はデフォルト3項目がおすすめです。
                      </div>
                    </div>
                    {METRIC_OPTIONS.map((opt) => (
                      <div key={opt.key} className="trainingPage__metricInfoItem">
                        <div className="trainingPage__metricInfoLabel">{opt.label}</div>
                        <div className="trainingPage__metricInfoText">{opt.description}</div>
                        <div className="trainingPage__metricInfoText">{opt.detail}</div>
                        <div className="trainingPage__metricInfoText">{opt.caution}</div>
                      </div>
                    ))}
                    <div className="trainingPage__metricInfoItem trainingPage__metricInfoItem--method">
                      <div className="trainingPage__metricInfoLabel">判定方法（点数算出の考え方）</div>
                      <div className="trainingPage__metricInfoText">
                        ・ピッチ安定度: 検出ピッチのばらつき（標準偏差）を使い、ばらつきが小さいほど高得点になります。
                      </div>
                      <div className="trainingPage__metricInfoText">
                        ・音程精度: 半音中心からの平均ズレ（cent）を使い、ズレが小さいほど高得点になります。
                      </div>
                      <div className="trainingPage__metricInfoText">
                        ・音量安定: 発声区間の音量ばらつき（dBの標準偏差）を使い、ばらつきが小さいほど高得点になります。
                      </div>
                      <div className="trainingPage__metricInfoText">
                        ・発声時間: 録音時間のうち、実際に有効発声と判定された時間（秒）を表示します。
                      </div>
                      <div className="trainingPage__metricInfoText">
                        ・最高音: 録音中に検出された最も高い音名を表示します。
                      </div>
                      <div className="trainingPage__metricInfoText">
                        ・発声の大きさ平均: 発声区間の平均音量（dBFS）を表示します。
                      </div>
                      <div className="trainingPage__metricInfoText">
                        ※ マイク感度・距離・部屋の反響で数値は変動します。公平な比較のため、できるだけ同じ環境で録音してください。
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {analysisPresetInfoOpen && (
              <div
                className="trainingPage__modalOverlay"
                role="button"
                tabIndex={0}
                onClick={() => setAnalysisPresetInfoOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setAnalysisPresetInfoOpen(false);
                }}
              >
                <div
                  className="trainingPage__modalCard"
                  role="dialog"
                  aria-modal="true"
                  aria-label="プリセットメニューの説明"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div className="trainingPage__modalHead">
                    <div className="trainingPage__modalTitle">プリセットメニューについて</div>
                    <button
                      type="button"
                      className="trainingPage__analysisMiniBtn trainingPage__analysisMiniBtn--ghost"
                      onClick={() => setAnalysisPresetInfoOpen(false)}
                    >
                      閉じる
                    </button>
                  </div>
                  <div className="trainingPage__modalBody">
                    {ANALYSIS_PRESETS.map((preset) => (
                        <div key={`preset-info-${preset.key}`} className="trainingPage__metricInfoItem">
                        <div className="trainingPage__metricInfoLabel">{preset.name}</div>
                        <div className="trainingPage__metricInfoText">{preset.description}</div>
                        <div className="trainingPage__metricInfoText">向いている目的: {preset.target}</div>
                        <div className="trainingPage__metricInfoText">実施のコツ: {preset.howToUse}</div>
                        <div className="trainingPage__metricInfoText">結果の見方: {preset.readPoint}</div>
                        <div className="trainingPage__metricInfoText">
                          判定項目: {preset.selectedMetrics.map((key) => metricLabel(key)).join(" / ")}
                        </div>
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

function isDefaultMetricSelection(selected: MetricKey[]) {
  if (selected.length !== DEFAULT_SELECTED_METRICS.length) return false;
  return DEFAULT_SELECTED_METRICS.every((key) => selected.includes(key));
}

function toggleMetricSelection(current: MetricKey[], key: MetricKey): MetricKey[] {
  if (current.includes(key)) {
    const next = current.filter((k) => k !== key);
    return next.length > 0 ? next : current;
  }
  return [...current, key];
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

function toTempoOrNull(v: string): number | null {
  const n = Number.parseInt(v.trim(), 10);
  if (!Number.isFinite(n) || Number.isNaN(n) || n <= 0) return null;
  return n;
}

function toScaleOrNull(v: string): string | null {
  const normalized = v.trim();
  return normalized.length > 0 ? normalized : null;
}

function sameScaleToken(a?: string | null, b?: string | null) {
  return normalizeScaleToken(a) === normalizeScaleToken(b);
}

function normalizeScaleToken(v?: string | null) {
  return (v ?? "").toLowerCase().replace(/\s+/g, "");
}

function matchesScaleCondition(expected: string, currentScaleType: ScaleType) {
  const raw = normalizeScaleToken(currentScaleType);
  const label = normalizeScaleToken(scaleTypeLabel(currentScaleType));
  const cond = normalizeScaleToken(expected);
  return cond === raw || cond === label;
}
