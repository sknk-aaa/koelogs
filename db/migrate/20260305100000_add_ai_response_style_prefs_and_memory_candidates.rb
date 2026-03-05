class AddAiResponseStylePrefsAndMemoryCandidates < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :ai_response_style_prefs, :jsonb, null: false, default: {}

    create_table :ai_profile_memory_candidates do |t|
      t.references :user, null: false, foreign_key: true
      t.string :source_kind, null: false, default: "ai_chat"
      t.bigint :source_thread_id
      t.bigint :source_message_id
      t.text :source_text, null: false
      t.text :candidate_text, null: false
      t.string :suggested_destination, null: false
      t.string :status, null: false, default: "pending"
      t.datetime :expires_at, null: false
      t.datetime :resolved_at
      t.string :resolved_destination

      t.timestamps
    end

    add_index :ai_profile_memory_candidates, [ :user_id, :status, :expires_at ], name: "idx_ai_memory_candidates_user_status_expires"
    add_index :ai_profile_memory_candidates, [ :user_id, :created_at ], name: "idx_ai_memory_candidates_user_created"
  end
end
