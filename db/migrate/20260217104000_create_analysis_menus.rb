class CreateAnalysisMenus < ActiveRecord::Migration[7.1]
  def change
    create_table :analysis_menus do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.text :focus_points
      t.boolean :archived, null: false, default: false
      t.timestamps
    end

    add_index :analysis_menus, [ :user_id, :name ], unique: true
    add_index :analysis_menus, [ :user_id, :archived ]
  end
end
