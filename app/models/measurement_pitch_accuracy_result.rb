class MeasurementPitchAccuracyResult < ApplicationRecord
  belongs_to :measurement_run, inverse_of: :pitch_accuracy_result

  validates :measurement_run_id, uniqueness: true
  validates :avg_cents_error, :accuracy_score, numericality: true, allow_nil: true
  validates :note_count, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true
end
