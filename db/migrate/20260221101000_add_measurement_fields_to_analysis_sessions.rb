class AddMeasurementFieldsToAnalysisSessions < ActiveRecord::Migration[8.0]
  def change
    add_column :analysis_sessions, :measurement_kind, :string
    add_column :analysis_sessions, :lowest_note, :string
    add_index :analysis_sessions, [ :user_id, :measurement_kind, :created_at ], name: "idx_analysis_sessions_measurement_kind"
  end
end
