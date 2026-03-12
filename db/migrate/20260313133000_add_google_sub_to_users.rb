class AddGoogleSubToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :google_sub, :string
    add_index :users, :google_sub, unique: true
  end
end
