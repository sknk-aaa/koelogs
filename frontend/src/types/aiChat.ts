export type AiChatProject = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

export type AiChatThread = {
  id: number;
  project_id: number | null;
  project_name: string | null;
  title: string;
  model_name: string;
  system_prompt_version: string;
  user_prompt_version: string;
  source_kind: "ai_recommendation" | null;
  source_date: string | null;
  last_message_at: string;
  created_at: string;
};

export type AiChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};
