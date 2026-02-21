class CreateMonthlyLogs < ActiveRecord::Migration[8.0]
  def change
    create_table :monthly_logs do |t|
      t.references :user, null: false, foreign_key: true
      t.date :month_start, null: false
      t.text :notes

      t.timestamps
    end

    add_index :monthly_logs, [ :user_id, :month_start ], unique: true
  end
end
