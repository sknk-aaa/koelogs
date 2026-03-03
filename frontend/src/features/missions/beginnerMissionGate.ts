import { fetchMissions } from "../../api/missions";

const FIRST_LOGIN_LANDING_SEEN_KEY_PREFIX = "koelogs:first_login_landing_seen_user_";

export type BeginnerMissionGate = {
  completed: boolean;
  pendingCount: number;
  totalCount: number;
};

export async function fetchBeginnerMissionGate(): Promise<BeginnerMissionGate | null> {
  const res = await fetchMissions();
  if (res.error || !res.data) return null;

  const beginner = res.data.beginner ?? [];
  const pendingCount = beginner.filter((mission) => !mission.done).length;
  return {
    completed: pendingCount === 0,
    pendingCount,
    totalCount: beginner.length,
  };
}

export function hasSeenFirstLoginLanding(userId: number): boolean {
  try {
    return window.localStorage.getItem(`${FIRST_LOGIN_LANDING_SEEN_KEY_PREFIX}${userId}`) === "1";
  } catch {
    return false;
  }
}

export function markFirstLoginLandingSeen(userId: number): void {
  try {
    window.localStorage.setItem(`${FIRST_LOGIN_LANDING_SEEN_KEY_PREFIX}${userId}`, "1");
  } catch {
    // localStorage未使用環境では永続化しない
  }
}
