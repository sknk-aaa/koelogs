class CreateAiTokenUsages < ActiveRecord::Migration[8.1]
  def change
    create_table :ai_token_usages do |t|
      t.references :user, null: false, foreign_key: true
      t.string :feature, null: false
      t.integer :input_tokens, null: false, default: 0
      t.integer :output_tokens, null: false, default: 0
      t.integer :total_tokens, null: false, default: 0
      t.date :year_month, null: false
      t.datetime :used_at, null: false
      t.string :model_name

      t.timestamps
    end

    add_index :ai_token_usages, [ :user_id, :year_month ]
    add_index :ai_token_usages, [ :user_id, :feature, :year_month ], name: "index_ai_token_usages_on_user_feature_month"
    add_index :ai_token_usages, :used_at
  end
end
