import type { BadgeProgress } from "./gamification";

export type MissionItem = {
  key: string;
  title: string;
  description: string;
  to: string;
  done: boolean;
};

export type MissionsResponseData = {
  server_today: string;
  beginner: MissionItem[];
  daily: MissionItem[];
  continuous: BadgeProgress[];
};
