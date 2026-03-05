class CreateAiChatProjectsThreadsMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :ai_chat_projects do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.boolean :archived, null: false, default: false

      t.timestamps
    end

    add_index :ai_chat_projects, [ :user_id, :name ]

    create_table :ai_chat_threads do |t|
      t.references :user, null: false, foreign_key: true
      t.references :ai_chat_project, null: true, foreign_key: true
      t.string :title, null: false
      t.string :llm_model_name, null: false
      t.string :system_prompt_version, null: false
      t.string :user_prompt_version, null: false
      t.datetime :last_message_at, null: false

      t.timestamps
    end

    add_index :ai_chat_threads, [ :user_id, :last_message_at ]
    add_index :ai_chat_threads, [ :ai_chat_project_id, :last_message_at ], name: "index_ai_chat_threads_on_project_and_last_message"

    create_table :ai_chat_messages do |t|
      t.references :ai_chat_thread, null: false, foreign_key: true
      t.string :role, null: false
      t.text :content, null: false

      t.timestamps
    end

    add_index :ai_chat_messages,
              [ :ai_chat_thread_id, :created_at ],
              name: "index_ai_chat_messages_on_thread_and_created"
  end
end
