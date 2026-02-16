class AddGoalTextToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :goal_text, :string, limit: 50, null: true
  end
end
