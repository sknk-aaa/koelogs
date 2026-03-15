import { useEffect, useMemo, useRef, useState } from "react";

import MetronomeLoader from "./MetronomeLoader";
import "./ProcessingOverlay.css";

let processingOverlayScrollLockCount = 0;
let prevBodyOverflow = "";
let prevBodyTouchAction = "";
let prevBodyOverscrollBehavior = "";

function lockBodyScroll(): () => void {
  const body = document.body;
  processingOverlayScrollLockCount += 1;

  if (processingOverlayScrollLockCount === 1) {
    prevBodyOverflow = body.style.overflow;
    prevBodyTouchAction = body.style.touchAction;
    prevBodyOverscrollBehavior = body.style.overscrollBehavior;
    body.style.overflow = "hidden";
    body.style.touchAction = "none";
    body.style.overscrollBehavior = "none";
  }

  return () => {
    processingOverlayScrollLockCount = Math.max(0, processingOverlayScrollLockCount - 1);
    if (processingOverlayScrollLockCount === 0) {
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevBodyTouchAction;
      body.style.overscrollBehavior = prevBodyOverscrollBehavior;
    }
  };
}

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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), Math.max(0, delayMs));
    return () => window.clearTimeout(timer);
  }, [delayMs, open]);

  useEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);

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

  useEffect(() => {
    if (!open || videoFailed) return;
    const timer = window.setInterval(() => {
      const el = videoRef.current;
      if (!el) return;
      const duration = Number.isFinite(el.duration) ? el.duration : 0;
      if (duration > 0 && el.currentTime >= duration - 0.03) {
        el.currentTime = 0;
      }
      if (el.paused) {
        void el.play().catch(() => {
          // no-op: autoplay policy fallback
        });
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [open, videoFailed, srcIndex]);

  if (!visible) return null;

  return (
    <div className="processingOverlay" role="status" aria-live="assertive" aria-label={title}>
      <div className="processingOverlay__backdrop" />
      <div className="processingOverlay__card">
        {!videoFailed ? (
          <video
            ref={videoRef}
            className="processingOverlay__video"
            src={videoSrc}
            autoPlay
            loop
            preload="auto"
            muted
            playsInline
            onLoadedData={(e) => {
              const el = e.currentTarget;
              void el.play().catch(() => {
                // no-op: autoplay policy fallback
              });
            }}
            onPause={(e) => {
              if (!open) return;
              const el = e.currentTarget;
              void el.play().catch(() => {
                // no-op: autoplay policy fallback
              });
            }}
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
