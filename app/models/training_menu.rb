# app/models/training_menu.rb
class TrainingMenu < ApplicationRecord
  belongs_to :user

  has_many :training_log_menus, dependent: :delete_all
  has_many :training_logs, through: :training_log_menus
  has_many :community_posts, dependent: :delete_all

  scope :active, -> { where(archived: false) }

  HEX_COLOR_REGEX = /\A#[0-9A-F]{6}\z/
  REGISTER_VALUES = %w[falsetto chest mixed unspecified].freeze
  SOURCE_VALUES = %w[rule ai manual].freeze

  before_validation :normalize_name
  before_validation :normalize_color

  validates :name, presence: true
  validates :name, uniqueness: { scope: :user_id, case_sensitive: false }
  validates :color, presence: true
  validates :color, format: { with: HEX_COLOR_REGEX, message: "must be HEX like #A1B2C3" }
  validates :canonical_core_key, presence: true
  validates :canonical_register, inclusion: { in: REGISTER_VALUES }
  validates :canonical_key, presence: true
  validates :canonical_source, inclusion: { in: SOURCE_VALUES }
  validates :canonical_version, numericality: { only_integer: true, greater_than: 0 }
  validates :canonical_confidence, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 1 }

  private

  def normalize_name
    self.name = name.to_s.strip
  end

  def normalize_color
    self.color = color.to_s.strip.upcase
  end
end
