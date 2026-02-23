class AddRegisterTopNotesToMeasurementRangeResults < ActiveRecord::Migration[7.1]
  def change
    add_column :measurement_range_results, :chest_top_note, :string
    add_column :measurement_range_results, :falsetto_top_note, :string
  end
end
