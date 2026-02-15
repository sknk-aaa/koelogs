import type React from "react";
import { useEffect, useState } from "react";
import { styles } from "../styles";

type Props = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  src?: string;
  disabled: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;

  // ✅ Settings から渡す
  defaultVolume: number; // 0.0 - 1.0
  loopEnabled: boolean;
};

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export default function AudioPlayer({
  audioRef,
  src,
  disabled,
  isPlaying,
  onTogglePlay,
  onPlay,
  onPause,
  onEnded,
  defaultVolume,
  loopEnabled,
}: Props) {
  // ✅ 初期値は設定に合わせる
  const [volume, setVolume] = useState(() => clamp01(defaultVolume));

  // ✅ src（トラック）変わったら「デフォルト音量」に戻す
  useEffect(() => {
    setVolume(clamp01(defaultVolume));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // UIの音量 → audioへ反映
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = clamp01(volume);
  }, [volume, audioRef]);

  // ✅ ループ設定 → audioへ反映（再生中でもOK）
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.loop = !!loopEnabled;
  }, [loopEnabled, audioRef]);

  // src変わったときも音量は維持…ではなく「デフォルトへリセット」に変更したので、ここは不要
  // （上の [src] effect が担当）

  return (
    <div style={styles.audioStack}>
      <button
        type="button"
        style={{ ...styles.button, ...(disabled ? styles.buttonDisabled : null) }}
        disabled={disabled}
        onClick={onTogglePlay}
      >
        {isPlaying ? "⏸ Stop" : "▶ Play"}
      </button>

      {src ? (
        <audio
          ref={audioRef}
          controls
          preload="metadata"
          src={src}
          style={styles.audio}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
        />
      ) : (
        <div style={{ ...styles.audio, opacity: 0.6 }}>音源読み込み中...</div>
      )}

      <div style={styles.volumeRow}>
        <span style={styles.volumeLabel}>🔉</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          disabled={disabled}
          style={styles.volumeSlider}
          aria-label="volume"
        />
        <span style={styles.volumeValue}>{Math.round(volume * 100)}%</span>
      </div>

      <div style={{ fontSize: 12, opacity: 0.65 }}>
        ループ: {loopEnabled ? "ON" : "OFF"} / デフォルト音量: {Math.round(clamp01(defaultVolume) * 100)}%
      </div>
    </div>
  );
}
