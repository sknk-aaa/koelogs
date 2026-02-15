import { useEffect, useRef, useState } from "react";

type AudioPlayerSettings = {
  defaultVolume: number; // 0.0 - 1.0
  loopEnabled: boolean;
};

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function useAudioPlayer(
  selectedId: number | string | null,
  settings: AudioPlayerSettings
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // ✅ Track切り替え時：停止/巻き戻し + 設定（音量/ループ）を適用
  useEffect(() => {
  const a = audioRef.current;
  if (!a) return;

  // track切替の度に初期化（設定も適用）
  a.pause();
  a.currentTime = 0;

  a.volume = clamp01(settings.defaultVolume);
  a.loop = !!settings.loopEnabled;
}, [selectedId, settings.defaultVolume, settings.loopEnabled]);

  // ✅ 設定変更時：再生中でも即反映（ただし毎レンダーではない）
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = clamp01(settings.defaultVolume);
  }, [settings.defaultVolume]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.loop = !!settings.loopEnabled;
  }, [settings.loopEnabled]);

  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;

    if (!a.paused) {
      a.pause();
      return;
    }

    try {
      await a.play();
    } catch {
      // 自動再生制限などは無視（必要ならここでUI通知に変更）
    }
  };

  const onPlay = () => setIsPlaying(true);
  const onPause = () => setIsPlaying(false);
  const onEnded = () => setIsPlaying(false);

  return { audioRef, isPlaying, togglePlay, onPlay, onPause, onEnded };
}
