# app/models/training_log_menu.rb
class TrainingLogMenu < ApplicationRecord
  self.table_name = "training_log_menus"

  belongs_to :user
  belongs_to :training_log
  belongs_to :training_menu

  validates :training_log_id, uniqueness: { scope: :training_menu_id }
  validate :same_user_integrity

  private

  def same_user_integrity
    return if user_id.nil?

    if training_log && training_log.user_id != user_id
      errors.add(:training_log_id, "must belong to the same user")
    end
    if training_menu && training_menu.user_id != user_id
      errors.add(:training_menu_id, "must belong to the same user")
    end
  end
end
