# frozen_string_literal: true

class AddSourceToAiChatThreads < ActiveRecord::Migration[8.1]
  def up
    add_column :ai_chat_threads, :source_kind, :string
    add_column :ai_chat_threads, :source_date, :date

    add_index :ai_chat_threads, [ :user_id, :source_kind, :source_date ],
              unique: true,
              where: "source_kind = 'ai_recommendation' AND source_date IS NOT NULL",
              name: "index_ai_chat_threads_on_user_ai_reco_source"

    execute <<~SQL
      UPDATE ai_chat_threads
      SET source_kind = 'ai_recommendation',
          source_date = SUBSTRING(title FROM '^(\\d{4}-\\d{2}-\\d{2})')::date
      WHERE title ~ '^\\d{4}-\\d{2}-\\d{2} のおすすめに質問$'
    SQL
  end

  def down
    remove_index :ai_chat_threads, name: "index_ai_chat_threads_on_user_ai_reco_source"
    remove_column :ai_chat_threads, :source_date
    remove_column :ai_chat_threads, :source_kind
  end
end
