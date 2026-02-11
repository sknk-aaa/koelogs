import { useEffect, useRef, useState } from "react";

export function useAudioPlayer(selectedId: number | string | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    setIsPlaying(false);
  }, [selectedId]);

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