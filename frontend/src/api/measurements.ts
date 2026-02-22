const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type MeasurementType = "range" | "long_tone" | "volume_stability" | "pitch_accuracy";

export type MeasurementRun = {
  id: number;
  measurement_type: MeasurementType;
  include_in_insights?: boolean;
  recorded_at: string;
  created_at: string;
  result:
      | {
          lowest_note?: string | null;
          highest_note?: string | null;
          chest_top_note?: string | null;
          falsetto_top_note?: string | null;
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
    | {
        avg_cents_error?: number | null;
        accuracy_score?: number | null;
        note_count?: number | null;
      }
    | null;
};

export async function createMeasurement(input: {
  measurement_type: MeasurementType;
  recorded_at?: string;
  include_in_insights?: boolean;
  range_result?: {
    lowest_note?: string | null;
    highest_note?: string | null;
    chest_top_note?: string | null;
    falsetto_top_note?: string | null;
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
  pitch_accuracy_result?: {
    avg_cents_error?: number | null;
    accuracy_score?: number | null;
    note_count?: number | null;
  };
}): Promise<MeasurementRun> {
  const res = await fetch(`${API_BASE}/api/measurements`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const json = (await res.json().catch(() => ({}))) as { data?: MeasurementRun; errors?: string[]; error?: string };
  if (!res.ok) {
    let message = "Failed to create measurement";
    if (Array.isArray(json.errors) && json.errors.length > 0) {
      message = json.errors.join(", ");
    } else if (typeof json.error === "string" && json.error.trim()) {
      message = json.error;
    } else {
      message = `${message} (HTTP ${res.status})`;
    }
    throw new Error(message);
  }
  if (!json.data) throw new Error("Missing measurement data");
  return json.data;
}

export async function fetchLatestMeasurements(): Promise<{
  range: MeasurementRun | null;
  long_tone: MeasurementRun | null;
  volume_stability: MeasurementRun | null;
  pitch_accuracy: MeasurementRun | null;
}> {
  const res = await fetch(`${API_BASE}/api/measurements/latest`, {
    credentials: "include",
  });
  const json = (await res.json()) as {
    data?: {
      range: MeasurementRun | null;
      long_tone: MeasurementRun | null;
      volume_stability: MeasurementRun | null;
      pitch_accuracy: MeasurementRun | null;
    };
    error?: string;
  };
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch latest measurements");
  return (
    json.data ?? {
      range: null,
      long_tone: null,
      volume_stability: null,
      pitch_accuracy: null,
    }
  );
}

export async function fetchMeasurements(params?: {
  measurement_type?: MeasurementType;
  days?: number;
  limit?: number;
  include_in_insights?: boolean;
}): Promise<MeasurementRun[]> {
  const qp = new URLSearchParams();
  if (params?.measurement_type) qp.set("measurement_type", params.measurement_type);
  if (typeof params?.days === "number") qp.set("days", String(params.days));
  if (typeof params?.limit === "number") qp.set("limit", String(params.limit));
  if (typeof params?.include_in_insights === "boolean") qp.set("include_in_insights", String(params.include_in_insights));
  const qs = qp.toString();
  const res = await fetch(`${API_BASE}/api/measurements${qs ? `?${qs}` : ""}`, {
    credentials: "include",
  });
  const json = (await res.json()) as { data?: MeasurementRun[]; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch measurements");
  return json.data ?? [];
}

export async function updateMeasurement(input: { id: number; include_in_insights: boolean }): Promise<MeasurementRun> {
  const res = await fetch(`${API_BASE}/api/measurements/${input.id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ include_in_insights: input.include_in_insights }),
  });
  const json = (await res.json()) as { data?: MeasurementRun; errors?: string[]; error?: string };
  if (!res.ok) {
    const message = (json.errors && json.errors[0]) || json.error || "Failed to update measurement";
    throw new Error(message);
  }
  if (!json.data) throw new Error("Missing measurement data");
  return json.data;
}
