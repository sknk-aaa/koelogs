class MeasurementRun < ApplicationRecord
  MEASUREMENT_TYPES = %w[range long_tone volume_stability].freeze

  belongs_to :user

  has_one :range_result,
          class_name: "MeasurementRangeResult",
          dependent: :destroy,
          inverse_of: :measurement_run
  has_one :long_tone_result,
          class_name: "MeasurementLongToneResult",
          dependent: :destroy,
          inverse_of: :measurement_run
  has_one :volume_stability_result,
          class_name: "MeasurementVolumeStabilityResult",
          dependent: :destroy,
          inverse_of: :measurement_run

  validates :measurement_type, presence: true, inclusion: { in: MEASUREMENT_TYPES }
  validates :recorded_at, presence: true

  scope :latest_first, -> { order(recorded_at: :desc, id: :desc) }

  def result
    case measurement_type
    when "range"
      range_result
    when "long_tone"
      long_tone_result
    when "volume_stability"
      volume_stability_result
    else
      nil
    end
  end
end
