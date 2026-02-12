class CreateTrainingLogs < ActiveRecord::Migration[7.1]
  def change
    create_table :training_logs do |t|
      t.date :practiced_on, null: false
      t.integer :duration_min
      t.text :menus
      t.text :notes
      t.string :falsetto_top_note
      t.string :chest_top_note

      t.timestamps
    end

    add_index :training_logs, :practiced_on, unique: true
  end
end
