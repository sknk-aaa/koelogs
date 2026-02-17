class AddSelectedMetricsToAnalysisMenus < ActiveRecord::Migration[8.1]
  def change
    add_column :analysis_menus, :selected_metrics, :jsonb, null: false, default: []
    add_index :analysis_menus, :selected_metrics, using: :gin
  end
end
