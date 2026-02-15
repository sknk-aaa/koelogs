# app/models/training_menu.rb
class TrainingMenu < ApplicationRecord
  belongs_to :user

  has_many :training_log_menus, dependent: :delete_all
  has_many :training_logs, through: :training_log_menus

  scope :active, -> { where(archived: false) }

  HEX_COLOR_REGEX = /\A#[0-9A-F]{6}\z/

  before_validation :normalize_name
  before_validation :normalize_color

  validates :name, presence: true
  validates :name, uniqueness: { scope: :user_id, case_sensitive: false }
  validates :color, presence: true
  validates :color, format: { with: HEX_COLOR_REGEX, message: "must be HEX like #A1B2C3" }

  private

  def normalize_name
    self.name = name.to_s.strip
  end

  def normalize_color
    self.color = color.to_s.strip.upcase
  end
end
