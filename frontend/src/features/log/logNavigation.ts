const LAST_LOG_PATH_KEY = "voice_app_last_log_path";

function isValidLogPath(path: string): boolean {
  return path.startsWith("/log");
}

export function getLastLogPath(): string {
  if (typeof window === "undefined") return "/log";

  try {
    const v = window.localStorage.getItem(LAST_LOG_PATH_KEY);
    if (!v) return "/log";
    return isValidLogPath(v) ? v : "/log";
  } catch {
    return "/log";
  }
}

export function setLastLogPath(path: string): void {
  if (typeof window === "undefined") return;
  if (!isValidLogPath(path)) return;

  try {
    window.localStorage.setItem(LAST_LOG_PATH_KEY, path);
  } catch {
    // no-op
  }
}
