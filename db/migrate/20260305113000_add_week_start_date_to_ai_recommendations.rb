# frozen_string_literal: true

class AddWeekStartDateToAiRecommendations < ActiveRecord::Migration[8.1]
  def up
    add_column :ai_recommendations, :week_start_date, :date

    execute <<~SQL
      UPDATE ai_recommendations
      SET week_start_date = (generated_for_date - ((EXTRACT(DOW FROM generated_for_date)::int + 6) % 7))
      WHERE generated_for_date IS NOT NULL
    SQL

    change_column_null :ai_recommendations, :week_start_date, false

    add_index :ai_recommendations,
              [ :user_id, :week_start_date, :range_days, :generated_for_date ],
              name: "index_ai_recommendations_on_user_week_range_and_generated_on"
  end

  def down
    remove_index :ai_recommendations, name: "index_ai_recommendations_on_user_week_range_and_generated_on"
    remove_column :ai_recommendations, :week_start_date
  end
end
