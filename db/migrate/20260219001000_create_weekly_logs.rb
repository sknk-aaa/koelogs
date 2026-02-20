class CreateWeeklyLogs < ActiveRecord::Migration[8.1]
  def change
    create_table :weekly_logs do |t|
      t.references :user, null: false, foreign_key: true
      t.date :week_start, null: false
      t.text :notes
      t.string :falsetto_top_note
      t.string :chest_top_note
      t.jsonb :effect_feedbacks, null: false, default: []

      t.timestamps
    end

    add_index :weekly_logs, [ :user_id, :week_start ], unique: true
  end
end
