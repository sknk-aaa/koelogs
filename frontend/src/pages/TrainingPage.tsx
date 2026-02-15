// frontend/src/pages/TrainingPage.tsx
import { useMemo, useState } from "react";
import type { ScaleTrack, ScaleType, Tempo } from "../api/scaleTracks";
import { SCALE_TYPES, TEMPOS } from "../features/training/constants";
import { useScaleTracks } from "../features/training/hooks/useScaleTracks";
import { useAudioPlayer } from "../features/training/hooks/useAudioPlayer";
import TrackFilters from "../features/training/components/TrackFilters";
import AudioPlayer from "../features/training/components/AudioPlayer";
import { styles } from "../features/training/styles";
import { useSettings } from "../features/settings/useSettings";

export default function TrainingPage() {
  const { tracks, loading, error } = useScaleTracks();
  const { settings } = useSettings();

  const [scaleType, setScaleType] = useState<ScaleType>("5tone");
  const [tempo, setTempo] = useState<Tempo>(120);

  const selected: ScaleTrack | null = useMemo(() => {
    return tracks.find((t) => t.scale_type === scaleType && t.tempo === tempo) ?? null;
  }, [tracks, scaleType, tempo]);

  const { audioRef, isPlaying, togglePlay, onPlay, onPause, onEnded } = useAudioPlayer(
    selected?.id ?? null,
    {
      defaultVolume: settings.defaultVolume,
      loopEnabled: settings.loopEnabled,
    }
  );

  const disabled = loading || !!error || !selected;

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={{ minWidth: 0 }}>
            <h1 style={styles.title}>トレーニング</h1>
            <p style={styles.subtitle}>スケールとテンポを選んで、すぐ再生。</p>
          </div>
        </header>

        <main style={styles.card}>
          <div style={styles.block}>
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

          <div style={styles.divider} />

          <div style={styles.block}>
            {/* AudioPlayerの中で “選択してください/読み込み中/エラー” を見せる */}
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

            {/* API側のエラーはページでも最低限出す（再生以前の問題なので） */}
            {error && <p style={styles.note}>Error: {error}</p>}
          </div>
        </main>
      </div>
    </div>
  );
}
