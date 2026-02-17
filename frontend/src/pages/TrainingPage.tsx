// frontend/src/pages/TrainingPage.tsx
import { useMemo, useState } from "react";
import type { ScaleTrack, ScaleType, Tempo } from "../api/scaleTracks";
import { SCALE_TYPES, TEMPOS } from "../features/training/constants";
import { useScaleTracks } from "../features/training/hooks/useScaleTracks";
import { useAudioPlayer } from "../features/training/hooks/useAudioPlayer";
import TrackFilters from "../features/training/components/TrackFilters";
import AudioPlayer from "../features/training/components/AudioPlayer";
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
    <div className="page trainingPage">
      <div className="trainingPage__bg" aria-hidden="true" />

      <section className="card trainingPage__hero">
        <div>
          <div className="trainingPage__kicker">Training Studio</div>
          <h1 className="trainingPage__title">発声トレーニング</h1>
        </div>
        <div className="trainingPage__chips">
          <span className="trainingPage__chip">{scaleTypeLabel(scaleType)}</span>
          <span className="trainingPage__chip">{tempo} bpm</span>
        </div>
      </section>

      <main className="trainingPage__grid">
        <section className="card trainingPage__panel">
          <div className="trainingPage__panelHead">
            <div className="trainingPage__panelTitle">選択</div>
            <div className="trainingPage__panelMeta">スケール / テンポ</div>
          </div>

          <div className="trainingPage__filtersWrap">
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

        <section className="card trainingPage__panel">
          <div className="trainingPage__panelHead">
            <div className="trainingPage__panelTitle">プレイヤー</div>
          </div>

          <div className="trainingPage__playerWrap">
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
  );
}
function scaleTypeLabel(scaleType: ScaleType) {
  return scaleType === "5tone" ? "5 tone" : "octave";
}
