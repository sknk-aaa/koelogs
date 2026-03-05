class AddCollectiveSummaryToAiRecommendations < ActiveRecord::Migration[8.1]
  def change
    add_column :ai_recommendations, :collective_summary, :jsonb, null: false, default: {}
  end
end
