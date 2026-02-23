class MeasurementVolumeStabilityResult < ApplicationRecord
  belongs_to :measurement_run, inverse_of: :volume_stability_result

  validates :measurement_run_id, uniqueness: true
  validates :avg_loudness_db, :min_loudness_db, :max_loudness_db,
            :loudness_range_db, :loudness_range_ratio, :loudness_range_pct,
            numericality: true,
            allow_nil: true
  validates :loudness_range_pct,
            numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 },
            allow_nil: true
  validates :loudness_range_ratio,
            numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 1 },
            allow_nil: true
end
