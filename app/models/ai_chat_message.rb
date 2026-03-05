# frozen_string_literal: true

class AiChatMessage < ApplicationRecord
  ROLES = %w[user assistant].freeze

  belongs_to :thread,
             class_name: "AiChatThread",
             inverse_of: :messages,
             foreign_key: :ai_chat_thread_id

  validates :role, inclusion: { in: ROLES }
  validates :content, presence: true, length: { maximum: 4000 }
end
