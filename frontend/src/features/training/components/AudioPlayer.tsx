import type React from "react";
import { useEffect, useState } from "react";
import { styles } from "../styles";

type Props = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  src: string;
  disabled: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
};

export default function AudioPlayer({
  audioRef,
  src,
  disabled,
  isPlaying,
  onTogglePlay,
  onPlay,
  onPause,
  onEnded,
}: Props) {
  const [volume, setVolume] = useState(0.9);

  // UIの音量→audioへ反映
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume; // 0.0 - 1.0
  }, [volume, audioRef]);

  // src変わったときも音量は維持
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

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
    </div>
  );
}