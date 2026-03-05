# frozen_string_literal: true

class AiChatProject < ApplicationRecord
  belongs_to :user
  has_many :threads,
           class_name: "AiChatThread",
           inverse_of: :project,
           dependent: :nullify,
           foreign_key: :ai_chat_project_id

  validates :name, presence: true, length: { maximum: 80 }
end
