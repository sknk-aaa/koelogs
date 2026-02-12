class TrainingLog < ApplicationRecord
  belongs_to :user

  validates :practiced_on, presence: true
  validates :practiced_on, uniqueness: { scope: :user_id }
end
