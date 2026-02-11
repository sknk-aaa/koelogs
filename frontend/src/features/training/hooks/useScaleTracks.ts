import { useEffect, useState } from "react";
import type { ScaleTrack } from "../../../api/scaleTracks";
import { fetchScaleTracks } from "../../../api/scaleTracks";

export function useScaleTracks() {
  const [tracks, setTracks] = useState<ScaleTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchScaleTracks();
        if (mounted) setTracks(data);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, []);

  return { tracks, loading, error };
}