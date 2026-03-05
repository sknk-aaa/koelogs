class RenameModelNameInAiRecommendationThreads < ActiveRecord::Migration[8.1]
  def change
    rename_column :ai_recommendation_threads, :model_name, :llm_model_name
  end
end
