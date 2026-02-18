class CreateTrainingLogFeedbacks < ActiveRecord::Migration[8.0]
  def change
    create_table :training_log_feedbacks do |t|
      t.references :user, null: false, foreign_key: true
      t.references :training_log, null: false, foreign_key: true, index: { unique: true }
      t.jsonb :effective_menu_ids, null: false, default: []
      t.jsonb :improvement_tags, null: false, default: []

      t.timestamps
    end
  end
end
