class AddIncludeInInsightsToMeasurementRuns < ActiveRecord::Migration[8.0]
  def change
    add_column :measurement_runs, :include_in_insights, :boolean, null: false, default: true
    add_index :measurement_runs, [ :user_id, :include_in_insights, :measurement_type, :recorded_at ], name: "idx_measurement_runs_insights_filter"
  end
end
