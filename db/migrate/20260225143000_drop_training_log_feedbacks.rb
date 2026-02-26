class DropTrainingLogFeedbacks < ActiveRecord::Migration[8.1]
  def up
    drop_table :training_log_feedbacks
  end

  def down
    create_table :training_log_feedbacks do |t|
      t.references :user, null: false, foreign_key: true
      t.references :training_log, null: false, foreign_key: true
      t.jsonb :effective_menu_ids, null: false, default: []
      t.jsonb :improvement_tags, null: false, default: []
      t.jsonb :menu_effects, null: false, default: []
      t.timestamps
    end

    add_index :training_log_feedbacks, :training_log_id, unique: true
  end
end
