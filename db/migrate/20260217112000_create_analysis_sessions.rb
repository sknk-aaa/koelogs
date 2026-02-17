class CreateAnalysisSessions < ActiveRecord::Migration[7.1]
  def change
    create_table :analysis_sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.references :analysis_menu, null: false, foreign_key: true
      t.integer :duration_sec, null: false, default: 0
      t.string :peak_note
      t.integer :pitch_stability_score
      t.integer :voice_consistency_score
      t.integer :range_semitones
      t.jsonb :raw_metrics, null: false, default: {}
      t.timestamps
    end

    add_index :analysis_sessions, [ :user_id, :analysis_menu_id, :created_at ]
  end
end
