class MeasurementRangeResult < ApplicationRecord
  NOTE_FORMAT = /\A[A-G](?:#|b)?[0-9]\z/

  belongs_to :measurement_run, inverse_of: :range_result

  validates :measurement_run_id, uniqueness: true
  validates :lowest_note, :highest_note, format: { with: NOTE_FORMAT }, allow_nil: true
  validates :range_semitones, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :range_octaves, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
end
