class CreateMenuAliases < ActiveRecord::Migration[8.0]
  def change
    create_table :menu_aliases do |t|
      t.string :normalized_name, null: false
      t.string :canonical_key, null: false
      t.decimal :confidence, precision: 4, scale: 3, null: false, default: 0.0
      t.string :source, null: false, default: "rule"
      t.datetime :first_seen_at, null: false
      t.datetime :last_seen_at, null: false

      t.timestamps
    end

    add_index :menu_aliases, :normalized_name, unique: true
    add_index :menu_aliases, :canonical_key
  end
end
