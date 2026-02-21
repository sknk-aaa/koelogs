import { useEffect, useMemo, useState } from "react";

import MetronomeLoader from "./MetronomeLoader";
import "./ProcessingOverlay.css";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  delayMs?: number;
};

export default function ProcessingOverlay({
  open,
  title,
  description,
  delayMs = 500,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), Math.max(0, delayMs));
    return () => window.clearTimeout(timer);
  }, [delayMs, open]);

  const videoSources = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();

    const pushUnique = (value: string | null | undefined) => {
      const v = (value ?? "").trim();
      if (!v || seen.has(v)) return;
      seen.add(v);
      out.push(v);
    };

    const railsOrigin = (import.meta.env.VITE_RAILS_ORIGIN ?? "").trim().replace(/\/+$/, "");
    if (railsOrigin) {
      pushUnique(`${railsOrigin}/Metronome.mp4`);
    }

    const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
    if (apiBase) {
      try {
        const u = new URL(apiBase);
        const basePath = u.pathname.replace(/\/+$/, "").replace(/\/api$/, "");
        const root = `${u.origin}${basePath}`;
        pushUnique(`${root.replace(/\/+$/, "")}/Metronome.mp4`);
      } catch {
        pushUnique(`${apiBase.replace(/\/+$/, "").replace(/\/api$/, "")}/Metronome.mp4`);
      }
    }

    pushUnique("/Metronome.mp4");
    return out;
  }, []);

  const videoSrc = videoSources[srcIndex] ?? "/Metronome.mp4";

  useEffect(() => {
    if (!open) {
      setVideoFailed(false);
      setSrcIndex(0);
    }
  }, [open]);

  if (!visible) return null;

  return (
    <div className="processingOverlay" role="status" aria-live="assertive" aria-label={title}>
      <div className="processingOverlay__backdrop" />
      <div className="processingOverlay__card">
        {!videoFailed ? (
          <video
            className="processingOverlay__video"
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            onEnded={(e) => {
              const el = e.currentTarget;
              el.currentTime = 0;
              void el.play().catch(() => {
                // no-op: browser autoplay policy fallback
              });
            }}
            onError={() => {
              if (srcIndex < videoSources.length - 1) {
                setSrcIndex((i) => i + 1);
              } else {
                setVideoFailed(true);
              }
            }}
          />
        ) : (
          <MetronomeLoader label="" />
        )}
        <div className="processingOverlay__title">{title}</div>
        {description && <div className="processingOverlay__desc">{description}</div>}
      </div>
    </div>
  );
}
