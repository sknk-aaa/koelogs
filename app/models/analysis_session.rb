class AnalysisSession < ApplicationRecord
  NOTE_FORMAT = /\A[A-G](?:#|b)?[0-9]\z/

  MEASUREMENT_KINDS = %w[
    falsetto_peak
    chest_peak
    range
    long_tone
    pitch_accuracy
    volume_stability
    generic
  ].freeze

  belongs_to :user
  belongs_to :analysis_menu

  before_destroy :remove_audio_file

  validates :duration_sec, numericality: { greater_than_or_equal_to: 0 }
  validates :pitch_stability_score, :voice_consistency_score, :range_semitones,
            numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 },
            allow_nil: true
  validates :measurement_kind, presence: true
  validates :measurement_kind, inclusion: { in: MEASUREMENT_KINDS }
  validates :peak_note, :lowest_note, format: { with: NOTE_FORMAT }, allow_nil: true
  validate :required_fields_for_measurement_kind

  def audio_url
    return nil if audio_path.blank?
    return audio_path if audio_path.start_with?("/")

    "/#{audio_path}"
  end

  private

  def required_fields_for_measurement_kind
    case measurement_kind
    when "falsetto_peak", "chest_peak"
      errors.add(:peak_note, "is required") if peak_note.blank?
    when "range"
      errors.add(:peak_note, "is required") if peak_note.blank?
      errors.add(:lowest_note, "is required") if lowest_note.blank?
    when "long_tone"
      errors.add(:duration_sec, "must be greater than 0") unless duration_sec.to_i > 0
    when "pitch_accuracy"
      errors.add(:raw_metrics, "pitch_accuracy_cents_mean is required") if raw_metric_number("pitch_accuracy_cents_mean").nil?
    when "volume_stability"
      errors.add(:raw_metrics, "volume_stability_rms_stddev is required") if raw_metric_number("volume_stability_rms_stddev").nil?
    end
  end

  def raw_metric_number(key)
    value =
      if raw_metrics.is_a?(Hash)
        raw_metrics[key] || raw_metrics[key.to_sym]
      else
        nil
      end
    Float(value)
  rescue ArgumentError, TypeError
    nil
  end

  def remove_audio_file
    return if audio_path.blank?
    return if audio_path.start_with?("http://", "https://")

    absolute = Rails.root.join("public", audio_path.sub(%r{\A/}, ""))
    File.delete(absolute) if File.exist?(absolute)
  rescue => e
    Rails.logger.warn("[AnalysisSession] failed to delete audio file: #{e.class}: #{e.message}")
  end
end
