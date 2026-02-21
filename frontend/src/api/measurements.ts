const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type MeasurementType = "range" | "long_tone" | "volume_stability";

export type MeasurementRun = {
  id: number;
  measurement_type: MeasurementType;
  recorded_at: string;
  created_at: string;
  result:
    | {
        lowest_note?: string | null;
        highest_note?: string | null;
        range_semitones?: number | null;
        range_octaves?: number | null;
      }
    | {
        sustain_sec?: number | null;
        sustain_note?: string | null;
      }
    | {
        avg_loudness_db?: number | null;
        min_loudness_db?: number | null;
        max_loudness_db?: number | null;
        loudness_range_db?: number | null;
        loudness_range_ratio?: number | null;
        loudness_range_pct?: number | null;
      }
    | null;
};

export async function createMeasurement(input: {
  measurement_type: MeasurementType;
  recorded_at?: string;
  range_result?: {
    lowest_note?: string | null;
    highest_note?: string | null;
    range_semitones?: number | null;
    range_octaves?: number | null;
  };
  long_tone_result?: {
    sustain_sec: number;
    sustain_note?: string | null;
  };
  volume_stability_result?: {
    avg_loudness_db?: number | null;
    min_loudness_db?: number | null;
    max_loudness_db?: number | null;
    loudness_range_db?: number | null;
    loudness_range_ratio?: number | null;
    loudness_range_pct?: number | null;
  };
}): Promise<void> {
  const res = await fetch(`${API_BASE}/api/measurements`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    let message = "Failed to create measurement";
    try {
      const json = (await res.json()) as { errors?: string[] };
      if (Array.isArray(json.errors) && json.errors.length > 0) message = json.errors.join(", ");
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }
}

export async function fetchLatestMeasurements(): Promise<{
  range: MeasurementRun | null;
  long_tone: MeasurementRun | null;
  volume_stability: MeasurementRun | null;
}> {
  const res = await fetch(`${API_BASE}/api/measurements/latest`, {
    credentials: "include",
  });
  const json = (await res.json()) as {
    data?: { range: MeasurementRun | null; long_tone: MeasurementRun | null; volume_stability: MeasurementRun | null };
    error?: string;
  };
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch latest measurements");
  return (
    json.data ?? {
      range: null,
      long_tone: null,
      volume_stability: null,
    }
  );
}

export async function fetchMeasurements(params?: {
  measurement_type?: MeasurementType;
  days?: number;
  limit?: number;
}): Promise<MeasurementRun[]> {
  const qp = new URLSearchParams();
  if (params?.measurement_type) qp.set("measurement_type", params.measurement_type);
  if (typeof params?.days === "number") qp.set("days", String(params.days));
  if (typeof params?.limit === "number") qp.set("limit", String(params.limit));
  const qs = qp.toString();
  const res = await fetch(`${API_BASE}/api/measurements${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  const json = (await res.json()) as { data?: MeasurementRun[]; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch measurements");
  return json.data ?? [];
}
