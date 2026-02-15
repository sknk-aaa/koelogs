# db/migrate/20260216000000_add_color_to_training_menus.rb
class AddColorToTrainingMenus < ActiveRecord::Migration[7.1]
  DEFAULT_COLOR = "#E0F2FE" # 薄い水色（タグ背景向け）

  def up
    add_column :training_menus, :color, :string, null: true

    # 既存データを確実に埋める
    execute <<~SQL.squish
      UPDATE training_menus
      SET color = '#{DEFAULT_COLOR}'
      WHERE color IS NULL OR color = '';
    SQL

    change_column_null :training_menus, :color, false
    change_column_default :training_menus, :color, DEFAULT_COLOR
  end

  def down
    remove_column :training_menus, :color
  end
end
