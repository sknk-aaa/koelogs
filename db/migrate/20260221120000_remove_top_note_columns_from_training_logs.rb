class RemoveTopNoteColumnsFromTrainingLogs < ActiveRecord::Migration[7.1]
  def change
    remove_column :training_logs, :falsetto_top_note, :string
    remove_column :training_logs, :chest_top_note, :string
  end
end
