export type TutorialStage =
  | "log_welcome"
  | "mypage_intro"
  | "mypage_open_mission_modal"
  | "mypage_force_click_measurement"
  | "training_range_intro"
  | "awaiting_range_measurement"
  | "range_measured"
  | "tutorial_completed"
  | "completed";

const TUTORIAL_STAGE_KEY_PREFIX = "koelogs:tutorial_stage:user_";
const VALID_STAGES: TutorialStage[] = [
  "log_welcome",
  "mypage_intro",
  "mypage_open_mission_modal",
  "mypage_force_click_measurement",
  "training_range_intro",
  "awaiting_range_measurement",
  "range_measured",
  "tutorial_completed",
  "completed",
];

function stageKey(userId: number): string {
  return `${TUTORIAL_STAGE_KEY_PREFIX}${userId}`;
}

export function loadTutorialStage(userId: number): TutorialStage | null {
  try {
    const raw = window.localStorage.getItem(stageKey(userId));
    if (!raw) return null;
    if (raw === "mypage_measurement" || raw === "mypage_force_click_measurement") return "training_range_intro";
    return VALID_STAGES.includes(raw as TutorialStage) ? (raw as TutorialStage) : null;
  } catch {
    return null;
  }
}

export function saveTutorialStage(userId: number, stage: TutorialStage): void {
  try {
    window.localStorage.setItem(stageKey(userId), stage);
  } catch {
    // no-op
  }
}

export function resetTutorialStage(userId: number): void {
  try {
    window.localStorage.removeItem(stageKey(userId));
  } catch {
    // no-op
  }
}
