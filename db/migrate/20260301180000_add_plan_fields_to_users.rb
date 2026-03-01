# frozen_string_literal: true

class AddPlanFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :plan_tier, :string, null: false, default: "free"
    add_column :users, :billing_cycle, :string

    add_index :users, :plan_tier
  end
end
