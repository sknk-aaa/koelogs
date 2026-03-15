import { useEffect, useRef, useState } from "react";

const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let initializedGoogleClientId: string | null = null;

type GoogleSignInButtonProps = {
  text: "signin_with" | "signup_with";
  onCredential: (credential: string) => Promise<void> | void;
  disabled?: boolean;
  interactionBlocked?: boolean;
  onBlockedClick?: () => void;
};

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Identity script failed")), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Identity script failed"));
    document.head.appendChild(script);
  });
}

export default function GoogleSignInButton({
  text,
  onCredential,
  disabled = false,
  interactionBlocked = false,
  onBlockedClick,
}: GoogleSignInButtonProps) {
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onCredential);
  const [isReady, setIsReady] = useState(false);

  callbackRef.current = onCredential;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    loadGoogleIdentityScript()
      .then(() => {
        if (!cancelled) setIsReady(true);
      })
      .catch(() => {
        if (!cancelled) setIsReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !isReady || !containerRef.current || !window.google?.accounts?.id) return;

    const container = containerRef.current;
    container.innerHTML = "";
    const availableWidth = Math.floor(container.clientWidth);
    const buttonWidth = Math.min(availableWidth, 400);

    if (initializedGoogleClientId !== clientId) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (!response.credential || disabled || interactionBlocked) return;
          await callbackRef.current(response.credential);
        },
      });
      initializedGoogleClientId = clientId;
    }

    window.google.accounts.id.renderButton(container, {
      theme: "outline",
      size: "large",
      text,
      shape: "pill",
      width: buttonWidth,
      logo_alignment: "center",
    });
  }, [clientId, disabled, interactionBlocked, isReady, text]);

  if (!clientId) return null;

  return (
    <div className="authPage__googleAuth">
      <div className="authPage__divider" aria-hidden="true">
        <span>または</span>
      </div>
      <div
        className="authPage__googleButtonHost"
        aria-disabled={disabled ? "true" : "false"}
        data-interaction-blocked={interactionBlocked ? "true" : "false"}
      >
        <div ref={containerRef} className="authPage__googleButton" />
        {interactionBlocked && !disabled ? (
          <button
            type="button"
            className="authPage__googleButtonOverlay"
            aria-label="利用規約とプライバシーポリシーへの同意が必要です"
            onClick={onBlockedClick}
          />
        ) : null}
      </div>
    </div>
  );
}
