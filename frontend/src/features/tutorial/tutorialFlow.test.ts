import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadTutorialStage,
  resetTutorialStage,
  saveTutorialStage,
  subscribeTutorialStage,
  type TutorialStage,
} from "./tutorialFlow";

describe("tutorialFlow", () => {
  const userId = 42;

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("saves and loads a tutorial stage", () => {
    saveTutorialStage(userId, "log_beginner_intro");

    expect(loadTutorialStage(userId)).toBe("log_beginner_intro");
  });

  it("maps legacy stage values to the current stage", () => {
    window.localStorage.setItem("koelogs:tutorial_stage:user_42", "mypage_measurement");

    expect(loadTutorialStage(userId)).toBe("training_range_intro");
  });

  it("notifies subscribers when the stage changes and resets", () => {
    const callback = vi.fn<(stage: TutorialStage | null) => void>();
    const unsubscribe = subscribeTutorialStage(userId, callback);

    saveTutorialStage(userId, "log_open_beginner_missions");
    resetTutorialStage(userId);
    unsubscribe();

    expect(callback).toHaveBeenNthCalledWith(1, "log_open_beginner_missions");
    expect(callback).toHaveBeenNthCalledWith(2, null);
  });
});
