class AddCompareSettingsToAnalysisMenusAndSessions < ActiveRecord::Migration[7.1]
  def change
    add_column :analysis_menus, :compare_mode, :string, null: false, default: "flexible"
    add_column :analysis_menus, :fixed_scale_type, :string
    add_column :analysis_menus, :fixed_tempo, :integer

    add_column :analysis_sessions, :recorded_scale_type, :string
    add_column :analysis_sessions, :recorded_tempo, :integer
    add_index :analysis_sessions, [ :analysis_menu_id, :recorded_scale_type, :recorded_tempo, :created_at ],
              name: "idx_analysis_sessions_compare_key"
  end
end
