// frontend/src/types/trainingLog.ts

export type TrainingLogMenuItem = {
  id: number;
  name: string;
  color?: string | null; // HEX "#RRGGBB"（欠けても落ちない）
  archived?: boolean;    // 欠けても落ちない
};

export type TrainingLog = {
  id: number;
  practiced_on: string; // YYYY-MM-DD
  duration_min: number | null;

  // ✅ menu_id設計：ログに紐づくメニュー（表示用に name/color も含めて返す）
  menus?: TrainingLogMenuItem[];

  // ✅ フロントのフォーム状態用（APIレスポンスに無くてもOK）
  menu_ids?: number[];

  notes: string | null;
  updated_at?: string | null;
};

export type TrainingLogResponse =
  | { data: TrainingLog | null; error?: undefined }
  | { data: null; error: string };

export type TrainingLogMonthResponse =
  | { data: TrainingLog[]; error?: undefined }
  | { data: null; error: string };
