class RenameModelNameInAiTokenUsages < ActiveRecord::Migration[8.1]
  def change
    rename_column :ai_token_usages, :model_name, :llm_model_name
  end
end
