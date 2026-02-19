class CreateXpEventsAndUserBadges < ActiveRecord::Migration[8.1]
  def change
    create_table :xp_events do |t|
      t.references :user, null: false, foreign_key: true
      t.string :rule_key, null: false
      t.string :source_type, null: false
      t.bigint :source_id, null: false
      t.integer :points, null: false
      t.timestamps
    end

    add_index :xp_events, [ :user_id, :rule_key, :source_type, :source_id ], unique: true, name: "idx_xp_events_unique_source"
    add_index :xp_events, [ :user_id, :created_at ]

    create_table :user_badges do |t|
      t.references :user, null: false, foreign_key: true
      t.string :badge_key, null: false
      t.datetime :unlocked_at, null: false
      t.timestamps
    end

    add_index :user_badges, [ :user_id, :badge_key ], unique: true
    add_index :user_badges, [ :user_id, :unlocked_at ]
  end
end
