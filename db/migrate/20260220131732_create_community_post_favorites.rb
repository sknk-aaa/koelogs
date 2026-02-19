class CreateCommunityPostFavorites < ActiveRecord::Migration[8.1]
  def change
    create_table :community_post_favorites do |t|
      t.references :user, null: false, foreign_key: true
      t.references :community_post, null: false, foreign_key: true
      t.timestamps
    end

    add_index :community_post_favorites, [ :user_id, :community_post_id ], unique: true, name: "idx_community_post_favorites_unique"
    add_index :community_post_favorites, [ :community_post_id, :created_at ]
  end
end
