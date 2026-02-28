class UpdateAiRecommendationsUniqueIndexForRangeDays < ActiveRecord::Migration[8.1]
  def up
    remove_index :ai_recommendations, name: "index_ai_recommendations_on_user_id_and_generated_for_date"
    add_index :ai_recommendations, [ :user_id, :generated_for_date, :range_days ],
              unique: true,
              name: "index_ai_recommendations_on_user_id_date_range_days"
  end

  def down
    remove_index :ai_recommendations, name: "index_ai_recommendations_on_user_id_date_range_days"
    add_index :ai_recommendations, [ :user_id, :generated_for_date ],
              unique: true,
              name: "index_ai_recommendations_on_user_id_and_generated_for_date"
  end
end
