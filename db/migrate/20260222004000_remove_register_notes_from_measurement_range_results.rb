class RemoveRegisterNotesFromMeasurementRangeResults < ActiveRecord::Migration[8.0]
  def change
    remove_column :measurement_range_results, :chest_lowest_note, :string
    remove_column :measurement_range_results, :chest_highest_note, :string
    remove_column :measurement_range_results, :falsetto_lowest_note, :string
    remove_column :measurement_range_results, :falsetto_highest_note, :string
  end
end
