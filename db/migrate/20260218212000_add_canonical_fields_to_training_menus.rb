class AddCanonicalFieldsToTrainingMenus < ActiveRecord::Migration[8.0]
  def change
    add_column :training_menus, :canonical_core_key, :string, null: false, default: "unknown"
    add_column :training_menus, :canonical_register, :string, null: false, default: "unspecified"
    add_column :training_menus, :canonical_key, :string, null: false, default: "unknown|unspecified"
    add_column :training_menus, :canonical_confidence, :decimal, precision: 4, scale: 3, null: false, default: 0.0
    add_column :training_menus, :canonical_source, :string, null: false, default: "rule"
    add_column :training_menus, :canonical_version, :integer, null: false, default: 1

    add_index :training_menus, :canonical_key
    add_index :training_menus, [ :user_id, :canonical_key ]
  end
end
