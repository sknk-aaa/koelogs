class AddCompareFlagsToAnalysisMenus < ActiveRecord::Migration[7.1]
  def change
    add_column :analysis_menus, :compare_by_scale, :boolean, null: false, default: false
    add_column :analysis_menus, :compare_by_tempo, :boolean, null: false, default: false
  end
end
