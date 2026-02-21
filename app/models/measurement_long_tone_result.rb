class MeasurementLongToneResult < ApplicationRecord
  NOTE_FORMAT = /\A[A-G](?:#|b)?[0-9]\z/

  belongs_to :measurement_run, inverse_of: :long_tone_result

  validates :measurement_run_id, uniqueness: true
  validates :sustain_sec, numericality: { greater_than_or_equal_to: 0 }
  validates :sustain_note, format: { with: NOTE_FORMAT }, allow_nil: true
end
