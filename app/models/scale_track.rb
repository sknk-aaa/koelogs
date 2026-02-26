class ScaleTrack < ApplicationRecord
  RANGE_TYPES = %w[low mid high].freeze

  validates :scale_type, presence: true
  validates :range_type, presence: true, inclusion: { in: RANGE_TYPES }
  validates :tempo, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :file_path, presence: true
end
