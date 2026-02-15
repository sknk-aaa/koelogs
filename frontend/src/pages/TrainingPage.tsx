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
          <div>
            <h1 style={styles.title}>Scale Player</h1>
            <p style={styles.subtitle}>scale_type と tempo を選んで再生</p>
          </div>
        </header>

        <main style={styles.card}>
          <div style={styles.controls}>
            <TrackFilters
              scaleType={scaleType}
              tempo={tempo}
              scaleTypes={SCALE_TYPES}
              tempos={TEMPOS}
              disabled={loading}
              onChangeScaleType={setScaleType}
              onChangeTempo={setTempo}
            />

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

          <div style={styles.statusArea}>
            {loading && <p style={styles.muted}>読み込み中…</p>}
            {error && <p style={styles.muted}>Error: {error}</p>}
            {!loading && !error && !selected && (
              <p style={styles.muted}>この組み合わせのトラックはありません。</p>
            )}
          </div>
        </main>

        <footer style={styles.footer}>
          <span style={styles.footerText}>© Voice App</span>
        </footer>
      </div>
    </div>
  );
}
