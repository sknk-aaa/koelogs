export type TutorialStage =
  | "log_welcome"
  | "log_beginner_intro"
  | "log_beginner_unlocks"
  | "log_open_beginner_missions"
  | "mypage_intro"
  | "mypage_open_mission_modal"
  | "mypage_force_click_measurement"
  | "log_training_select_range"
  | "log_training_press_record"
  | "training_range_intro"
  | "awaiting_range_measurement"
  | "range_measured"
  | "tutorial_completed"
  | "completed";

const TUTORIAL_STAGE_KEY_PREFIX = "koelogs:tutorial_stage:user_";
const TUTORIAL_STAGE_EVENT = "koelogs:tutorial-stage-change";
const VALID_STAGES: TutorialStage[] = [
  "log_welcome",
  "log_beginner_intro",
  "log_beginner_unlocks",
  "log_open_beginner_missions",
  "mypage_intro",
  "mypage_open_mission_modal",
  "mypage_force_click_measurement",
  "log_training_select_range",
  "log_training_press_record",
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
    if (raw === "mypage_measurement") return "training_range_intro";
    return VALID_STAGES.includes(raw as TutorialStage) ? (raw as TutorialStage) : null;
  } catch {
    return null;
  }
}

export function saveTutorialStage(userId: number, stage: TutorialStage): void {
  try {
    window.localStorage.setItem(stageKey(userId), stage);
    window.dispatchEvent(new CustomEvent(TUTORIAL_STAGE_EVENT, { detail: { userId, stage } }));
  } catch {
    // no-op
  }
}

export function resetTutorialStage(userId: number): void {
  try {
    window.localStorage.removeItem(stageKey(userId));
    window.dispatchEvent(new CustomEvent(TUTORIAL_STAGE_EVENT, { detail: { userId, stage: null } }));
  } catch {
    // no-op
  }
}

export function subscribeTutorialStage(
  userId: number,
  callback: (stage: TutorialStage | null) => void
): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ userId?: number; stage?: TutorialStage | null }>).detail;
    if (detail?.userId !== userId) return;
    callback(detail.stage ?? null);
  };
  window.addEventListener(TUTORIAL_STAGE_EVENT, handler);
  return () => window.removeEventListener(TUTORIAL_STAGE_EVENT, handler);
}
