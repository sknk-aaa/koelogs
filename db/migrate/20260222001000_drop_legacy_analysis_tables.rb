class DropLegacyAnalysisTables < ActiveRecord::Migration[7.1]
  def up
    drop_table :analysis_sessions, if_exists: true
    drop_table :analysis_menus, if_exists: true
  end

  def down
    raise ActiveRecord::IrreversibleMigration, "legacy analysis tables were removed"
  end
end
