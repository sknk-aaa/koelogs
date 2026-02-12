class SwapMenusToJsonbInTrainingLogs < ActiveRecord::Migration[7.1]
  def change
    remove_column :training_logs, :menus, :text
    rename_column :training_logs, :menus_jsonb, :menus
  end
end
