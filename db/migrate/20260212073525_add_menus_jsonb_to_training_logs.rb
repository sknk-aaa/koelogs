class AddMenusJsonbToTrainingLogs < ActiveRecord::Migration[7.1]
  def change
    add_column :training_logs, :menus_jsonb, :jsonb, null: false, default: []
    add_index :training_logs, :menus_jsonb, using: :gin
  end
end
