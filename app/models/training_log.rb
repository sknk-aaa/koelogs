# app/models/training_log.rb
class TrainingLog < ApplicationRecord
  belongs_to :user

  # enabled flags are NOT persisted (virtual)
  attr_accessor :falsetto_enabled, :chest_enabled

  has_many :training_log_menus, -> { order(created_at: :asc) }, dependent: :delete_all
  has_many :training_menus, through: :training_log_menus

  before_validation :normalize_duration
  before_validation :normalize_enabled_flags

  validates :practiced_on, presence: true
  validates :practiced_on, uniqueness: { scope: :user_id }
  validates :duration_min, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true

  NOTE_FORMAT = /\A[A-G](?:#|b)?[0-9]\z/
  validates :falsetto_top_note, format: { with: NOTE_FORMAT }, allow_nil: true
  validates :chest_top_note, format: { with: NOTE_FORMAT }, allow_nil: true
  validate :top_note_required_if_enabled

  private

  def normalize_duration
    self.duration_min = nil if duration_min.is_a?(String) && duration_min.strip == ""
  end

  def normalize_enabled_flags
    self.falsetto_enabled = ActiveModel::Type::Boolean.new.cast(falsetto_enabled)
    self.chest_enabled = ActiveModel::Type::Boolean.new.cast(chest_enabled)
  end

  def top_note_required_if_enabled
    if falsetto_enabled && falsetto_top_note.blank?
      errors.add(:falsetto_top_note, "can't be blank when falsetto_enabled is true")
    end
    if chest_enabled && chest_top_note.blank?
      errors.add(:chest_top_note, "can't be blank when chest_enabled is true")
    end
  end
end
