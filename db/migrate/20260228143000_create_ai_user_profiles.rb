class CreateAiUserProfiles < ActiveRecord::Migration[8.1]
  def change
    create_table :ai_user_profiles do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.jsonb :auto_profile, null: false, default: {}
      t.jsonb :user_overrides, null: false, default: {}
      t.jsonb :source_meta, null: false, default: {}
      t.string :source_fingerprint
      t.integer :source_window_days, null: false, default: 90
      t.datetime :computed_at
      t.datetime :overrides_updated_at
      t.text :last_error
      t.timestamps
    end
  end
end
