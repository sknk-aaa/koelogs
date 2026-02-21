class CreateMeasurementRunsAndResults < ActiveRecord::Migration[8.0]
  def change
    create_table :measurement_runs do |t|
      t.references :user, null: false, foreign_key: true
      t.string :measurement_type, null: false
      t.datetime :recorded_at, null: false

      t.timestamps
    end

    add_index :measurement_runs, [ :user_id, :measurement_type, :recorded_at ], name: "idx_measurement_runs_user_type_recorded"

    create_table :measurement_range_results do |t|
      t.references :measurement_run, null: false, foreign_key: true, index: { unique: true }

      t.string :lowest_note
      t.string :highest_note
      t.integer :range_semitones
      t.decimal :range_octaves, precision: 6, scale: 2

      t.string :chest_lowest_note
      t.string :chest_highest_note
      t.string :falsetto_lowest_note
      t.string :falsetto_highest_note

      t.timestamps
    end

    create_table :measurement_long_tone_results do |t|
      t.references :measurement_run, null: false, foreign_key: true, index: { unique: true }

      t.decimal :sustain_sec, precision: 8, scale: 2, null: false
      t.string :sustain_note

      t.timestamps
    end

    create_table :measurement_volume_stability_results do |t|
      t.references :measurement_run, null: false, foreign_key: true, index: { unique: true }

      t.decimal :avg_loudness_db, precision: 8, scale: 3
      t.decimal :min_loudness_db, precision: 8, scale: 3
      t.decimal :max_loudness_db, precision: 8, scale: 3
      t.decimal :loudness_range_db, precision: 8, scale: 3
      t.decimal :loudness_range_ratio, precision: 10, scale: 6
      t.decimal :loudness_range_pct, precision: 8, scale: 3

      t.timestamps
    end
  end
end
