class AddUserIdToTrainingLogs < ActiveRecord::Migration[7.1]
  def change
    add_reference :training_logs, :user, null: false, foreign_key: true

    # reset直後などで index が無い可能性があるのでガード
    if index_exists?(:training_logs, :practiced_on)
      remove_index :training_logs, :practiced_on
    end

    add_index :training_logs, [ :user_id, :practiced_on ], unique: true
  end
end
