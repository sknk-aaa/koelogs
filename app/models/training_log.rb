class TrainingLog < ApplicationRecord
  validates :practiced_on, presence: true, uniqueness: true
end
