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

  // audioへ反映（正しいeffect）
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
    setCurrent(next);
  };

  return (
    <div style={styles.wrap}>
      {/* src変更で自然にリセット */}
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
          style={{
            ...styles.playBtn,
            ...(isPlaying ? styles.playBtnPlaying : null),
            ...(!canPlay ? styles.playBtnDisabled : null),
          }}
          aria-label={isPlaying ? "pause" : "play"}
        >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <div style={styles.heroMeta}>
          <div style={styles.heroTitle}>{canPlay ? "Ready to sing" : "選択してください"}</div>

          <div style={styles.heroSubRow}>
            <div style={styles.timePill}>
              <span style={styles.timeMono}>{fmt(current)}</span>
              <span style={styles.timeSlash}>/</span>
              <span style={styles.timeMono}>{fmt(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.seekBox}>
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
          Loop
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
  wrap: {
    display: "grid",
    gap: 12,
    minWidth: 0,
  },

  hero: {
    display: "grid",
    gridTemplateColumns: "64px 1fr",
    gap: 14,
    alignItems: "center",
    minWidth: 0,
  },

  playBtn: {
  width: 64,
  height: 64,
  borderRadius: 20,
  border: "1px solid rgba(0,0,0,0.10)",
  background: "linear-gradient(180deg, #2b2b2b, #1e1e1e)",
  color: "#fff",
  boxShadow: "0 12px 28px rgba(0,0,0,0.15)",
  cursor: "pointer",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,       
  lineHeight: 0,     
},
  playBtnPlaying: {
    filter: "brightness(1.02)",
    transform: "translateY(-1px)",
    boxShadow: "0 14px 28px rgba(0,0,0,0.14)",
  },
  playBtnDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
    transform: "none",
    boxShadow: "none",
  },

  heroMeta: { minWidth: 0, display: "grid", gap: 6 },
  heroTitle: {
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: 0.2,
    color: "rgba(0,0,0,0.88)",
  },

  heroSubRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },

  timePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid rgba(0,0,0,0.08)",
    background: "rgba(255,255,255,0.70)",
    boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
  },
  timeMono: {
    fontSize: 12,
    fontWeight: 900,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    opacity: 0.82,
  },
  timeSlash: { opacity: 0.45, fontSize: 12, fontWeight: 900 },

  seekBox: {
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "rgba(255,255,255,0.75)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
    padding: "10px 12px",
  },
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
    gridTemplateColumns: "44px 1fr 52px",
    gap: 10,
    alignItems: "center",
    minWidth: 0,
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "rgba(255,255,255,0.75)",
    padding: "10px 12px",
    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
  },

  ctrlLabel: { fontSize: 12, fontWeight: 900, opacity: 0.75 },
  ctrlValue: { fontSize: 12, fontWeight: 900, opacity: 0.75, textAlign: "right" },

  range: { width: "100%", height: 24 },

  loopBtn: {
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.80)",
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    minHeight: 44,
    whiteSpace: "nowrap",
    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
    transition: "transform 120ms ease, box-shadow 120ms ease",
  },
  loopBtnOn: {
    background: "rgba(0,0,0,0.90)",
    color: "#fff",
    boxShadow: "0 14px 28px rgba(0,0,0,0.12)",
    transform: "translateY(-1px)",
  },
  loopBtnDisabled: { opacity: 0.55, cursor: "not-allowed", boxShadow: "none", transform: "none" },

  hint: { fontSize: 12, opacity: 0.7, lineHeight: 1.6, paddingTop: 2 },
};
