class CreateMeasurementPitchAccuracyResults < ActiveRecord::Migration[8.0]
  def change
    create_table :measurement_pitch_accuracy_results do |t|
      t.references :measurement_run, null: false, foreign_key: true, index: { unique: true }

      t.decimal :avg_cents_error, precision: 8, scale: 3
      t.decimal :accuracy_score, precision: 8, scale: 3
      t.integer :note_count

      t.timestamps
    end
  end
end
