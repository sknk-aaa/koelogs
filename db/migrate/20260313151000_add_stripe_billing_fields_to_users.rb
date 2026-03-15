# frozen_string_literal: true

class AddStripeBillingFieldsToUsers < ActiveRecord::Migration[8.1]
  def up
    add_column :users, :stripe_customer_id, :string
    add_column :users, :stripe_subscription_id, :string
    add_column :users, :stripe_subscription_status, :string
    add_column :users, :stripe_current_period_end, :datetime
    add_column :users, :stripe_cancel_at_period_end, :boolean, null: false, default: false

    add_index :users, :stripe_customer_id, unique: true
    add_index :users, :stripe_subscription_id, unique: true

    execute <<~SQL.squish
      UPDATE users
      SET billing_cycle = 'quarterly'
      WHERE billing_cycle = 'yearly'
    SQL
  end

  def down
    remove_index :users, :stripe_subscription_id
    remove_index :users, :stripe_customer_id

    remove_column :users, :stripe_cancel_at_period_end
    remove_column :users, :stripe_current_period_end
    remove_column :users, :stripe_subscription_status
    remove_column :users, :stripe_subscription_id
    remove_column :users, :stripe_customer_id

    execute <<~SQL.squish
      UPDATE users
      SET billing_cycle = 'yearly'
      WHERE billing_cycle = 'quarterly'
    SQL
  end
end
