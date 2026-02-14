class CreateAiRecommendations < ActiveRecord::Migration[7.1]
  def change
    create_table :ai_recommendations do |t|
      t.references :user, null: false, foreign_key: true
      t.date :generated_for_date, null: false
      t.integer :range_days, null: false, default: 7
      t.text :recommendation_text, null: false
      t.timestamps
    end

    add_index :ai_recommendations, [ :user_id, :generated_for_date ], unique: true
  end
end
