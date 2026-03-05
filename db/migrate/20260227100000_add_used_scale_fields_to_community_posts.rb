class AddUsedScaleFieldsToCommunityPosts < ActiveRecord::Migration[8.1]
  def change
    add_column :community_posts, :used_scale_type, :string, null: false, default: "other"
    add_column :community_posts, :used_scale_other_text, :string
  end
end
