class BackfillCommunityPublicProfileObjects < ActiveRecord::Migration[8.1]
  def change
    unless column_exists?(:users, :public_profile_enabled)
      add_column :users, :public_profile_enabled, :boolean, null: false, default: false
    end
    unless column_exists?(:users, :public_goal_enabled)
      add_column :users, :public_goal_enabled, :boolean, null: false, default: false
    end

    return if table_exists?(:community_posts) && table_exists?(:ai_contribution_events)

    unless table_exists?(:community_posts)
      create_table :community_posts do |t|
        t.references :user, null: false, foreign_key: true
        t.references :training_menu, null: false, foreign_key: true
        t.string :canonical_key, null: false
        t.jsonb :improvement_tags, null: false, default: []
        t.integer :effect_level, null: false
        t.text :comment
        t.boolean :published, null: false, default: true
        t.date :practiced_on
        t.timestamps
      end

      add_index :community_posts, [ :published, :created_at ] unless index_exists?(:community_posts, [ :published, :created_at ])
      add_index :community_posts, [ :canonical_key, :created_at ] unless index_exists?(:community_posts, [ :canonical_key, :created_at ])
      add_index :community_posts, [ :user_id, :created_at ] unless index_exists?(:community_posts, [ :user_id, :created_at ])
    end

    unless table_exists?(:ai_contribution_events)
      create_table :ai_contribution_events do |t|
        t.references :user, null: false, foreign_key: true
        t.references :ai_recommendation, null: false, foreign_key: true
        t.string :canonical_key
        t.jsonb :improvement_tags, null: false, default: []
        t.timestamps
      end

      add_index :ai_contribution_events, [ :user_id, :ai_recommendation_id ], unique: true, name: "idx_ai_contrib_unique_user_recommendation" unless index_exists?(:ai_contribution_events, [ :user_id, :ai_recommendation_id ], unique: true, name: "idx_ai_contrib_unique_user_recommendation")
      add_index :ai_contribution_events, [ :ai_recommendation_id ] unless index_exists?(:ai_contribution_events, [ :ai_recommendation_id ])
    end
  end
end
