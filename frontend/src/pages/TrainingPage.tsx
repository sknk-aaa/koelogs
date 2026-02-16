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

import "./TrainingPage.css";

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
    <div style={styles.page} className="TrainingPage">
      <div style={styles.bgGlow} aria-hidden="true" />
      <div style={styles.shell}>
        {/* ✅ ここ：style={styles.header} を完全に削除してCSSに任せる */}
        <header className="TrainingHeader">
          <div style={{ minWidth: 0 }}>
            <div style={styles.kicker}>Training</div>
            <h1 style={styles.title}>発声トレーニング</h1>
          </div>

          {/* ✅ ここ：style={styles.headerRight} も完全に削除 */}
          <div className="TrainingHeaderRight">
          </div>
        </header>

        <main style={styles.card}>
          <section style={styles.section}>
            <div style={styles.sectionHead}>
              <div style={styles.sectionTitle}>選択</div>
              <div style={styles.sectionMeta}>
                <span style={styles.badge}>{scaleTypeLabel(scaleType)}</span>
                <span style={styles.badge}>{tempo} bpm</span>
              </div>
            </div>

            <div style={styles.filtersBox}>
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

            {loading && (
              <div style={styles.skeletonRow} aria-hidden="true">
                <div style={styles.skeleton} />
                <div style={{ ...styles.skeleton, width: "72%" }} />
              </div>
            )}

            {error && (
              <div style={styles.errorBox} role="alert">
                <div style={styles.errorTitle}>読み込みに失敗しました</div>
                <div style={styles.errorText}>Error: {error}</div>
              </div>
            )}
          </section>

          <div style={styles.divider} />

          <section style={styles.section}>
            <div style={styles.sectionHead}>
              <div style={styles.sectionTitle}>プレイヤー</div>
              <div style={styles.sectionMeta}>
                <span style={styles.miniNote}>
                  {selected ? "Ready" : "スケール/テンポを選んでください"}
                </span>
              </div>
            </div>

            <div style={styles.playerShell}>
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
          </section>
        </main>
      </div>
    </div>
  );
}
function scaleTypeLabel(scaleType: ScaleType) {
  return scaleType === "5tone" ? "5 tone" : "octave";
}
