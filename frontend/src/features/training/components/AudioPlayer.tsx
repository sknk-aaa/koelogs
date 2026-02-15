// frontend/src/features/training/components/AudioPlayer.tsx
import { useEffect, useMemo, useState } from "react";

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
}: Props) {
  // 初期値としてのみ使用（props->state同期はしない）
  const [volume, setVolume] = useState(() => clamp(defaultVolume ?? 1, 0, 1));
  const [loop, setLoop] = useState<boolean>(() => !!loopEnabled);

  const [duration, setDuration] = useState<number>(0);
  const [current, setCurrent] = useState<number>(0);

  // ✅ 外部システム（audio）へ反映：これは effect の正しい使い方
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = clamp(volume, 0, 1);
  }, [audioRef, volume]);

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

  const handleSeek = (v: number) => {
    const el = audioRef.current;
    if (!el) return;
    const next = clamp(v, 0, 1) * (el.duration || 0);
    el.currentTime = next;
    // ※ onTimeUpdate でも更新されるが、体感レスポンス向上のためここでも更新してOK
    setCurrent(next);
  };

  return (
    <div style={styles.wrap}>
      {/* ✅ keyでsrc変更時にaudioを再マウント → current/durationも自然にリセット */}
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

      <div style={styles.hero}>
        <button
          type="button"
          disabled={!canPlay}
          onClick={onTogglePlay}
          style={{ ...styles.playBtn, ...(!canPlay ? styles.playBtnDisabled : null) }}
          aria-label={isPlaying ? "pause" : "play"}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <div style={styles.heroMeta}>
          <div style={styles.heroTitle}>{canPlay ? "Ready" : "選択してください"}</div>
          <div style={styles.heroSub}>
            {fmt(current)} / {fmt(duration)}
          </div>
        </div>
      </div>

      <div style={styles.seekRow}>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={(e) => handleSeek(Number(e.target.value) / 1000)}
          disabled={!canPlay}
          style={styles.range}
          aria-label="seek"
        />
      </div>

      <div style={styles.bottom}>
        <div style={styles.ctrl}>
          <div style={styles.ctrlLabel}>音量</div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(clamp(Number(e.target.value) / 100, 0, 1))}
            disabled={!canPlay}
            style={styles.range}
            aria-label="volume"
          />
          <div style={styles.ctrlValue}>{Math.round(volume * 100)}%</div>
        </div>

        <button
          type="button"
          disabled={!canPlay}
          onClick={() => setLoop((v) => !v)}
          style={{
            ...styles.loopBtn,
            ...(loop ? styles.loopBtnOn : null),
            ...(!canPlay ? styles.loopBtnDisabled : null),
          }}
          aria-pressed={loop}
        >
          Loop {loop ? "ON" : "OFF"}
        </button>
      </div>

      {!src && <div style={styles.hint}>上でスケール/テンポを選んでください</div>}
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

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "grid", gap: 12, minWidth: 0 },

  hero: {
    display: "grid",
    gridTemplateColumns: "56px 1fr",
    gap: 12,
    alignItems: "center",
    minWidth: 0,
  },

  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(0,0,0,0.08)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
  },
  playBtnDisabled: { opacity: 0.5, cursor: "not-allowed" },

  heroMeta: { minWidth: 0, display: "grid", gap: 2 },
  heroTitle: { fontSize: 14, fontWeight: 900, letterSpacing: 0.2 },
  heroSub: { fontSize: 12, opacity: 0.7, fontWeight: 800 },

  seekRow: { minWidth: 0 },

  bottom: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 10,
    alignItems: "center",
    minWidth: 0,
  },

  ctrl: {
    display: "grid",
    gridTemplateColumns: "44px 1fr 48px",
    gap: 10,
    alignItems: "center",
    minWidth: 0,
  },

  ctrlLabel: { fontSize: 12, fontWeight: 900, opacity: 0.75 },
  ctrlValue: { fontSize: 12, fontWeight: 900, opacity: 0.75, textAlign: "right" },

  range: { width: "100%", height: 24 },

  loopBtn: {
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    minHeight: 40,
    whiteSpace: "nowrap",
  },
  loopBtnOn: { background: "rgba(0,0,0,0.08)" },
  loopBtnDisabled: { opacity: 0.55, cursor: "not-allowed" },

  hint: { fontSize: 12, opacity: 0.65, lineHeight: 1.5, paddingTop: 2 },
};
