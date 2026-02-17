class AnalysisSession < ApplicationRecord
  belongs_to :user
  belongs_to :analysis_menu

  before_destroy :remove_audio_file

  validates :duration_sec, numericality: { greater_than_or_equal_to: 0 }
  validates :pitch_stability_score, :voice_consistency_score, :range_semitones,
            numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 },
            allow_nil: true

  def audio_url
    return nil if audio_path.blank?
    return audio_path if audio_path.start_with?("/")

    "/#{audio_path}"
  end

  private

  def remove_audio_file
    return if audio_path.blank?
    return if audio_path.start_with?("http://", "https://")

    absolute = Rails.root.join("public", audio_path.sub(%r{\A/}, ""))
    File.delete(absolute) if File.exist?(absolute)
  rescue => e
    Rails.logger.warn("[AnalysisSession] failed to delete audio file: #{e.class}: #{e.message}")
  end
end
