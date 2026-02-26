class AddRangeTypeToScaleTracks < ActiveRecord::Migration[8.1]
  def change
    add_column :scale_tracks, :range_type, :string, null: false, default: "mid"
    add_index :scale_tracks, [ :scale_type, :range_type ], name: "index_scale_tracks_on_scale_type_and_range_type"
  end
end
