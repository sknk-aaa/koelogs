class AddAvatarImageUrlToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :avatar_image_url, :text
  end
end
