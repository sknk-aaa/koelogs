class AddGenerationContextToAiRecommendations < ActiveRecord::Migration[8.1]
  def change
    add_column :ai_recommendations, :generation_context, :jsonb, null: false, default: {}
    add_column :ai_recommendations, :generator_model_name, :string, null: false, default: "gemini-2.5-flash"
    add_column :ai_recommendations, :generator_prompt_version, :string, null: false, default: "recommendation-v1"
  end
end
