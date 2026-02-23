class MakeMeasurementKindNotNullOnAnalysisSessions < ActiveRecord::Migration[7.1]
  def up
    execute <<~SQL
      UPDATE analysis_sessions
      SET measurement_kind = COALESCE(NULLIF(btrim(measurement_kind), ''), 'generic')
      WHERE measurement_kind IS NULL OR btrim(measurement_kind) = ''
    SQL

    change_column_null :analysis_sessions, :measurement_kind, false
  end

  def down
    change_column_null :analysis_sessions, :measurement_kind, true
  end
end
