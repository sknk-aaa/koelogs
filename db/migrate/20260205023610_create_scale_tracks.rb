class CreateScaleTracks < ActiveRecord::Migration[8.0]
  def change
    create_table :scale_tracks do |t|
      t.string :scale_type
      t.string :key
      t.integer :tempo
      t.string :file_path
      t.integer :duration_sec

      t.timestamps
    end
  end
end
