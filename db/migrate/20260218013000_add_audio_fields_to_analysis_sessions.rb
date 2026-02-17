class AddAudioFieldsToAnalysisSessions < ActiveRecord::Migration[8.1]
  def change
    add_column :analysis_sessions, :audio_path, :string
    add_column :analysis_sessions, :audio_content_type, :string
    add_column :analysis_sessions, :audio_byte_size, :integer
  end
end
