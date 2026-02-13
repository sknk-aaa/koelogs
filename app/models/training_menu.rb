# app/models/training_menu.rb
class TrainingMenu < ApplicationRecord
  belongs_to :user

  scope :active, -> { where(archived: false) }

  before_validation :normalize_name

  validates :name, presence: true
  validates :name,
            uniqueness: { scope: :user_id, case_sensitive: false }

  private

  def normalize_name
    self.name = name.to_s.strip
  end
end
