class RemoveKeyAndDurationFromScaleTracks < ActiveRecord::Migration[8.0]
  def change
    remove_column :scale_tracks, :key, :string
    remove_column :scale_tracks, :duration_sec, :integer
  end
end
