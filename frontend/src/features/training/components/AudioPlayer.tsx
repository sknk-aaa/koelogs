// frontend/src/features/training/components/AudioPlayer.tsx
import type { ScaleRange, ScaleType } from "../../../api/scaleTracks";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import ScalePatternPreview, { scalePatternFromScaleType } from "./ScalePatternPreview";
import SessionPlayerCard from "./SessionPlayerCard";
import AppSelect from "../../../components/AppSelect";
import "./AudioPlayer.css";

type Props = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  src?: string;
  disabled?: boolean;

  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;

  defaultVolume: number; // 0..1
  loopEnabled: boolean;
  scaleType: ScaleType;
  rangeType: ScaleRange;
  scaleTypes: readonly ScaleType[];
  rangeTypes: readonly ScaleRange[];
  onChangeScaleType: (v: ScaleType) => void;
  onChangeRangeType: (v: ScaleRange) => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmt(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function labelScaleCompact(t: ScaleType) {
  if (t === "5tone") return "5tone";
  if (t === "Descending5tone") return "下降5tone";
  if (t === "triad") return "トライアド";
  if (t === "Risingoctave") return "上昇オクターブ";
  return "オクターブ+1";
}

function labelRangeType(r: ScaleRange) {
  if (r === "low") return "低";
  if (r === "mid") return "中";
  return "高";
}

function labelRangeCompact(r: ScaleRange) {
  if (r === "low") return "Low";
  if (r === "mid") return "Mid";
  return "High";
}

const SELECT_LABEL_GAP = "\u2002";

function trainingRangeForType(r: ScaleRange) {
  if (r === "low") return { low: "E3", high: "E4" };
  if (r === "mid") return { low: "G3", high: "G4" };
  return { low: "C4", high: "C5" };
}

export default function AudioPlayer({
  audioRef,
  src,
  disabled = false,
  isPlaying,
  onTogglePlay,
  onPlay,
  onPause,
  onEnded,
  defaultVolume,
  loopEnabled,
  scaleType,
  rangeType,
  scaleTypes,
  rangeTypes,
  onChangeScaleType,
  onChangeRangeType,
}: Props) {
  const [loop, setLoop] = useState<boolean>(() => !!loopEnabled);
  const [duration, setDuration] = useState<number>(0);
  const [current, setCurrent] = useState<number>(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = clamp(defaultVolume ?? 1, 0, 1);
  }, [audioRef, defaultVolume]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.loop = loop;
  }, [audioRef, loop]);

  const progress = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return clamp(current / duration, 0, 1);
  }, [current, duration]);

  const canPlay = !disabled && !!src;
  const rangeGuide = trainingRangeForType(rangeType);

  const handleSeek = (v: number) => {
    const el = audioRef.current;
    if (!el) return;
    const next = clamp(v, 0, 1) * (el.duration || 0);
    el.currentTime = next;
    setCurrent(next);
  };

  return (
    <div className="audioPlayer">
      <div className="audioPlayer__settingsBar">
        <AppSelect
          value={scaleType}
          disabled={disabled}
          onChange={(value) => onChangeScaleType(value as ScaleType)}
          rootClassName="audioPlayer__appSelectRoot"
          buttonClassName="audioPlayer__appSelectButton"
          menuClassName="audioPlayer__appSelectMenu"
          ariaLabel="scale type"
          options={scaleTypes.map((t) => ({ value: t, label: `Scale:${SELECT_LABEL_GAP}${labelScaleCompact(t)}` }))}
        />
        <AppSelect
          value={rangeType}
          disabled={disabled}
          onChange={(value) => onChangeRangeType(value as ScaleRange)}
          rootClassName="audioPlayer__appSelectRoot audioPlayer__appSelectRoot--range"
          buttonClassName="audioPlayer__appSelectButton"
          menuClassName="audioPlayer__appSelectMenu"
          ariaLabel="range type"
          options={rangeTypes.map((r) => ({ value: r, label: `Range:${SELECT_LABEL_GAP}${labelRangeCompact(r)}` }))}
        />
      </div>

      <audio
        key={src ?? "none"}
        ref={audioRef}
        src={src}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          setDuration(el.duration || 0);
          setCurrent(el.currentTime || 0);
        }}
        onDurationChange={(e) => {
          const el = e.currentTarget;
          setDuration(el.duration || 0);
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setCurrent(el.currentTime || 0);
        }}
      />

      <SessionPlayerCard
        active={isPlaying}
        showWave={false}
        className="audioPlayer__sessionCard"
        art={
          <div className="audioPlayer__artPanel audioPlayer__artPanel--preview">
            <div className="audioPlayer__previewScaleLabel">{labelScaleCompact(scaleType)}</div>
            <ScalePatternPreview pattern={scalePatternFromScaleType(scaleType)} size="lg" active={isPlaying} />
          </div>
        }
        title={labelScaleCompact(scaleType)}
        subtitle={<span className="audioPlayer__rangeGuideInline">{labelRangeType(rangeType)}音域目安 {rangeGuide.low} 〜 {rangeGuide.high}</span>}
        description={undefined}
        beforeTransport={
          <div className="audioPlayer__seekRow">
            <span className="audioPlayer__time">{fmt(current)}</span>
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(progress * 1000)}
              onChange={(e) => handleSeek(Number(e.target.value) / 1000)}
              disabled={!canPlay}
              className="audioPlayer__range audioPlayer__range--seek"
              aria-label="seek"
              style={{ "--progress": `${Math.round(progress * 100)}%` } as CSSProperties}
            />
            <span className="audioPlayer__time">{fmt(duration)}</span>
          </div>
        }
        transport={
          <>
            <button
              type="button"
              disabled={!canPlay}
              onClick={onTogglePlay}
              className={`audioPlayer__playBtn trainingPage__saveBtn trainingPage__recordPrimaryInline trainingPage__playerPrimary${
                isPlaying ? " is-playing" : ""
              }`}
              aria-label={isPlaying ? "pause" : "play"}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button
              type="button"
              disabled={!canPlay}
              onClick={() => setLoop((v) => !v)}
              className={`audioPlayer__loopToggle trainingPage__measurementMiniBtn${loop ? " is-on is-active" : ""}`}
              aria-pressed={loop}
              aria-label={loop ? "loop on" : "loop off"}
              title={loop ? "Loop ON" : "Loop OFF"}
            >
              <span className="audioPlayer__loopGlyph" aria-hidden="true">↻</span>
              <span className={`audioPlayer__loopDot${loop ? " is-on" : ""}`} aria-hidden="true" />
            </button>
          </>
        }
      />

      {!src && <div className="audioPlayer__hint">スケール/音域タイプを選ぶと再生できます</div>}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" />
    </svg>
  );
}
