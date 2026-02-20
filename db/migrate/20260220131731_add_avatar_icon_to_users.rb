class AddAvatarIconToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :avatar_icon, :string, null: false, default: "note_blue"
    add_index :users, :avatar_icon
  end
end
