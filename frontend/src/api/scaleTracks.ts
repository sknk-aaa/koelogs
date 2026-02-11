export type ScaleType = "5tone" | "octave";
export type Tempo = 100 | 120 | 140;

export type ScaleTrack = {
  id: number;
  scale_type: ScaleType;
  tempo: Tempo;
  file_path: string; 
};

export async function fetchScaleTracks(): Promise<ScaleTrack[]> {
  const res = await fetch("/api/scale_tracks");
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.json();
}

export function resolveAudioUrl(filePath: string): string {
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const railsOrigin =
    import.meta.env.VITE_RAILS_ORIGIN?.trim() || "http://localhost:3000";

  return new URL(filePath, railsOrigin).toString();
}