class AddEmailVerificationFieldsToUsers < ActiveRecord::Migration[8.0]
  def up
    add_column :users, :email_verified_at, :datetime
    add_column :users, :email_verification_token_digest, :string
    add_column :users, :email_verification_sent_at, :datetime

    add_index :users, :email_verification_token_digest, unique: true
    add_index :users, :email_verified_at

    execute <<~SQL.squish
      UPDATE users
      SET email_verified_at = CURRENT_TIMESTAMP
      WHERE email_verified_at IS NULL
    SQL
  end

  def down
    remove_index :users, :email_verified_at
    remove_index :users, :email_verification_token_digest
    remove_column :users, :email_verification_sent_at
    remove_column :users, :email_verification_token_digest
    remove_column :users, :email_verified_at
  end
end
