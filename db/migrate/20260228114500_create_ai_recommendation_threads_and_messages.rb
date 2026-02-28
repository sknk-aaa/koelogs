class CreateAiRecommendationThreadsAndMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :ai_recommendation_threads do |t|
      t.references :user, null: false, foreign_key: true
      t.references :ai_recommendation, null: false, foreign_key: true, index: { unique: true }
      t.date :generated_for_date, null: false
      t.jsonb :context_snapshot, null: false, default: {}
      t.text :seed_recommendation_text, null: false
      t.string :model_name, null: false, default: "gemini-2.5-flash"
      t.string :system_prompt_version, null: false, default: "followup-v1"
      t.string :user_prompt_version, null: false, default: "followup-v1"

      t.timestamps
    end

    add_index :ai_recommendation_threads, [ :user_id, :generated_for_date ], name: "index_ai_reco_threads_on_user_and_date"

    create_table :ai_recommendation_messages do |t|
      t.references :ai_recommendation_thread, null: false, foreign_key: true, index: { name: "index_ai_reco_msgs_on_thread_id" }
      t.string :role, null: false
      t.text :content, null: false

      t.timestamps
    end

    add_index :ai_recommendation_messages,
              [ :ai_recommendation_thread_id, :created_at ],
              name: "index_ai_reco_msgs_on_thread_and_created"
  end
end
