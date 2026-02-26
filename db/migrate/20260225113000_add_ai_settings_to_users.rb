class AddAiSettingsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :ai_custom_instructions, :text
    add_column :users, :ai_improvement_tags, :jsonb, null: false, default: []
  end
end
