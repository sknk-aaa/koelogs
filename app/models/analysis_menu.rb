class AnalysisMenu < ApplicationRecord
  METRIC_KEYS = %w[pitch_stability pitch_accuracy volume_stability phonation_duration peak_note avg_loudness].freeze
  DEFAULT_METRIC_KEYS = %w[pitch_stability pitch_accuracy volume_stability].freeze

  belongs_to :user
  has_many :analysis_sessions, dependent: :destroy

  scope :active, -> { where(archived: false) }

  before_validation :normalize_name
  before_validation :normalize_focus_points
  before_validation :normalize_selected_metrics

  validates :name, presence: true
  validates :name, uniqueness: { scope: :user_id, case_sensitive: false }
  validates :focus_points, length: { maximum: 500 }, allow_nil: true
  validates :fixed_tempo, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validate :selected_metrics_must_be_known

  private

  def normalize_name
    self.name = name.to_s.strip
  end

  def normalize_focus_points
    normalized = focus_points.to_s.strip
    self.focus_points = normalized.presence
  end

  def normalize_selected_metrics
    legacy_map = {
      "voice_consistency" => "phonation_duration",
      "range_semitones" => "peak_note"
    }
    list = Array(selected_metrics).map(&:to_s).map(&:strip).reject(&:blank?).map { |v| legacy_map[v] || v }.uniq
    self.selected_metrics = list.presence || DEFAULT_METRIC_KEYS
  end

  def selected_metrics_must_be_known
    unknown = Array(selected_metrics) - METRIC_KEYS
    return if unknown.empty?

    errors.add(:selected_metrics, "contains unknown metrics: #{unknown.join(', ')}")
  end
end
