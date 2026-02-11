class ScaleTrack < ApplicationRecord
    validates :scale_type, presence: true
    validates :tempo, presence: true, numericality: { only_integer: true, greater_than: 0 }
    validates :file_path, presence: true
end
