class AddLoginAttemptLockFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :failed_login_attempts, :integer, null: false, default: 0
    add_column :users, :login_locked_until, :datetime
  end
end
