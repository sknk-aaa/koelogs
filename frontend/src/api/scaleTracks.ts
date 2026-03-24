export type ScaleType = "5tone" | "triad" | "Descending5tone" | "octave" | "Risingoctave";
export type ScaleRange = "low" | "mid" | "high";

export type ScaleTrack = {
  id: number;
  scale_type: ScaleType;
  range_type: ScaleRange;
  file_path: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchScaleTracks(): Promise<ScaleTrack[]> {
  const res = await fetch(`${API_BASE}/api/scale_tracks`, {
    credentials: "include", 
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch scale tracks: ${res.status}`);
  }

  return res.json();
}

export function resolveAudioUrl(filePath: string): string {
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const railsOrigin =
    import.meta.env.VITE_RAILS_ORIGIN?.trim() || "http://localhost:3000";

  return new URL(filePath, railsOrigin).toString();
}
